/**
 * Puppeteer Configuration
 * Handles browser cache and download settings for local dev and Docker
 * 
 * Local Dev: Puppeteer downloads Chrome to .cache/puppeteer (project-relative)
 * Docker: Uses system Chromium at /usr/bin/chromium (PUPPETEER_SKIP_DOWNLOAD=true)
 * 
 * See: https://pptr.dev/guides/configuration
 */

const { join } = require('path');

/**
 * @type {import('puppeteer').Configuration}
 */
module.exports = {
  // Cache Chrome in project directory (persists across restarts)
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),

  // Download from official Google CDN
  downloadHost: 'https://googlechromelabs.github.io/chrome-for-testing',

  // Skip download only in Docker (system Chromium pre-installed)
  skipDownload: process.env.NODE_ENV === 'production',
};
