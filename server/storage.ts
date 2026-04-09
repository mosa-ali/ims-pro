/**
 * Storage helpers — dual-environment implementation
 *
 * Environment detection:
 *  - If BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY are set → Manus S3 proxy (production)
 *  - Otherwise → local filesystem under ./uploads/ (local development)
 *
 * The public interface (storagePut / storageGet) is identical in both modes so
 * all callers remain unchanged.
 */
import { ENV } from './_core/env';
import fs from 'node:fs';
import path from 'node:path';

// ─── Helpers shared by both backends ─────────────────────────────────────────

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, '');
}

function isManusStorageAvailable(): boolean {
  return !!(ENV.forgeApiUrl && ENV.forgeApiKey);
}

// ─── Local filesystem backend ─────────────────────────────────────────────────

const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

function ensureLocalDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getLocalFilePath(key: string): string {
  return path.join(LOCAL_UPLOADS_DIR, key);
}

/**
 * Build the public URL for a locally stored file.
 * In local mode the Express server exposes /uploads/* as static files.
 */
function getLocalPublicUrl(key: string): string {
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}/uploads/${key}`;
}

async function localStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const filePath = getLocalFilePath(key);
  ensureLocalDir(filePath);

  const buffer =
    typeof data === 'string'
      ? Buffer.from(data, 'utf-8')
      : Buffer.from(data as Uint8Array);

  fs.writeFileSync(filePath, buffer);
  console.log(`[Local Storage] Saved: ${filePath}`);

  return { key, url: getLocalPublicUrl(key) };
}

async function localStorageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: getLocalPublicUrl(key) };
}

// ─── Manus S3 proxy backend ───────────────────────────────────────────────────

type StorageConfig = { baseUrl: string; apiKey: string };

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error(
      'Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY'
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ''), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL('v1/storage/upload', ensureTrailingSlash(baseUrl));
  url.searchParams.set('path', normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    'v1/storage/downloadUrl',
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set('path', normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: 'GET',
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === 'string'
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append('file', blob, fileName || 'file');
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

async function manusStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = 'application/octet-stream'
): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split('/').pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

async function manusStorageGet(relKey: string): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Upload bytes to storage.
 *
 * In Manus-hosted environments: uploads to the Manus S3 proxy.
 * In local environments (no BUILT_IN_FORGE_API_URL): saves to ./uploads/ directory.
 *
 * Returns { key, url } where url is a publicly accessible link to the file.
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = 'application/octet-stream'
): Promise<{ key: string; url: string }> {
  if (isManusStorageAvailable()) {
    return manusStoragePut(relKey, data, contentType);
  }
  console.log('[Storage] Manus S3 not configured — using local filesystem storage');
  return localStoragePut(relKey, data);
}

/**
 * Get a URL for downloading a stored file.
 *
 * In Manus-hosted environments: returns a presigned S3 URL.
 * In local environments: returns a localhost URL served by Express.
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  if (isManusStorageAvailable()) {
    return manusStorageGet(relKey);
  }
  return localStorageGet(relKey);
}
