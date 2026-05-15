// ─────────────────────────────────────────────
// CLEAN STORAGE (LOCAL ONLY)
// ─────────────────────────────────────────────

import fs from 'node:fs';
import path from 'node:path';

const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

// Normalize key
function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, '');
}

// Ensure folder exists
function ensureLocalDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Build file path
function getLocalFilePath(key: string): string {
  return path.join(LOCAL_UPLOADS_DIR, key);
}

// ✅ PUBLIC URL GENERATOR
function getLocalPublicUrl(key: string): string {
  const baseUrl =
    process.env.PUBLIC_BASE_URL?.replace(/\/$/, '') ||
    'https://platform.imserp.org';

  return `${baseUrl}/uploads/${key}`;
}

// Save file
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = 'application/octet-stream'
): Promise<{ key: string; url: string }> {

  const key = normalizeKey(relKey);
  const filePath = getLocalFilePath(key);

  ensureLocalDir(filePath);

  const buffer =
    typeof data === 'string'
      ? Buffer.from(data, 'utf-8')
      : Buffer.from(data as Uint8Array);

  fs.writeFileSync(filePath, buffer);

  console.log(`[Storage] Saved locally: ${filePath}`);

  return { key, url: getLocalPublicUrl(key) };
}

// Get file URL
export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {

  const key = normalizeKey(relKey);
  return { key, url: getLocalPublicUrl(key) };
}