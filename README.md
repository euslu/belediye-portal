# Belediye Portal

Mugla Buyuksehir Belediyesi - Uygulama Portali

## CI/CD

- `main` branch'e push → otomatik test + deploy
- PR açılırsa → sadece test çalışır
- Deploy sonrası `/health` endpoint'i kontrol edilir

### GitHub Secrets (Settings → Secrets and variables → Actions)

| Secret | Değer |
|--------|-------|
| `DEPLOY_HOST` | 10.5.1.180 |
| `DEPLOY_USER` | mbb |
| `DEPLOY_PASS` | (mbb şifresi) |

### Pipeline Akışı

```
push main ─→ [Smoke Test] ─→ [Build Frontend] ─→ [SCP dist/] ─→ [SSH: git pull + npm ci + pm2 restart] ─→ [Health Check]
PR açılır  ─→ [Smoke Test]
```

## Geliştirme

```bash
npm run dev:backend    # Backend (watch mode)
npm run dev:frontend   # Frontend (Vite dev server)
npm test --prefix backend  # Smoke testler
```
