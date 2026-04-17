const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');

const logger = require('../utils/logger');

router.use(authMiddleware);

const BASE_WHERE = [
  { department: { not: null } },
  { department: { not: 'Dış Kullanıcı' } },
  { password: null },  // Mock kullanıcıları gizle (AD'den gelen gerçek kullanıcıların password'ü null)
];

// Non-admin için DB'den kendi directorate'ini çek
async function getMyDirectorate(username) {
  const me = await prisma.user.findUnique({
    where:  { username },
    select: { directorate: true },
  });
  return me?.directorate || null;
}

// ─── GET /api/users/me ────────────────────────────────────────────────────────
// Giriş yapan kullanıcının tüm AD bilgilerini döndür
router.get('/me', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { username: req.user.username },
      select: {
        id: true, username: true, displayName: true, email: true,
        title: true, department: true, directorate: true,
        phone: true, ipPhone: true, employeeNumber: true,
        departmentNumber: true, office: true, city: true, role: true,
        groups: {
          select: { role: true, group: { select: { id: true, name: true } } },
        },
        _count: { select: { tickets: true, assigned: true, devices: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    res.json(user);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Kullanıcı bilgileri alınamadı' });
  }
});

// ─── GET /api/users/stats ─────────────────────────────────────────────────────
// Admin: personel istatistikleri
router.get('/stats', async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Yetkiniz yok' });

  try {
    const [total, withDirectorate, withPhone, withEmployeeNumber] = await Promise.all([
      prisma.user.count({ where: { AND: BASE_WHERE } }),
      prisma.user.count({ where: { AND: [...BASE_WHERE, { directorate: { not: null } }] } }),
      prisma.user.count({ where: { AND: [...BASE_WHERE, { phone: { not: null } }] } }),
      prisma.user.count({ where: { AND: [...BASE_WHERE, { employeeNumber: { not: null } }] } }),
    ]);
    res.json({ total, withDirectorate, withPhone, withEmployeeNumber });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

// ─── GET /api/users ───────────────────────────────────────────────────────────
// Admin → tüm personel | Diğerleri → sadece kendi dairesi
router.get('/', async (req, res) => {
  const { search, department, directorate, page = '1', limit = '50' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = { AND: [...BASE_WHERE] };

  const rol = req.user.sistemRol || req.user.role;
  const isAdmin = rol === 'admin';

  if (rol === 'daire_baskani' && req.user.directorate) {
    // Daire başkanı → kendi dairesi (case-insensitive: AD login vs AD sync farkı)
    where.AND.push({ directorate: { equals: req.user.directorate, mode: 'insensitive' } });
    if (department) where.AND.push({ department });
  } else if (!isAdmin) {
    // Müdür / personel → kendi dairesi (DB'den çek)
    const myDir = await getMyDirectorate(req.user.username);
    if (myDir) {
      where.AND.push({ directorate: { equals: myDir, mode: 'insensitive' } });
    } else {
      if (req.user.department) where.AND.push({ department: { equals: req.user.department, mode: 'insensitive' } });
    }
    if (department) where.AND.push({ department });
  } else {
    // Admin → tümü, opsiyonel filtreler
    if (directorate) where.AND.push({ OR: [{ directorate }, { AND: [{ directorate: null }, { department: directorate }] }] });
    if (department)  where.AND.push({ department });
  }

  if (search) {
    where.AND.push({
      OR: [
        { displayName:    { contains: search, mode: 'insensitive' } },
        { username:       { contains: search, mode: 'insensitive' } },
        { email:          { contains: search, mode: 'insensitive' } },
        { employeeNumber: { contains: search, mode: 'insensitive' } },
        { department:     { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, username: true, displayName: true,
          email: true, department: true, directorate: true, title: true, role: true,
          phone: true, ipPhone: true, employeeNumber: true, office: true,
        },
        orderBy: [{ directorate: 'asc' }, { department: 'asc' }, { displayName: 'asc' }],
        skip,
        take: parseInt(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Kullanıcılar alınamadı' });
  }
});

// ─── GET /api/users/directorates ─────────────────────────────────────────────
router.get('/directorates', async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';

    let rows;
    if (isAdmin) {
      rows = await prisma.$queryRaw`
        SELECT COALESCE(directorate, department) AS name, COUNT(*)::int AS count
        FROM "User"
        WHERE (directorate IS NOT NULL OR department IS NOT NULL)
        GROUP BY COALESCE(directorate, department)
        ORDER BY name ASC
      `;
    } else {
      const myUser = await prisma.user.findUnique({
        where:  { username: req.user.username },
        select: { directorate: true, department: true },
      });
      const myDir = myUser?.directorate || myUser?.department;
      if (!myDir) return res.json([]);

      rows = await prisma.$queryRaw`
        SELECT COALESCE(directorate, department) AS name, COUNT(*)::int AS count
        FROM "User"
        WHERE LOWER(COALESCE(directorate, department)) = LOWER(${myDir})
        GROUP BY COALESCE(directorate, department)
        ORDER BY name ASC
      `;
    }

    res.json(rows.map(r => ({ name: r.name, count: Number(r.count) })));
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Daireler alınamadı' });
  }
});

// ─── GET /api/users/departments ──────────────────────────────────────────────
router.get('/departments', async (req, res) => {
  const { directorate } = req.query;
  try {
    const baseWhere = [...BASE_WHERE];
    if (directorate) baseWhere.push({ directorate: { equals: directorate, mode: 'insensitive' } });

    const grouped = await prisma.user.groupBy({
      by:      ['department'],
      where:   { AND: baseWhere },
      _count:  { department: true },
      orderBy: { department: 'asc' },
    });
    res.json(
      grouped
        .filter((d) => d.department)
        .map((d) => ({ name: d.department, count: d._count.department }))
    );
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Departmanlar alınamadı' });
  }
});

const OFFICIAL_DIRECTORATES = [
  'Afet İşleri ve Risk Yönetimi Dairesi Başkanlığı',
  'Akıllı Şehir ve Kent Bilgi Sistemleri Dairesi Başkanlığı',
  'Basın Yayın ve Halkla İlişkiler Dairesi Başkanlığı',
  'Bilgi İşlem Dairesi Başkanlığı',
  'Çevre Koruma ve Kontrol Dairesi Başkanlığı',
  'Destek Hizmetleri Dairesi Başkanlığı',
  'Dış İlişkiler Dairesi Başkanlığı',
  'Emlak ve İstimlak Dairesi Başkanlığı',
  'Etüt ve Projeler Dairesi Başkanlığı',
  'Fen İşleri Dairesi Başkanlığı',
  'Gençlik ve Spor Hizmetleri Dairesi Başkanlığı',
  'İklim Değişikliği ve Sıfır Atık Dairesi Başkanlığı',
  'İlçe Hizmetleri 1. Bölge Dairesi Başkanlığı',
  'İlçe Hizmetleri 2. Bölge Dairesi Başkanlığı',
  'İlçe Hizmetleri 3. Bölge Dairesi Başkanlığı',
  'İlçe Hizmetleri 4. Bölge Dairesi Başkanlığı',
  'İmar ve Şehircilik Dairesi Başkanlığı',
  'İnsan Kaynakları ve Eğitim Dairesi Başkanlığı',
  'İtfaiye Dairesi Başkanlığı',
  'Kadın ve Aile Hizmetleri Dairesi Başkanlığı',
  'Kent Tarihi, Tanıtım ve Turizm Dairesi Başkanlığı',
  'Kültür, Sanat ve Sosyal İşler Dairesi Başkanlığı',
  'Mali Hizmetler Dairesi Başkanlığı',
  'Muhtarlık İşleri Dairesi Başkanlığı',
  'Sağlık ve Sosyal Hizmetler Dairesi Başkanlığı',
  'Tarımsal Hizmetler Dairesi Başkanlığı',
  'Ulaşım Dairesi Başkanlığı',
  'Yazı İşleri ve Kararlar Dairesi Başkanlığı',
  'Zabıta Dairesi Başkanlığı',
  'Özel Kalem Müdürlüğü',
  '1. Hukuk Müşavirliği',
  'Rehberlik ve Teftiş Kurulu Başkanlığı',
];

// ─── GET /api/users/demographics ─────────────────────────────────────────────
// Admin: tüm personel demografik istatistikleri
// Daire başkanı: kendi dairesine filtrelenmiş demografik istatistikler
router.get('/demographics', async (req, res) => {
  const rol = req.user.sistemRol || req.user.role;
  if (!['admin', 'daire_baskani'].includes(rol))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  // Daire başkanı → kendi dairesiyle sınırla
  const dirFilter = rol === 'daire_baskani' ? req.user.directorate : null;

  try {
    const today = new Date();
    const todayMD = `${String(today.getDate()).padStart(2,'0')}.${String(today.getMonth()+1).padStart(2,'0')}`;
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Daire filtre SQL parçası + mock kullanıcıları gizle (ILIKE: case-insensitive)
    const dirSQL = dirFilter
      ? `AND LOWER(directorate) = LOWER('${dirFilter.replace(/'/g, "''")}') AND password IS NULL`
      : 'AND password IS NULL';

    const [genderRows, employeeTypeRows, directorateRows, ageRows, birthdayRows, newWeekRows, totals, kadroRows] = await Promise.all([
      // Cinsiyet dağılımı
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(gender, 'Belirtilmemiş') AS name, COUNT(*)::int AS value
        FROM "User"
        WHERE department IS NOT NULL AND department != 'Dış Kullanıcı' ${dirSQL}
        GROUP BY COALESCE(gender, 'Belirtilmemiş')
        ORDER BY value DESC
      `),
      // Çalışan tipi dağılımı
      prisma.$queryRawUnsafe(`
        SELECT COALESCE("employeeType", 'Belirtilmemiş') AS name, COUNT(*)::int AS value
        FROM "User"
        WHERE department IS NOT NULL AND department != 'Dış Kullanıcı' ${dirSQL}
        GROUP BY COALESCE("employeeType", 'Belirtilmemiş')
        ORDER BY value DESC
      `),
      // Daire bazlı personel sayısı — erkek/kadın breakdown
      dirFilter
        ? prisma.$queryRawUnsafe(`
            SELECT
              department AS directorate,
              COUNT(*)::int AS total,
              COUNT(CASE WHEN gender = 'Erkek' THEN 1 END)::int AS erkek,
              COUNT(CASE WHEN gender = 'Kadın' THEN 1 END)::int AS kadin
            FROM "User"
            WHERE LOWER(directorate) = LOWER('${dirFilter.replace(/'/g, "''")}')
              AND department IS NOT NULL AND department != 'Dış Kullanıcı'
              AND password IS NULL
            GROUP BY department
            ORDER BY total DESC
          `)
        : prisma.$queryRaw`
            SELECT
              directorate,
              COUNT(*)::int AS total,
              COUNT(CASE WHEN gender = 'Erkek' THEN 1 END)::int AS erkek,
              COUNT(CASE WHEN gender = 'Kadın' THEN 1 END)::int AS kadin
            FROM "User"
            WHERE directorate = ANY(${OFFICIAL_DIRECTORATES})
            GROUP BY directorate
            ORDER BY total DESC
          `,
      // Yaş grupları (birthday DD.MM.YYYY formatında)
      prisma.$queryRawUnsafe(`
        SELECT name, value FROM (
          SELECT
            CASE
              WHEN age_years < 25 THEN '<25'
              WHEN age_years BETWEEN 25 AND 34 THEN '25-34'
              WHEN age_years BETWEEN 35 AND 44 THEN '35-44'
              WHEN age_years BETWEEN 45 AND 54 THEN '45-54'
              WHEN age_years BETWEEN 55 AND 64 THEN '55-64'
              ELSE '65+'
            END AS name,
            COUNT(*)::int AS value,
            MIN(age_years) AS sort_key
          FROM (
            SELECT EXTRACT(YEAR FROM AGE(NOW(), TO_DATE(birthday, 'DD.MM.YYYY')))::int AS age_years
            FROM "User"
            WHERE birthday IS NOT NULL AND LENGTH(birthday) = 10
              AND department IS NOT NULL AND department != 'Dış Kullanıcı' ${dirSQL}
          ) sub
          GROUP BY 1
        ) grouped
        ORDER BY sort_key
      `),
      // Bugün doğum günü olanlar
      prisma.$queryRawUnsafe(`
        SELECT username, "displayName", department, directorate
        FROM "User"
        WHERE birthday IS NOT NULL
          AND SUBSTRING(birthday, 1, 5) = '${todayMD}'
          AND department IS NOT NULL AND department != 'Dış Kullanıcı' ${dirSQL}
        ORDER BY "displayName"
      `),
      // Bu hafta AD'ye eklenenler
      dirFilter
        ? prisma.$queryRawUnsafe(`
            SELECT username, "displayName", department, directorate, "adCreatedAt"
            FROM "User"
            WHERE "adCreatedAt" >= '${weekAgo.toISOString()}'
              AND department IS NOT NULL AND department != 'Dış Kullanıcı'
              AND LOWER(directorate) = LOWER('${dirFilter.replace(/'/g, "''")}')
              AND password IS NULL
            ORDER BY "adCreatedAt" DESC
            LIMIT 20
          `)
        : prisma.$queryRaw`
            SELECT username, "displayName", department, directorate, "adCreatedAt"
            FROM "User"
            WHERE "adCreatedAt" >= ${weekAgo}
              AND department IS NOT NULL AND department != 'Dış Kullanıcı'
            ORDER BY "adCreatedAt" DESC
            LIMIT 20
          `,
      // Kadro dağılımı
      prisma.$queryRawUnsafe(`
        SELECT COALESCE(kadro, 'Belirtilmemiş') AS name, COUNT(*)::int AS value
        FROM "User"
        WHERE department IS NOT NULL AND department != 'Dış Kullanıcı'
          AND kadro IS NOT NULL ${dirSQL}
        GROUP BY COALESCE(kadro, 'Belirtilmemiş')
        ORDER BY value DESC
        LIMIT 15
      `),
      // Özet sayaçlar
      dirFilter
        ? Promise.all([
            prisma.user.count({ where: { AND: [...BASE_WHERE, { directorate: { equals: dirFilter, mode: 'insensitive' } }] } }),
            prisma.user.count({ where: { AND: [...BASE_WHERE, { directorate: { equals: dirFilter, mode: 'insensitive' } }, { birthday: { not: null } }] } }),
            prisma.user.count({ where: { AND: [...BASE_WHERE, { directorate: { equals: dirFilter, mode: 'insensitive' } }, { welcomeMailSent: true }] } }),
            prisma.user.count({
              where: {
                AND: [...BASE_WHERE, { directorate: { equals: dirFilter, mode: 'insensitive' } }],
                adCreatedAt: { gte: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()) },
              },
            }),
          ])
        : Promise.all([
            prisma.user.count({ where: { AND: BASE_WHERE } }),
            prisma.user.count({ where: { AND: BASE_WHERE, birthday: { not: null } } }),
            prisma.user.count({ where: { AND: BASE_WHERE, welcomeMailSent: true } }),
            prisma.user.count({
              where: {
                AND: BASE_WHERE,
                adCreatedAt: { gte: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()) },
              },
            }),
          ]),
    ]);

    const [total, withBirthday, welcomeMailsSent, newLastYear] = totals;

    res.json({
      totals: { total, withBirthday, welcomeMailsSent, newLastYear },
      gender:        genderRows.map(r => ({ name: r.name, value: Number(r.value) })),
      employeeType:  employeeTypeRows.map(r => ({ name: r.name, value: Number(r.value) })),
      byDirectorate: directorateRows.map(d => ({
        name: String(d.directorate)
          .replace(' Dairesi Başkanlığı', ' DB')
          .replace(' Şube Müdürlüğü', ' ŞM')
          .replace('Müdürlüğü', 'Md.')
          .replace('Başkanlığı', 'Bşk.'),
        fullName: d.directorate,
        total: Number(d.total),
        erkek: Number(d.erkek),
        kadin: Number(d.kadin),
      })),
      dirFilter: dirFilter || null,
      ageGroups:     ageRows.map(r => ({ name: r.name, value: Number(r.value) })),
      birthdayToday: birthdayRows.map(r => ({
        username: r.username, displayName: r.displayName,
        department: r.department, directorate: r.directorate,
      })),
      newThisWeek:   newWeekRows.map(r => ({
        username: r.username, displayName: r.displayName,
        department: r.department, directorate: r.directorate,
        adCreatedAt: r.adCreatedAt,
      })),
      byKadro: kadroRows.map(r => ({ name: r.name, value: Number(r.value) })),
    });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Demografik veriler alınamadı' });
  }
});

// ─── POST /api/users/send-birthday-mail/:username ────────────────────────────
router.post('/send-birthday-mail/:username', async (req, res) => {
  const rol = req.user.sistemRol || req.user.role;
  if (!['admin', 'daire_baskani'].includes(rol))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  try {
    const { sendBirthdayMails } = require('../lib/birthdayMailer');
    const result = await sendBirthdayMails(req.params.username);
    res.json(result);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Mail gönderilemedi' });
  }
});

// ─── PATCH /api/users/:id/location ───────────────────────────────────────────
router.patch('/:id/location', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const id = parseInt(req.params.id);
  const { locationId } = req.body;

  try {
    const user = await prisma.user.update({
      where: { id },
      data:  { locationId: locationId ?? null },
      select: {
        id: true, username: true, displayName: true,
        locationId: true,
        location: { select: { id: true, name: true } },
      },
    });
    res.json(user);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    if (err.code === 'P2003') return res.status(404).json({ error: 'Lokasyon bulunamadı' });
    logger.error(err);
    res.status(500).json({ error: 'Lokasyon atanamadı' });
  }
});

// ─── GET /api/users/:username ─────────────────────────────────────────────────
// Yetki kuralları:
//   admin   → herkesi tam görebilir
//   manager → kendi dairesindeki herkesi tam; dışarısı → telefon/sicil gizli
//   user    → kendi profilini tam; başkalarını → telefon/sicil gizli
router.get('/:username', async (req, res) => {
  const { username } = req.params;
  const requester    = req.user;

  try {
    const user = await prisma.user.findUnique({
      where:  { username },
      select: {
        id: true, username: true, displayName: true, email: true,
        title: true, department: true, directorate: true,
        phone: true, ipPhone: true, employeeNumber: true,
        office: true, city: true,
        _count: { select: { devices: true, tickets: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    // Açık talep sayısı
    const openTickets = await prisma.ticket.count({
      where: {
        createdById: user.id,
        status: { notIn: ['RESOLVED', 'CLOSED', 'REJECTED'] },
      },
    });

    // Tam görme yetkisi kontrol
    const isSelf  = requester.username === username;
    const isAdmin = requester.role === 'admin';
    let canSeeFull = isSelf || isAdmin;

    if (!canSeeFull && requester.role === 'manager') {
      const me = await prisma.user.findUnique({
        where:  { username: requester.username },
        select: { directorate: true },
      });
      canSeeFull = !!(me?.directorate && me.directorate === user.directorate);
    }

    if (!canSeeFull) {
      const { phone: _p, ipPhone: _ip, employeeNumber: _en, ...publicFields } = user;
      return res.json({ ...publicFields, openTickets });
    }

    res.json({ ...user, openTickets });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Kullanıcı alınamadı' });
  }
});

module.exports = router;
