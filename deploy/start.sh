#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Belediye Portal - Deploy ==="

echo ""
echo "[1/3] Frontend build aliniyor..."
cd "$PROJECT_DIR/frontend"
npm run build

echo ""
echo "[2/3] Veritabani migration calistiriliyor..."
cd "$PROJECT_DIR/backend"
npx prisma migrate deploy
npx prisma generate

echo ""
echo "[3/3] Backend PM2 ile baslatiliyor..."
pm2 stop belediye-backend 2>/dev/null || true
pm2 start server.js --name "belediye-backend" --cwd "$PROJECT_DIR/backend"
pm2 save

echo ""
echo "=== Deploy tamamlandi! ==="
echo "Backend: http://localhost:3001/health"
