import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;

/**
 * Derives a key from the encryption key using PBKDF2
 */
function getKey(salt: Buffer): Buffer {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY is not defined in environment variables');
  }
  return crypto.pbkdf2Sync(encryptionKey, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypts sensitive data (like Client Secrets and Access Tokens)
 */
export function encrypt(text: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = getKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  // Return: salt:iv:tag:encrypted
  return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts sensitive data
 */
export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }

  const salt = Buffer.from(parts[0]!, 'hex');
  const iv = Buffer.from(parts[1]!, 'hex');
  const tag = Buffer.from(parts[2]!, 'hex');
  const encrypted = parts[3]!;

  const key = getKey(salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
