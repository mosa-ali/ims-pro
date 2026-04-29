/**
 * Puppeteer Configuration File
 * 
 * CRITICAL FOR PRODUCTION:
 * - Changes cache directory from /root/.cache/puppeteer (lost on restart)
 *   to .cache/puppeteer (persists in /app directory)
 * - Prevents "Could not find Chrome" errors on Azure/Docker restarts
 * - Works with Oryx build process and Docker deployments
 * 
 * See: https://pptr.dev/guides/configuration
 */

const { join } = require("path");

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // ─────────────────────────────────────────────────────────────────────
  // Cache Directory: MUST be relative to project root for persistence
  // ─────────────────────────────────────────────────────────────────────
  // Default (BROKEN on Azure): /root/.cache/puppeteer
  //   Problem: Lost when container restarts
  //   Result: "Could not find Chrome" errors
  //
  // Fixed (WORKS everywhere): .cache/puppeteer
  //   Benefit: Persists in /app/.cache/puppeteer
  //   Result: Chrome found on every restart
  cacheDirectory: join(__dirname, ".cache", "puppeteer"),

  // ─────────────────────────────────────────────────────────────────────
  // Download Host: Use Google's official CDN (default)
  // ─────────────────────────────────────────────────────────────────────
  // If you need a custom mirror (e.g., for restricted networks),
  // uncomment and set:
  // downloadHost: "https://registry.npmmirror.com/-/binary/chrome-for-testing",

  // ─────────────────────────────────────────────────────────────────────
  // Skip Download: Set to true ONLY if Chrome is pre-installed
  // ─────────────────────────────────────────────────────────────────────
  // For Docker: Leave as false (Puppeteer will download Chrome)
  // For system Chrome: Set to true and use executablePath in code
  skipDownload: false,
};
