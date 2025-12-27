import express from "express";
import archiver from "archiver";
import path from "path";

const app = express();
const PORT = 6000;

app.get("/install.sh", (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || req.hostname;
  const baseUrl = `${protocol}://${host}`;
  
  const installScript = `#!/bin/bash
set -e

echo "=========================================="
echo "  Telebit Explorer - VPS Installer"
echo "=========================================="

if [ "$(id -u)" != "0" ]; then
    echo "Run with: curl -sSL ${baseUrl}/install.sh | sudo bash"
    exit 1
fi

DEPLOY_DIR="/var/www/telebit-explorer"
APP_NAME="telebit-explorer"
DB_PASS=$(openssl rand -hex 16)
SESSION_SECRET=$(openssl rand -hex 32)

echo "[1/6] Installing dependencies..."
apt-get update -y
apt-get install -y curl wget gnupg2 build-essential

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
sudo -u postgres psql -c "CREATE USER explorer WITH PASSWORD '\$DB_PASS';"
sudo -u postgres psql -c "CREATE DATABASE explorer_db OWNER explorer;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE explorer_db TO explorer;"

echo "[3/6] Downloading source code..."
rm -rf \$DEPLOY_DIR
mkdir -p \$DEPLOY_DIR
cd \$DEPLOY_DIR

curl -sSL "${baseUrl}/source.tar.gz" | tar -xzf - || {
    echo "Download failed. Make sure Replit is running."
    exit 1
}

echo "[4/6] Creating configuration..."
cat > .env << ENVFILE
DATABASE_URL=postgresql://explorer:\$DB_PASS@localhost:5432/explorer_db
EVM_RPC_URL=https://rpc.telemeet.space
CHAIN_ID=136919
CHAIN_NAME=Telebit
NATIVE_SYMBOL=TBT
NATIVE_NAME=Telebit
BECH32_PREFIX=tbt
SITE_NAME=Telebit Blockchain Explorer
SESSION_SECRET=\$SESSION_SECRET
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
pm2 delete \$APP_NAME 2>/dev/null || true
pm2 start dist/index.cjs --name \$APP_NAME
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

IP=$(hostname -I | awk '{print \$1}')
echo ""
echo "=========================================="
echo "  Installation Complete!"
echo "=========================================="
echo ""
echo "Explorer: http://\$IP:5000"
echo "Admin: http://\$IP:5000/admin"
echo "Login: admin / telebit2024"
echo ""
`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(installScript);
});

app.get("/source.tar.gz", (_req, res) => {
  res.setHeader('Content-Type', 'application/gzip');
  res.setHeader('Content-Disposition', 'attachment; filename="source.tar.gz"');
  
  const archive = archiver('tar', { gzip: true });
  archive.on('error', (err) => {
    console.error('Archive error:', err);
    if (!res.headersSent) {
      res.status(500).send('Failed to create archive');
    }
  });
  
  archive.pipe(res);
  
  const projectRoot = path.resolve(process.cwd());
  archive.glob('**/*', {
    cwd: projectRoot,
    ignore: [
      'node_modules/**',
      'dist/**',
      '.git/**',
      '.cache/**',
      '.replit',
      'replit.nix',
      '.config/**',
      '*.log',
      '.env',
      '.env.*',
      'attached_assets/**',
      '.upm/**',
    ],
    dot: false,
  });
  
  archive.finalize();
});

app.get("/", (_req, res) => {
  res.send("Telebit Explorer Install Server - Use /install.sh");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[install-server] Running on port ${PORT}`);
});
