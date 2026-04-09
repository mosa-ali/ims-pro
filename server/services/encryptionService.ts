import crypto from 'crypto';

/**
 * Encryption Service for sensitive data (API keys, secrets)
 * Uses AES-256-GCM for authenticated encryption
 */

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32-char-min';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Derive a 32-byte key from the encryption key
 */
function getEncryptionKey(): Buffer {
  // If key is less than 32 bytes, hash it to get 32 bytes
  if (ENCRYPTION_KEY.length < 32) {
    return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  }
  return Buffer.from(ENCRYPTION_KEY.slice(0, 32));
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * Returns: iv + authTag + encryptedData (all base64 encoded)
 */
export function encryptData(data: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine iv + authTag + encrypted data
    const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'hex')]);
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data encrypted with encryptData()
 */
export function decryptData(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract components
    const iv = combined.slice(0, IV_LENGTH);
    const authTag = combined.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.slice(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Mask sensitive data for display (show only last 4 characters)
 */
export function maskSensitiveData(data: string, showChars: number = 4): string {
  if (data.length <= showChars) {
    return '*'.repeat(data.length);
  }
  return '*'.repeat(data.length - showChars) + data.slice(-showChars);
}

/**
 * Generate a random API key for webhook signing
 */
export function generateWebhookSigningKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify webhook signature (HMAC-SHA256)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  signingKey: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', signingKey)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}
