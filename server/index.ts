import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import MemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import archiver from "archiver";
import path from "path";

const MemoryStoreSession = MemoryStore(session);
const PgSession = connectPgSimple(session);

const app = express();
const httpServer = createServer(app);

// VPS Install Script - MUST be before any other middleware to bypass Vite
app.get("/install.sh", (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || req.hostname;
  const baseUrl = `${protocol}://${host}`;
  
  const installScript = `#!/bin/bash
set -e

echo "=========================================="
echo "  Telebit Explorer - VPS Installer"
echo "=========================================="
echo ""

if [ "$(id -u)" != "0" ]; then
    echo "Run with sudo: curl -sSL ${baseUrl}/install.sh | sudo bash"
    exit 1
fi

DEPLOY_DIR="/var/www/telebit-explorer"
APP_NAME="telebit-explorer"
DB_PASS=$(openssl rand -hex 16)
SESSION_SECRET=$(openssl rand -hex 32)
SOURCE_URL="${baseUrl}/source.tar.gz"

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

echo "[3/6] Downloading source code from Replit..."
rm -rf \$DEPLOY_DIR
mkdir -p \$DEPLOY_DIR
cd \$DEPLOY_DIR

curl -sSL "\$SOURCE_URL" | tar -xzf - || {
    echo "Download failed. Make sure Replit app is running."
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
BECH32_PREFIX=
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
npm run db:push 2>/dev/null || true

echo "[6/6] Starting with PM2..."
pm2 delete \$APP_NAME 2>/dev/null || true
pm2 start dist/index.cjs --name \$APP_NAME
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo ""
echo "=========================================="
echo "  Installation Complete!"
echo "=========================================="
echo ""
echo "Explorer: http://$(hostname -I | awk '{print \$1}'):5000"
echo "Admin: http://$(hostname -I | awk '{print \$1}'):5000/admin"
echo "Login: admin / telebit2024"
echo ""
echo "Commands:"
echo "  pm2 logs \$APP_NAME    # View logs"
echo "  pm2 restart \$APP_NAME # Restart"
echo ""
`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(installScript);
});

// Source code tarball - MUST be before Vite
app.get("/source.tar.gz", (_req, res) => {
  res.setHeader('Content-Type', 'application/gzip');
  res.setHeader('Content-Disposition', 'attachment; filename="telebit-explorer-source.tar.gz"');
  
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

// Enable gzip compression for all responses
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

const isProduction = process.env.NODE_ENV === "production";

// Require SESSION_SECRET in production
const sessionSecret = process.env.SESSION_SECRET;
if (isProduction && !sessionSecret) {
  console.error("FATAL: SESSION_SECRET environment variable is required in production");
  process.exit(1);
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Security headers with Helmet (production-safe CSP)
// Note: 'unsafe-inline' for styles required for Tailwind CSS
// 'unsafe-eval' removed - not needed in production builds
app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://rpc.telemeet.space", "https://rpc.t369coin.org", "wss:", "https:"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: null,
    },
  } : false,
  crossOriginEmbedderPolicy: false,
}));

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Rate limit configuration (can be overridden via environment variables)
const GLOBAL_RATE_LIMIT = parseInt(process.env.GLOBAL_RATE_LIMIT || "1000", 10);
const AUTH_RATE_LIMIT = parseInt(process.env.AUTH_RATE_LIMIT || "50", 10);
const API_RATE_LIMIT = parseInt(process.env.API_RATE_LIMIT || "100", 10);

// Global rate limiter - default 1000 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: GLOBAL_RATE_LIMIT,
  message: { message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for auth endpoints - default 50 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: AUTH_RATE_LIMIT,
  message: { message: "Too many authentication attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// API rate limiter - default 100 requests per minute
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: API_RATE_LIMIT,
  message: { message: "API rate limit exceeded, please slow down" },
  standardHeaders: true,
  legacyHeaders: false,
});

log(`Rate limits: Global=${GLOBAL_RATE_LIMIT}/15min, Auth=${AUTH_RATE_LIMIT}/15min, API=${API_RATE_LIMIT}/min`);

app.use(globalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
    limit: '10mb',
  }),
);

app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Create session store - use memory store for simplicity (works well for single-server deployments)
// Can be upgraded to PostgreSQL store with USE_PG_SESSION=true if needed
const usePgSession = process.env.USE_PG_SESSION === 'true';
const sessionStore = usePgSession
  ? new PgSession({
      pool: new pg.Pool({ connectionString: process.env.DATABASE_URL }),
      tableName: 'session',
      createTableIfMissing: true,
    })
  : new MemoryStoreSession({
      checkPeriod: 86400000,
    });

console.log(`Session store: ${usePgSession ? 'PostgreSQL' : 'Memory'}`);


app.use(
  session({
    secret: sessionSecret || "dev-secret-not-for-production",
    name: 'telebit.sid',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.FORCE_HTTPS === 'true',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
    },
  }),
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Serve local public-objects directory BEFORE routes (for deployment files)
import fs from "fs";
const publicObjectsPath = path.resolve(process.cwd(), "public-objects");
if (fs.existsSync(publicObjectsPath)) {
  app.use("/public-objects", express.static(publicObjectsPath, {
    maxAge: 0,
    setHeaders: (res) => {
      res.setHeader('Content-Type', 'application/gzip');
    }
  }));
}

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Seed default chain if no chains exist
  try {
    const { storage } = await import("./storage");
    const chains = await storage.getChains();
    if (chains.length === 0) {
      log("No chains found, seeding default Team369 chain...", "seed");
      await storage.createChain({
        chainId: parseInt(process.env.CHAIN_ID || "55369"),
        name: process.env.CHAIN_NAME || "Team369",
        shortName: process.env.NATIVE_SYMBOL?.toLowerCase() || "t369",
        rpcUrl: process.env.EVM_RPC_URL || "https://rpc.t369coin.org/",
        nativeCurrency: process.env.NATIVE_NAME || "Team369",
        nativeSymbol: process.env.NATIVE_SYMBOL || "T369",
        nativeDecimals: 18,
        isActive: true,
        isDefault: true,
        bech32Prefix: process.env.BECH32_PREFIX || null,
        addressDisplayFormat: "0x",
      });
      log("Default chain seeded successfully", "seed");
    }
  } catch (err: any) {
    log(`Chain seeding failed (may already exist): ${err.message}`, "seed");
  }

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
