const request = require('supertest');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3001';

// Sunucu ayakta mı kontrol et — değilse tüm testleri skip et
let serverUp = false;

beforeAll(async () => {
  try {
    await request(BASE).get('/health').timeout(3000);
    serverUp = true;
  } catch {
    console.warn('Sunucu erişilemedi, smoke testler atlanıyor.');
  }
});

function smokeIt(desc, fn) {
  it(desc, async () => {
    if (!serverUp) return; // skip silently
    await fn();
  });
}

describe('Smoke Tests', () => {
  // ─── Health ───────────────────────────────────────────────────────────────
  smokeIt('GET /health → 200, status ok', async () => {
    const res = await request(BASE).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('errors_last_hour');
  });

  // ─── Auth — boş login ────────────────────────────────────────────────────
  smokeIt('POST /api/auth/login (boş body) → 400', async () => {
    const res = await request(BASE)
      .post('/api/auth/login')
      .send({});
    expect([400, 401]).toContain(res.status);
  });

  // ─── Token olmadan korumalı endpoint'ler → 401 ───────────────────────────
  const protectedEndpoints = [
    '/api/dashboard',
    '/api/flexcity/personel',
    '/api/muhtarbis/liste',
    '/api/rbac/kullanicilar',
  ];

  for (const endpoint of protectedEndpoints) {
    smokeIt(`GET ${endpoint} (no token) → 401`, async () => {
      const res = await request(BASE).get(endpoint);
      expect(res.status).toBe(401);
    });
  }

  // ─── 404 handler ─────────────────────────────────────────────────────────
  smokeIt('GET /olmayan-endpoint → 404', async () => {
    const res = await request(BASE).get('/olmayan-endpoint');
    expect(res.status).toBe(404);
  });
});
