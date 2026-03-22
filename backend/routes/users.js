const express = require('express');
const router  = express.Router();
const prisma  = require('../lib/prisma');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

const BASE_WHERE = [
  { department: { not: null } },
  { department: { not: 'Dış Kullanıcı' } },
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
    console.error(err);
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
    console.error(err);
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

// ─── GET /api/users ───────────────────────────────────────────────────────────
// Admin → tüm personel | Diğerleri → sadece kendi dairesi
router.get('/', async (req, res) => {
  const { search, department, directorate, page = '1', limit = '50' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = { AND: [...BASE_WHERE] };

  const isAdmin = req.user.role === 'admin';
  if (!isAdmin) {
    const myDir = await getMyDirectorate(req.user.username);
    if (myDir) {
      where.AND.push({ directorate: myDir });
    } else {
      if (req.user.department) where.AND.push({ department: req.user.department });
    }
  } else {
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
    console.error(err);
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
        WHERE COALESCE(directorate, department) = ${myDir}
        GROUP BY COALESCE(directorate, department)
        ORDER BY name ASC
      `;
    }

    res.json(rows.map(r => ({ name: r.name, count: Number(r.count) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Daireler alınamadı' });
  }
});

// ─── GET /api/users/departments ──────────────────────────────────────────────
router.get('/departments', async (req, res) => {
  const { directorate } = req.query;
  try {
    const baseWhere = [...BASE_WHERE];
    if (directorate) baseWhere.push({ directorate });

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
    console.error(err);
    res.status(500).json({ error: 'Departmanlar alınamadı' });
  }
});

// ─── GET /api/users/demographics ─────────────────────────────────────────────
// Admin: personel demografik istatistikleri (cinsiyet, çalışan tipi, daire dağılımı, ay bazlı giriş)
router.get('/demographics', async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Yetkiniz yok' });

  try {
    const today = new Date();
    const todayMD = `${String(today.getDate()).padStart(2,'0')}.${String(today.getMonth()+1).padStart(2,'0')}`;
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [genderRows, employeeTypeRows, directorateRows, ageRows, birthdayRows, newWeekRows, totals] = await Promise.all([
      // Cinsiyet dağılımı
      prisma.$queryRaw`
        SELECT COALESCE(gender, 'Belirtilmemiş') AS name, COUNT(*)::int AS value
        FROM "User"
        WHERE department IS NOT NULL AND department != 'Dış Kullanıcı'
        GROUP BY COALESCE(gender, 'Belirtilmemiş')
        ORDER BY value DESC
      `,
      // Çalışan tipi dağılımı
      prisma.$queryRaw`
        SELECT COALESCE("employeeType", 'Belirtilmemiş') AS name, COUNT(*)::int AS value
        FROM "User"
        WHERE department IS NOT NULL AND department != 'Dış Kullanıcı'
        GROUP BY COALESCE("employeeType", 'Belirtilmemiş')
        ORDER BY value DESC
      `,
      // Daire bazlı personel sayısı (tüm daireler)
      prisma.$queryRaw`
        SELECT COALESCE(directorate, department) AS name, COUNT(*)::int AS value
        FROM "User"
        WHERE (directorate IS NOT NULL OR department IS NOT NULL)
          AND department != 'Dış Kullanıcı'
        GROUP BY COALESCE(directorate, department)
        ORDER BY value DESC
      `,
      // Yaş grupları (birthday DD.MM.YYYY formatında)
      prisma.$queryRaw`
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
              AND department IS NOT NULL AND department != 'Dış Kullanıcı'
          ) sub
          GROUP BY 1
        ) grouped
        ORDER BY sort_key
      `,
      // Bugün doğum günü olanlar
      prisma.$queryRaw`
        SELECT username, "displayName", department, directorate
        FROM "User"
        WHERE birthday IS NOT NULL
          AND SUBSTRING(birthday, 1, 5) = ${todayMD}
          AND department IS NOT NULL AND department != 'Dış Kullanıcı'
        ORDER BY "displayName"
      `,
      // Bu hafta AD'ye eklenenler
      prisma.$queryRaw`
        SELECT username, "displayName", department, directorate, "adCreatedAt"
        FROM "User"
        WHERE "adCreatedAt" >= ${weekAgo}
          AND department IS NOT NULL AND department != 'Dış Kullanıcı'
        ORDER BY "adCreatedAt" DESC
        LIMIT 20
      `,
      // Özet sayaçlar
      Promise.all([
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
      byDirectorate: directorateRows.map(r => ({ name: r.name, value: Number(r.value) })),
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
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Demografik veriler alınamadı' });
  }
});

// ─── POST /api/users/send-birthday-mail/:username ────────────────────────────
router.post('/send-birthday-mail/:username', async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Yetkiniz yok' });

  try {
    const { sendBirthdayMails } = require('../lib/birthdayMailer');
    const result = await sendBirthdayMails(req.params.username);
    res.json(result);
  } catch (err) {
    console.error(err);
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
    console.error(err);
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
    console.error(err);
    res.status(500).json({ error: 'Kullanıcı alınamadı' });
  }
});

module.exports = router;
