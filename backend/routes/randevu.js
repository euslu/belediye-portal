const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');

const RANDEVU_API = 'http://209.38.219.210:3000/api/v1';
const RANDEVU_KEY = 'gsapi_mbb_k9X7pQrBvW3n2026';
const YETKILI    = ['ethem.usluoglu', 'tayfun.yilmaz'];

// Auth + yetki kontrolü
router.use(auth, (req, res, next) => {
  if (!YETKILI.includes(req.user?.username)) {
    return res.status(403).json({ error: 'Bu servise erişim yetkiniz yok' });
  }
  next();
});

// Proxy: tüm alt path'leri Randevu API'ye ilet
router.all('/{*path}', async (req, res) => {
  try {
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const url   = `${RANDEVU_API}${req.path}${query}`;

    const response = await fetch(url, {
      method:  req.method,
      headers: {
        'X-API-Key':    RANDEVU_KEY,
        'Content-Type': 'application/json',
      },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method)
        ? JSON.stringify(req.body)
        : undefined,
    });

    const data = await response.json().catch(() => ({}));
    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Randevu API bağlantı hatası', detail: err.message });
  }
});

module.exports = router;
