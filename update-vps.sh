#!/bin/bash
set -e

echo "=========================================="
echo "  Telebit Explorer - VPS Update Script"
echo "=========================================="
echo ""

if [ "$(id -u)" != "0" ]; then
    echo "Run with sudo: sudo bash update-vps.sh"
    exit 1
fi

DEPLOY_DIR="/var/www/telebit-explorer"
APP_NAME="telebit-explorer"

if [ ! -d "$DEPLOY_DIR" ]; then
    echo "Error: $DEPLOY_DIR not found!"
    echo "Run the initial install script first."
    exit 1
fi

cd $DEPLOY_DIR

echo "[1/5] Backing up configuration..."
if [ -f ".env" ]; then
    cp .env .env.backup
    echo "Saved .env to .env.backup"
fi

echo "[2/5] Pulling latest code from GitHub..."
git fetch origin
git reset --hard origin/main || git reset --hard origin/master

if [ -f ".env.backup" ]; then
    cp .env.backup .env
    echo "Restored .env configuration"
fi

echo "[3/5] Installing dependencies..."
npm ci

echo "[4/5] Building application..."
npm run build

echo "[5/5] Applying database migrations..."
npm run db:push 2>/dev/null || true

echo "[6/5] Restarting application..."
pm2 restart $APP_NAME

IP=$(hostname -I | awk '{print $1}')
echo ""
echo "=========================================="
echo "  Update Complete!"
echo "=========================================="
echo ""
echo "Explorer: http://$IP:5000"
echo "Admin: http://$IP:5000/admin"
echo ""
echo "Commands:"
echo "  pm2 logs $APP_NAME    # View logs"
echo "  pm2 restart $APP_NAME # Restart"
echo ""
