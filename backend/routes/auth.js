const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Client } = require('ldapts');
const authMiddleware = require('../middleware/authMiddleware');
const { getMuhtarlikRole, ROL_SEVIYE } = require('../middleware/muhtarlikAuth');
const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// Mock kullanıcılar — MOCK_AUTH=true iken kullanılır
// ---------------------------------------------------------------------------
const MOCK_USERS = {
  admin: {
    password: 'admin123',
    payload: {
      username: 'admin',
      displayName: 'Admin Kullanıcı',
      role: 'admin',
      groups: ['IT', 'Portal-Admins'],
    },
  },
  testuser: {
    password: 'test123',
    payload: {
      username:    'testuser',
      displayName: 'Test Kullanıcı',
      role:        'manager',
      directorate: 'Bilgi İşlem Dairesi Başkanlığı',
      department:  'Yazılım Müdürlüğü',
      groups:      ['Personel'],
    },
  },
  normaluser: {
    password: 'user123',
    payload: {
      username:    'normaluser',
      displayName: 'Normal Kullanıcı',
      role:        'user',
      directorate: 'İnsan Kaynakları Dairesi',
      department:  'Özlük İşleri Müdürlüğü',
      groups:      ['Personel'],
    },
  },
};

// "CN=Bilgi Islem,OU=Gruplar,DC=muglabb,DC=lcl" → "Bilgi Islem"
function parseCN(dnList) {
  return dnList
    .map((dn) => {
      const m = String(dn).match(/^CN=([^,]+)/i);
      return m ? m[1] : null;
    })
    .filter(Boolean);
}

function getRole(groups) {
  const adminGroup   = process.env.AD_ADMIN_GROUP   || 'Domain Admins';
  const managerGroup = process.env.AD_MANAGER_GROUP || 'int_bislem';
  if (groups.includes(adminGroup))   return 'admin';
  if (groups.includes(managerGroup)) return 'manager';
  return 'user';
}

// AD gruplarından sistemRol çıkar (UserRole tablosu yoksa fallback)
function getADSistemRol(groups = []) {
  // Sadece kesin bilinen portal grup adlarıyla eşleştir — substring match kullanma
  if (groups.some(g => ['portal-admin', 'IT-Admin', 'Domain Admins'].includes(g)))
    return 'admin';
  if (groups.some(g => ['portal-manager', 'int_bislem'].includes(g)))
    return 'mudur';
  return 'personel';
}

// Mevcut User.role → sistemRol mapping (UserRole tablosu yoksa)
function rolToSistemRol(role) {
  if (role === 'admin')   return 'admin';
  if (role === 'manager') return 'mudur';
  return 'personel';
}

// UserRole tablosundan sistemRol bak (async)
async function getSistemRol(username, groups, role) {
  try {
    const prisma = require('../lib/prisma');
    const ur = await prisma.userRole.findUnique({ where: { username } });
    if (ur?.active && ur?.role) return ur.role;
  } catch {}
  // Fallback: AD gruplarından veya mevcut role'den
  const fromAD = getADSistemRol(groups || []);
  if (fromAD !== 'personel') return fromAD;
  return rolToSistemRol(role);
}

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

// Kullanıcının çalışma gruplarını çek (token'a gömülecek)
async function getCalismaGruplari(username) {
  try {
    const prisma = require('../lib/prisma');
    const rows = await prisma.calismaGrubuUye.findMany({
      where: { username },
      include: { grubu: { select: { id: true, ad: true, department: true, directorate: true } } },
    });
    return rows.map(r => ({ id: r.grubu.id, ad: r.grubu.ad, rol: r.rol, department: r.grubu.department }));
  } catch { return []; }
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
  }

  // --- MOCK MOD ---
  if (process.env.MOCK_AUTH === 'true') {
    const mockUser = MOCK_USERS[username];

    if (!mockUser || mockUser.password !== password) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
    }

    // Mock kullanıcıyı DB'ye upsert et (directorate/department dahil)
    const prisma = require('../lib/prisma');
    await prisma.user.upsert({
      where:  { username },
      update: {
        displayName: mockUser.payload.displayName,
        role:        mockUser.payload.role,
        directorate: mockUser.payload.directorate || null,
        department:  mockUser.payload.department  || null,
      },
      create: {
        username:    username,
        displayName: mockUser.payload.displayName,
        role:        mockUser.payload.role,
        directorate: mockUser.payload.directorate || null,
        department:  mockUser.payload.department  || null,
      },
    }).catch(() => {}); // DB hatası login'i engellemesin

    const muhtarlikRole = await getMuhtarlikRole(username);
    const sistemRol = await getSistemRol(username, mockUser.payload.groups, mockUser.payload.role);
    const calismaGruplari = await getCalismaGruplari(username);
    const payload = {
      ...mockUser.payload,
      sistemRol,
      calismaGruplari,
      muhtarlikRole: muhtarlikRole || null,
      muhtarlikRoleLevel: ROL_SEVIYE[muhtarlikRole] || 0,
    };
    const token = signToken(payload);
    logger.info(`[MOCK] Giriş: ${username} (${mockUser.payload.role} / sistemRol: ${sistemRol})`);
    return res.json({ token, user: payload, muhtarlikAccess: !!muhtarlikRole, muhtarlikRole: muhtarlikRole || null });
  }

  // --- YEREL KULLANICI KONTROLÜ (şifreli DB kaydı varsa AD'e gerek yok) ---
  try {
    const prisma = require('../lib/prisma');
    const bcrypt = require('bcryptjs');
    const localUser = await prisma.user.findUnique({ where: { username } });
    if (localUser?.password) {
      const valid = await bcrypt.compare(password, localUser.password);
      if (!valid) return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });

      const userRole   = await prisma.userRole.findUnique({ where: { username } });
      const muhtarlikRole = await getMuhtarlikRole(username);
      const sistemRol  = userRole?.active ? (userRole.role || 'personel') : rolToSistemRol(localUser.role);
      const calismaGruplari = await getCalismaGruplari(username);

      const payload = {
        username:    localUser.username,
        displayName: localUser.displayName,
        email:       localUser.email,
        role:        localUser.role,
        sistemRol,
        calismaGruplari,
        directorate: localUser.directorate,
        department:  localUser.department,
        title:       localUser.title,
        groups:      [],
        muhtarlikRole: muhtarlikRole || null,
        muhtarlikRoleLevel: ROL_SEVIYE[muhtarlikRole] || 0,
      };
      const token = signToken(payload);
      logger.info(`[LOCAL] Giriş: ${username} sistemRol=${sistemRol}`);
      return res.json({ token, user: payload, muhtarlikAccess: !!muhtarlikRole, muhtarlikRole: muhtarlikRole || null });
    }
  } catch (localErr) {
    logger.warn('[LOCAL auth] hata:', localErr.message);
  }

  // --- LDAP / AD MOD ---
  const AD_TIMEOUT = parseInt(process.env.AD_TIMEOUT_MS) || 10000;

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`AD bağlantısı ${ms / 1000}s içinde yanıt vermedi`)), ms)
      ),
    ]);
  }

  const svcClient  = new Client({ url: process.env.AD_URL });
  const userClient = new Client({ url: process.env.AD_URL });

  try {
    // Adım 1: Servis hesabıyla bind yap
    await withTimeout(
      svcClient.bind(
        `${process.env.AD_USERNAME}@${process.env.AD_DOMAIN}`,
        process.env.AD_PASSWORD
      ),
      AD_TIMEOUT
    );

    // Adım 2: Kullanıcıyı ara
    const { searchEntries } = await withTimeout(
      svcClient.search(process.env.AD_BASE_DN, {
        scope: 'sub',
        filter: `(sAMAccountName=${username})`,
        attributes: ['dn', 'sAMAccountName', 'displayName', 'mail',
                     'department', 'title', 'distinguishedName', 'memberOf',
                     'physicalDeliveryOfficeName', 'l'],
      }),
      AD_TIMEOUT
    );

    if (searchEntries.length === 0) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
    }

    const entry   = searchEntries[0];
    const userDN  = entry.distinguishedName || entry.dn;

    // Adım 3: Kullanıcının şifresiyle bind dene (UPN formatı — DN'de Türkçe karakter sorununu önler)
    const userUPN = `${username}@${process.env.AD_DOMAIN}`;
    try {
      await withTimeout(userClient.bind(userUPN, password), AD_TIMEOUT);
    } catch (bindErr) {
      if (bindErr.message.includes('yanıt vermedi')) throw bindErr;
      // UPN başarısız olursa full DN ile tekrar dene
      try {
        await withTimeout(userClient.bind(userDN, password), AD_TIMEOUT);
      } catch {
        return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
      }
    }

    // Adım 4: memberOf parse et → CN kısmını al
    const rawMemberOf = Array.isArray(entry.memberOf)
      ? entry.memberOf
      : [entry.memberOf].filter(Boolean);
    let groups = parseCN(rawMemberOf);

    // Adım 5: memberOf boşsa grup sorgusuyla ara
    if (groups.length === 0 && userDN) {
      const { searchEntries: groupEntries } = await withTimeout(
        svcClient.search(process.env.AD_BASE_DN, {
          scope:      'sub',
          filter:     `(&(objectClass=group)(member=${userDN}))`,
          attributes: ['cn'],
        }),
        AD_TIMEOUT
      );
      groups = groupEntries.map((g) => String(g.cn || '')).filter(Boolean);
      logger.info(`[AD] Grup sorgusu: ${groups.length} grup`);
    }

    logger.info(`[AD] Giriş: ${username} | Rol: ${getRole(groups)} | Gruplar: ${groups.join(', ') || '(yok)'}`);

    // AD'de 'department' alanı = Daire Başkanlığı adı (directorate)
    // Ancak bazı kullanıcılarda şube müdürlüğü adı geliyor — DB'deki doğru directorate korunsun
    const adDepartment = entry.department ? String(entry.department) : null;

    const prisma = require('../lib/prisma');
    const existingUser = await prisma.user.findUnique({
      where: { username: String(entry.sAMAccountName || username) },
      select: { directorate: true, department: true },
    }).catch(() => null);

    // AD sync'in yazdığı directorate'i koru (daha güvenilir)
    const resolvedDirectorate = existingUser?.directorate || adDepartment;
    const resolvedDepartment  = existingUser?.department  || adDepartment;

    const payload = {
      username:    String(entry.sAMAccountName || username),
      displayName: String(entry.displayName    || username),
      email:       entry.mail                       ? String(entry.mail)                       : null,
      directorate: resolvedDirectorate,
      department:  resolvedDepartment,
      title:       entry.title                      ? String(entry.title)                      : null,
      office:      entry.physicalDeliveryOfficeName ? String(entry.physicalDeliveryOfficeName) : null,
      city:        entry.l                          ? String(entry.l)                          : null,
      role:        getRole(groups),
      groups,
    };

    // Kullanıcıyı DB'ye upsert et — directorate/department yalnızca yoksa set et
    await prisma.user.upsert({
      where:  { username: payload.username },
      update: {
        displayName: payload.displayName,
        role:        payload.role,
        // directorate ve department AD sync tarafından yönetiliyor, login'de üzerine yazma
      },
      create: {
        username:    payload.username,
        displayName: payload.displayName,
        role:        payload.role,
        department:  adDepartment || null,
        directorate: adDepartment || null,
      },
    }).catch((e) => logger.warn('[DB upsert] kullanıcı kaydedilemedi:', e.message));

    const muhtarlikRole = await getMuhtarlikRole(payload.username);
    const sistemRol = await getSistemRol(payload.username, payload.groups, payload.role);
    const calismaGruplari = await getCalismaGruplari(payload.username);
    const finalPayload = {
      ...payload,
      sistemRol,
      calismaGruplari,
      muhtarlikRole: muhtarlikRole || null,
      muhtarlikRoleLevel: ROL_SEVIYE[muhtarlikRole] || 0,
    };
    const token = signToken(finalPayload);
    logger.info(`[AD] Token: ${payload.username} rol=${payload.role} sistemRol=${sistemRol}`);
    return res.json({ token, user: finalPayload, muhtarlikAccess: !!muhtarlikRole, muhtarlikRole: muhtarlikRole || null });
  } catch (err) {
    logger.error('Login hatası:', err.message);
    const isTimeout = err.message.includes('yanıt vermedi');
    res.status(isTimeout ? 503 : 401).json({
      error: isTimeout ? 'AD sunucusuna bağlanılamadı, lütfen tekrar deneyin' : 'Kullanıcı adı veya şifre hatalı',
    });
  } finally {
    // await kullanma — cevap verilemeyen soket event loop'u bloke eder
    svcClient.unbind().catch(() => {});
    userClient.unbind().catch(() => {});
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/refresh  (korumalı — geçerli token ile yeni token üretir)
// ---------------------------------------------------------------------------
router.post('/refresh', authMiddleware, (req, res) => {
  try {
    // req.user zaten verify edilmiş payload (authMiddleware tarafından)
    const { iat, exp, ...payload } = req.user;
    const token = signToken(payload);
    res.json({ token });
  } catch (err) {
    logger.error('Token refresh hatası:', err.message);
    res.status(500).json({ error: 'Token yenilenemedi' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/me  (korumalı)
// ---------------------------------------------------------------------------
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// ---------------------------------------------------------------------------
// GET /api/auth/ad-groups?username=xxx  (sadece admin)
// Servis hesabıyla bağlanıp kullanıcının AD gruplarını döndürür
// ---------------------------------------------------------------------------
router.get('/ad-groups', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  }

  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: 'username parametresi gerekli' });
  }

  if (process.env.MOCK_AUTH === 'true') {
    return res.json({ username, groups: ['Portal-Admins', 'Domain Users', 'IT'] });
  }

  const client = new Client({ url: process.env.AD_URL, connectTimeout: 8000, timeout: 10000 });
  try {
    const bindDN = `${process.env.AD_USERNAME}@${process.env.AD_DOMAIN}`;
    await client.bind(bindDN, process.env.AD_PASSWORD);

    const { searchEntries } = await client.search(process.env.AD_BASE_DN, {
      scope: 'sub',
      filter: `(sAMAccountName=${username})`,
      attributes: ['sAMAccountName', 'displayName', 'memberOf'],
    });

    if (searchEntries.length === 0) {
      return res.status(404).json({ error: 'Kullanıcı AD\'de bulunamadı' });
    }

    const entry  = searchEntries[0];
    const raw    = Array.isArray(entry.memberOf) ? entry.memberOf : [entry.memberOf].filter(Boolean);
    // CN=Grup Adı,OU=... → sadece CN kısmını al
    const groups = raw.map((dn) => dn.replace(/^CN=([^,]+),.+$/, '$1'));

    res.json({ username, displayName: entry.displayName, groups });
  } catch (err) {
    logger.error('AD grup sorgusu hatası:', err.message);
    res.status(500).json({ error: 'AD bağlantısı kurulamadı', detail: err.message });
  } finally {
    await client.unbind();
  }
});

module.exports = router;
