import express, { type Express } from "express";
import fs from "fs";
import path from "path";

let cachedSettings: { siteName?: string; siteDescription?: string; siteFavicon?: string; siteLogo?: string } = {};

export async function updateCachedSettings() {
  try {
    const { storage } = await import("./storage");
    const settings = await storage.getAllSiteSettings();
    cachedSettings = {
      siteName: settings.find(s => s.key === 'site_name')?.value || undefined,
      siteDescription: settings.find(s => s.key === 'site_description')?.value || undefined,
      siteFavicon: settings.find(s => s.key === 'site_favicon')?.value || undefined,
      siteLogo: settings.find(s => s.key === 'site_logo')?.value || undefined,
    };
    console.log("[static] Cached settings updated:", cachedSettings.siteName ? `siteName=${cachedSettings.siteName}` : "no siteName");
  } catch (err) {
    console.error("Failed to update cached settings:", err);
  }
}

function serveIndexWithMeta(distPath: string, res: express.Response) {
  const indexPath = path.resolve(distPath, "index.html");
  let html = fs.readFileSync(indexPath, "utf-8");
  
  // Inject dynamic meta tags for social media crawlers
  if (cachedSettings.siteName) {
    html = html.replace(/<title>.*?<\/title>/, `<title>${cachedSettings.siteName}</title>`);
    html = html.replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${cachedSettings.siteName}"`);
    html = html.replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${cachedSettings.siteName}"`);
  }
  
  if (cachedSettings.siteDescription) {
    html = html.replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${cachedSettings.siteDescription}"`);
    html = html.replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${cachedSettings.siteDescription}"`);
    html = html.replace(/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${cachedSettings.siteDescription}"`);
  }

  if (cachedSettings.siteLogo) {
    html = html.replace(/<meta property="og:image" content="[^"]*"/, `<meta property="og:image" content="${cachedSettings.siteLogo}"`);
    html = html.replace(/<meta name="twitter:image" content="[^"]*"/, `<meta name="twitter:image" content="${cachedSettings.siteLogo}"`);
  }
  
  res.setHeader("Content-Type", "text/html");
  res.send(html);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Load cached settings on startup
  updateCachedSettings();

  // Serve local public-objects directory for deployment files
  const publicObjectsPath = path.resolve(process.cwd(), "public-objects");
  if (fs.existsSync(publicObjectsPath)) {
    app.use("/public-objects", express.static(publicObjectsPath));
  }

  // Serve uploads directory for VPS file uploads (logo, favicon)
  const uploadsPath = path.resolve(distPath, "uploads");
  if (fs.existsSync(uploadsPath)) {
    app.use("/uploads", express.static(uploadsPath));
  }

  // Handle root path BEFORE static middleware to inject meta tags
  app.get("/", (_req, res) => {
    serveIndexWithMeta(distPath, res);
  });

  // Serve static files but skip index.html (we handle it above and in fallback)
  app.use(express.static(distPath, { index: false }));

  // Fallback for all other routes (SPA routing)
  app.use("*", (_req, res) => {
    serveIndexWithMeta(distPath, res);
  });
}
