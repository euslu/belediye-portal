'use strict';
/**
 * EPC Device → Portal User eşleştirme servisi
 *
 * Device.assignedTo alanındaki EPC owner değerlerini Portal User username'leriyle eşleştirir.
 *
 * 5 strateji (öncelik sırasıyla):
 *   1. Direkt username eşleşmesi   (ad.soyad → ad.soyad)          confidence: 100
 *   2. Türkçe-normalize username   (meliha.tezcan → meliha.tezcan) confidence: 95
 *   3. Cihaz adından username türet (MELIHATEZCAN → meliha.tezcan)  confidence: 80
 *   4. Kısmi isim eşleşmesi        (gungurkesecinb → gungor.keseci) confidence: 65
 *   5. Birim adı eşleşmesi         (ulasim → Ulaşım Dairesi)       confidence: 50
 */

const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

// ─── Türkçe karakter normalize ────────────────────────────────────────────────
function trNorm(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ö/g, 'o').replace(/ı/g, 'i').replace(/ç/g, 'c')
    .replace(/İ/g, 'i').replace(/Ş/g, 's').replace(/Ğ/g, 'g')
    .replace(/Ü/g, 'u').replace(/Ö/g, 'o').replace(/Ç/g, 'c')
    .trim();
}

// ─── Basit Levenshtein mesafesi ───────────────────────────────────────────────
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = a[j - 1] === b[i - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

// ─── Alt-dizi benzerlik kontrolü ──────────────────────────────────────────────
// str içinde pattern'in en az %70'i ardışık eşleşiyor mu?
function containsFuzzy(str, pattern) {
  if (!str || !pattern || pattern.length < 3) return false;
  // Tam alt-dizi
  if (str.includes(pattern)) return true;
  // 1 harf toleransla alt-dizi (Levenshtein)
  const maxDist = pattern.length <= 5 ? 1 : 2;
  for (let i = 0; i <= str.length - pattern.length + maxDist; i++) {
    const sub = str.substring(i, i + pattern.length);
    if (levenshtein(sub, pattern) <= maxDist) return true;
  }
  return false;
}

// ─── Birim kısa ad → daire adı eşleştirme ────────────────────────────────────
const BIRIM_MAP = {
  ulasim:      'Ulaşım',
  zabita:      'Zabıta',
  itfaiye:     'İtfaiye',
  imar:        'İmar',
  fen:         'Fen İşleri',
  cevre:       'Çevre',
  tarim:       'Tarımsal',
  saglik:      'Sağlık',
  sosyal:      'Sosyal',
  mali:        'Mali',
  insan:       'İnsan Kaynakları',
  destek:      'Destek',
  basin:       'Basın',
  kultur:      'Kültür',
  emlak:       'Emlak',
  hukuk:       'Hukuk',
  yazi:        'Yazı İşleri',
  spor:        'Spor',
  afet:        'Afet',
  cagrimerkezi: 'Basın',         // çağrı merkezi → Basın Yayın
  bilgiislem:  'Bilgi İşlem',
};

// ─── User cache ───────────────────────────────────────────────────────────────
let _users = null;
let _usersAt = 0;

async function getUsers() {
  if (_users && Date.now() - _usersAt < 5 * 60_000) return _users;
  const raw = await prisma.user.findMany({
    where: { password: null },  // AD kullanıcıları
    select: {
      username: true, displayName: true,
      firstName: true, lastName: true,
      directorate: true, department: true,
    },
  });
  // firstName/lastName boşsa displayName'den türet (Ahmet YILMAZ → Ahmet, Yılmaz)
  _users = raw.map(u => {
    if (u.firstName && u.lastName) return u;
    if (!u.displayName) return u;
    const parts = u.displayName.trim().split(/\s+/);
    if (parts.length < 2) return u;
    return {
      ...u,
      firstName: u.firstName || parts[0],
      lastName: u.lastName || parts.slice(1).join(' '),
    };
  });
  _usersAt = Date.now();
  return _users;
}

// ─── Tekil owner eşleştirme ──────────────────────────────────────────────────
async function matchOwner(owner, deviceName) {
  const NO = { username: null, directorate: null, confidence: 0, method: 'no_match' };
  if (!owner && !deviceName) return NO;

  const users = await getUsers();
  const ownerLow = (owner || '').trim().toLowerCase();

  // ── STRATEJİ 1: Direkt username (ad.soyad) ──────────────────────────────
  if (ownerLow && ownerLow.includes('.')) {
    const hit = users.find(u => u.username === ownerLow);
    if (hit) return { username: hit.username, displayName: hit.displayName, directorate: hit.directorate, confidence: 100, method: 'direkt_username' };

    // Türkçe-normalize dene
    const norm = trNorm(ownerLow);
    const hit2 = users.find(u => trNorm(u.username) === norm);
    if (hit2) return { username: hit2.username, displayName: hit2.displayName, directorate: hit2.directorate, confidence: 95, method: 'normalized_username' };
  }

  // ── STRATEJİ 2: Cihaz adından tam username türet ──────────────────────
  if (deviceName) {
    const devNorm = trNorm(deviceName);
    if (!devNorm.startsWith('mbb-') && !devNorm.startsWith('vdi-') &&
        !/\d/.test(devNorm) && devNorm.length > 6) {
      const hit = users.find(u => {
        if (!u.firstName || !u.lastName) return false;
        if (trNorm(u.firstName).length < 3 || trNorm(u.lastName).length < 3) return false;
        const fn = trNorm(u.firstName);
        const ln = trNorm(u.lastName);
        return devNorm === fn + ln || devNorm === ln + fn;
      });
      if (hit) return { username: hit.username, displayName: hit.displayName, directorate: hit.directorate, confidence: 80, method: 'devicename_match' };
    }
  }

  // ── STRATEJİ 3: Kısmi / fuzzy isim eşleşmesi ─────────────────────────
  // Cihaz adı veya owner içinde kullanıcının ad+soyadının kısmi eşleşmesi
  const searchStr = trNorm(deviceName || owner || '');
  if (searchStr.length > 5 && !searchStr.startsWith('mbb-') && !searchStr.startsWith('vdi-')) {
    const candidates = [];
    for (const u of users) {
      if (!u.firstName || !u.lastName) continue;
      const fn = trNorm(u.firstName);
      const ln = trNorm(u.lastName);
      if (fn.length < 3 || ln.length < 3) continue;

      const fnMatch = containsFuzzy(searchStr, fn);
      const lnMatch = containsFuzzy(searchStr, ln);

      if (fnMatch && lnMatch) {
        // Her iki isim de bulundu — yüksek güven
        candidates.push({ user: u, score: 65 });
      } else if (lnMatch && fn.length >= 3 && searchStr.includes(fn.substring(0, 3))) {
        // Soyad tam + adın ilk 3 harfi var
        candidates.push({ user: u, score: 60 });
      } else if (fnMatch && ln.length >= 4 && searchStr.includes(ln.substring(0, 4))) {
        // Ad tam + soyadın ilk 4 harfi var
        candidates.push({ user: u, score: 60 });
      }
    }

    if (candidates.length > 0) {
      // En yüksek skorlu aday
      candidates.sort((a, b) => b.score - a.score);
      const best = candidates[0];
      return {
        username: best.user.username,
        displayName: best.user.displayName,
        directorate: best.user.directorate,
        confidence: best.score,
        method: 'partial_name_match',
      };
    }
  }

  // ── STRATEJİ 4: Birim adı eşleşmesi ─────────────────────────────────────
  if (ownerLow) {
    const norm = trNorm(ownerLow);
    for (const [key, val] of Object.entries(BIRIM_MAP)) {
      if (norm === key || norm.includes(key)) {
        const daire = users.find(u =>
          trNorm(u.directorate || '').includes(trNorm(val))
        )?.directorate;
        return { username: null, directorate: daire || val, confidence: 50, method: 'birim_match', birimAdi: val };
      }
    }
  }

  return NO;
}

// ─── Toplu eşleştirme (sadece önizleme — uygulama frontend'den seçimli yapılır) ─
async function runMatchAll({ dryRun = true } = {}) {
  logger.info(`[DeviceMatch] ${dryRun ? 'DRY RUN' : 'GERÇEK'} eşleştirme başlıyor...`);

  const cihazlar = await prisma.device.findMany({
    where: { active: true, type: { in: ['BILGISAYAR', 'DIZUSTU'] } },
    select: { id: true, name: true, assignedTo: true, directorate: true },
  });

  const sonuc = { toplam: cihazlar.length, eslesti: 0, birimAtandi: 0, oneriVar: 0, eslesmedi: 0, detay: [] };

  for (const c of cihazlar) {
    const m = await matchOwner(c.assignedTo, c.name);

    sonuc.detay.push({
      cihazId: c.id, cihazAdi: c.name, owner: c.assignedTo,
      ...m,
    });

    if (m.confidence >= 80 && m.username) {
      sonuc.eslesti++;
    } else if (m.confidence >= 60 && m.username) {
      sonuc.oneriVar++;
    } else if (m.confidence >= 50 && m.directorate) {
      sonuc.birimAtandi++;
    } else {
      sonuc.eslesmedi++;
    }
  }

  // dryRun=false artık kullanılmıyor, seçimli onay frontend'den yapılacak
  // Geriye uyumluluk için eski davranışı koru
  if (!dryRun) {
    for (const d of sonuc.detay) {
      if (d.confidence >= 80 && d.username) {
        await prisma.device.update({
          where: { id: d.cihazId },
          data: {
            assignedTo: d.username,
            ...(d.directorate && !cihazlar.find(c => c.id === d.cihazId)?.directorate ? { directorate: d.directorate } : {}),
          },
        }).catch(e => logger.error(`[DeviceMatch] update hata (${d.cihazAdi}):`, e.message));
      }
    }
  }

  logger.info('[DeviceMatch] Sonuç:', {
    toplam: sonuc.toplam, eslesti: sonuc.eslesti, oneriVar: sonuc.oneriVar,
    birimAtandi: sonuc.birimAtandi, eslesmedi: sonuc.eslesmedi,
  });

  return sonuc;
}

// ─── Seçili eşleştirmeleri uygula ───────────────────────────────────────────
async function applySelectedMatches(matches) {
  let applied = 0;
  for (const { cihazId, username } of matches) {
    if (!cihazId || !username) continue;
    try {
      const user = await prisma.user.findUnique({
        where: { username },
        select: { directorate: true, department: true },
      });
      const device = await prisma.device.update({
        where: { id: cihazId },
        data: {
          assignedTo: username,
          ...(user?.directorate ? { directorate: user.directorate } : {}),
          ...(user?.department ? { department: user.department } : {}),
        },
      });

      // Kalıcı UserDevice kaydı oluştur/güncelle (AD sync koruması için)
      await prisma.userDevice.upsert({
        where: { username_deviceName: { username, deviceName: device.name } },
        create: {
          username,
          deviceName: device.name,
          deviceId: device.id,
          deviceType: device.type || 'DIGER',
          serialNumber: device.serialNumber,
          active: true,
        },
        update: {
          deviceId: device.id,
          deviceType: device.type || 'DIGER',
          serialNumber: device.serialNumber,
          active: true,
        },
      });

      applied++;
    } catch (e) {
      logger.error(`[DeviceMatch] Seçimli eşleştirme hata (cihaz ${cihazId}):`, e.message);
    }
  }
  return { applied };
}

module.exports = { matchOwner, runMatchAll, applySelectedMatches };
