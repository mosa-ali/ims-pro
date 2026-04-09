import type { Express } from "express";
import express from "express";
import path from "path";
import fs from "fs";

/**
 * Serve static files in production mode
 * This is a production-only function that serves built frontend assets
 * It does NOT import Vite or any dev-only dependencies
 */
export function serveStatic(app: Express) {
  const appRoot = process.cwd();
  const publicDir = path.resolve(appRoot, "dist/public");
  const indexFile = path.resolve(publicDir, "index.html");

  console.log("[Static] appRoot:", appRoot);
  console.log("[Static] publicDir:", publicDir);
  console.log("[Static] indexFile:", indexFile);

  if (!fs.existsSync(indexFile)) {
    throw new Error(`Frontend build not found at ${indexFile}`);
  }

  // Serve static files with caching headers
  app.use(
    express.static(publicDir, {
      maxAge: "1d",
      etag: false,
    }),
  );

  // Serve index.html for SPA routing
  app.get("*", (_req, res) => {
    res.sendFile(indexFile);
  });
}
