import { ObjectStorageService } from "../server/objectStorage";
import archiver from "archiver";
import path from "path";
import fs from "fs";

async function uploadInstallFiles() {
  console.log("Uploading install files to object storage...");

  const objectStorageService = new ObjectStorageService();
  const searchPaths = objectStorageService.getPublicObjectSearchPaths();
  const publicPath = searchPaths[0];
  
  console.log(`Using public path: ${publicPath}`);
  
  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.REPL_SLUG 
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : "https://your-replit-url.replit.app";

  const installScript = `#!/bin/bash
set -e

echo "=========================================="
echo "  Telebit Explorer - VPS Installer"
echo "=========================================="
echo ""

if [ "$(id -u)" != "0" ]; then
    echo "Please run with sudo: curl -sSL ${baseUrl}/public-objects/install.sh | sudo bash"
    exit 1
fi

export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

DEPLOY_DIR="/var/www/telebit-explorer"
APP_NAME="telebit-explorer"
DB_PASS=$(openssl rand -hex 16)
SESSION_SECRET=$(openssl rand -hex 32)

echo "[1/6] Installing system dependencies..."
apt-get update -y
apt-get -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" install curl wget gnupg2 build-essential

if ! command -v node &> /dev/null || [[ ! "$(node -v)" =~ ^v20 ]]; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" install nodejs
fi

npm install -g pm2 2>/dev/null || true

if ! command -v psql &> /dev/null; then
    echo "Installing PostgreSQL..."
    apt-get -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" install postgresql postgresql-contrib
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

curl -sSL "${baseUrl}/public-objects/source.tar.gz" | tar -xzf - || {
    echo "Failed to download source code"
    exit 1
}

echo "[4/6] Creating configuration..."
cat > .env << ENVFILE
DATABASE_URL=postgresql://explorer:\$DB_PASS@localhost:5432/explorer_db
EVM_RPC_URL=https://rpc.t369coin.org/
CHAIN_ID=55369
CHAIN_NAME=Team369
NATIVE_SYMBOL=T369
NATIVE_NAME=Team369
BECH32_PREFIX=t369
SITE_NAME=Team369 Blockchain Explorer
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

# Load env for db:push
export \$(grep -v '^#' .env | xargs)
npm run db:push 2>/dev/null || true

echo "[6/6] Starting with PM2..."
pm2 delete \$APP_NAME 2>/dev/null || true

# Create PM2 ecosystem file with environment variables
cat > ecosystem.config.cjs << 'PMCONFIG'
module.exports = {
  apps: [{
    name: 'telebit-explorer',
    script: './dist/index.cjs',
    env_file: '.env',
    env: {
PMCONFIG

# Add env vars from .env to ecosystem file
while IFS='=' read -r key value; do
  if [[ ! -z "\$key" && ! "\$key" =~ ^# ]]; then
    echo "      \$key: '\$value'," >> ecosystem.config.cjs
  fi
done < .env

cat >> ecosystem.config.cjs << 'PMCONFIG'
    }
  }]
};
PMCONFIG

pm2 start ecosystem.config.cjs
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
echo "Commands:"
echo "  pm2 logs \$APP_NAME    # View logs"
echo "  pm2 restart \$APP_NAME # Restart"
echo ""
`;

  console.log("Uploading install.sh...");
  await objectStorageService.uploadString(
    `${publicPath}/install.sh`,
    installScript,
    "text/plain; charset=utf-8"
  );
  console.log("install.sh uploaded");

  console.log("Creating source tarball...");
  const tarballPath = "/tmp/source.tar.gz";
  await createTarball(tarballPath);
  
  console.log("Uploading source.tar.gz...");
  const tarballContent = fs.readFileSync(tarballPath);
  await objectStorageService.uploadBuffer(
    `${publicPath}/source.tar.gz`,
    tarballContent,
    "application/gzip"
  );
  console.log("source.tar.gz uploaded");

  fs.unlinkSync(tarballPath);

  console.log("");
  console.log("========================================");
  console.log("  Upload Complete!");
  console.log("========================================");
  console.log("");
  console.log("Install command for VPS:");
  console.log(`  curl -sSL ${baseUrl}/public-objects/install.sh | sudo bash`);
  console.log("");
}

function createTarball(outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver("tar", { gzip: true });

    output.on("close", () => resolve());
    archive.on("error", (err) => reject(err));

    archive.pipe(output);

    const projectRoot = process.cwd();
    archive.glob("**/*", {
      cwd: projectRoot,
      ignore: [
        "node_modules/**",
        "dist/**",
        ".git/**",
        ".cache/**",
        ".replit",
        "replit.nix",
        ".config/**",
        "*.log",
        ".env",
        ".env.*",
        "attached_assets/**",
        ".upm/**",
        "scripts/**",
      ],
      dot: false,
    });

    archive.finalize();
  });
}

uploadInstallFiles().catch(console.error);
