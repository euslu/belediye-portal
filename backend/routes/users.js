const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
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

// GET /api/users
// Admin → tüm personel | Diğerleri → sadece kendi dairesi
router.get('/', async (req, res) => {
  const { search, department, directorate, page = '1', limit = '50' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = { AND: [...BASE_WHERE] };

  // Yetki: admin değilse sadece kendi directorate'i görebilir
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin) {
    const myDir = await getMyDirectorate(req.user.username);
    if (myDir) {
      where.AND.push({ directorate: myDir });
    } else {
      // Directorate yoksa department bazında kısıtla
      if (req.user.department) where.AND.push({ department: req.user.department });
    }
  } else {
    // Admin: query param filtreleri geçerli
    // directorate veya department ile filtrele (COALESCE mantığı: birinde varsa göster)
    if (directorate) where.AND.push({ OR: [{ directorate }, { AND: [{ directorate: null }, { department: directorate }] }] });
    if (department)  where.AND.push({ department });
  }

  if (search) {
    where.OR = [
      { displayName: { contains: search, mode: 'insensitive' } },
      { username:    { contains: search, mode: 'insensitive' } },
      { email:       { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, username: true, displayName: true,
          email: true, department: true, directorate: true, title: true, role: true,
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

// GET /api/users/directorates
// Admin → tüm daireler | Diğerleri → sadece kendi dairesi
// directorate boşsa department fallback olarak kullanılır
router.get('/directorates', async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';

    // Raw query: COALESCE(directorate, department) ile gruplama
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

// PATCH /api/users/:id/location
// Kullanıcıya lokasyon ata (admin/manager)
router.patch('/:id/location', async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Yetkiniz yok' });

  const id = parseInt(req.params.id);
  const { locationId } = req.body; // null → lokasyon kaldır

  try {
    const user = await prisma.user.update({
      where: { id },
      data:  { locationId: locationId ?? null },
      select: {
        id: true, username: true, displayName: true,
        locationId: true,
        location: { select: { id: true, name: true, building: true } },
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

// GET /api/users/departments
// Seçili daire altındaki müdürlük listesi + çalışan sayısı
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

module.exports = router;
