#!/bin/bash
set -e

echo "=========================================="
echo "  Telebit Explorer - VPS Installer"
echo "=========================================="
echo ""

if [ "$(id -u)" != "0" ]; then
    echo "Run with sudo: sudo bash install.sh"
    exit 1
fi

DEPLOY_DIR="/var/www/telebit-explorer"
APP_NAME="telebit-explorer"
DB_PASS=$(openssl rand -hex 16)
SESSION_SECRET=$(openssl rand -hex 32)

echo "[1/6] Installing dependencies..."
apt-get update -y
apt-get install -y curl wget gnupg2 build-essential git

if ! command -v node &> /dev/null || [[ ! "$(node -v)" =~ ^v20 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

npm install -g pm2 2>/dev/null || true

if ! command -v psql &> /dev/null; then
    apt-get install -y postgresql postgresql-contrib
fi
systemctl enable postgresql
systemctl start postgresql

echo "[2/6] Setting up database..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS explorer_db;" 2>/dev/null || true
sudo -u postgres psql -c "DROP USER IF EXISTS explorer;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER explorer WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -c "CREATE DATABASE explorer_db OWNER explorer;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE explorer_db TO explorer;"

echo "[3/6] Cloning source code..."
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Clone from GitHub - you need to push your code first
# git clone https://github.com/YOUR_USERNAME/telebit-explorer.git $DEPLOY_DIR
# Or copy files manually to $DEPLOY_DIR

echo "NOTE: Copy your source files to $DEPLOY_DIR first!"
echo "You can use: scp -r ./* root@YOUR_VPS:$DEPLOY_DIR/"
read -p "Press Enter after copying files..."

cd $DEPLOY_DIR

echo "[4/6] Creating configuration..."
cat > .env << ENVFILE
DATABASE_URL=postgresql://explorer:$DB_PASS@localhost:5432/explorer_db
EVM_RPC_URL=https://rpc.t369coin.org/
CHAIN_ID=55369
CHAIN_NAME=Team369
NATIVE_SYMBOL=T369
NATIVE_NAME=Team369
BECH32_PREFIX=tem
SITE_NAME=Team369 Blockchain Explorer
SESSION_SECRET=$SESSION_SECRET
ADMIN_USERNAME=admin
ADMIN_PASSWORD=telebit2024
PORT=5000
NODE_ENV=production
ENVFILE
chmod 600 .env

echo "[5/6] Building application..."
npm ci
npm run build
npm run db:push 2>/dev/null || true

echo "[6/6] Starting with PM2..."
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start dist/index.cjs --name $APP_NAME
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo ""
echo "=========================================="
echo "  Installation Complete!"
echo "=========================================="
echo ""
echo "Explorer: http://$(hostname -I | awk '{print $1}'):5000"
echo "Admin: http://$(hostname -I | awk '{print $1}'):5000/admin"
echo "Login: admin / telebit2024"
echo ""
echo "Commands:"
echo "  pm2 logs $APP_NAME    # View logs"
echo "  pm2 restart $APP_NAME # Restart"
echo ""
