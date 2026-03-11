#!/bin/bash
set -e

echo "=== Belediye Portal - Sunucu Kurulum Scripti ==="

echo ""
echo "[1/5] Node.js 20 kuruluyor..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo ""
echo "[2/5] PostgreSQL kuruluyor..."
sudo apt-get install -y postgresql postgresql-contrib

echo ""
echo "[3/5] PM2 kuruluyor..."
sudo npm install -g pm2

echo ""
echo "[4/5] Nginx kuruluyor..."
sudo apt-get install -y nginx

echo ""
echo "[5/5] Proje bagimliliklar kuruluyor..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR/backend" && npm install --production
cd "$PROJECT_DIR/frontend" && npm install

echo ""
echo "=== Kurulum tamamlandi! ==="
echo ""
echo "Sonraki adimlar:"
echo "  1. backend/.env dosyasini olustur (.env.example'dan kopyala)"
echo "  2. deploy/start.sh calistir"
echo "  3. deploy/nginx.conf dosyasini /etc/nginx/sites-available/belediye-portal'a kopyala"
