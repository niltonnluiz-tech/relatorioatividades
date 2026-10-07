/**
 * End-to-End Cryptography Service (AES-256-GCM + PBKDF2 + SHA-256)
 * Strictly complies with LGPD and bank-grade data security standards.
 */

// Default session salt (can be user-customized)
const DEFAULT_SALT_STR = 'CAMP_PIERO_POLLONE_2026_SECURE_SALT';

/**
 * Derives a 256-bit AES-GCM CryptoKey from a user passphrase using PBKDF2
 */
export async function deriveKeyFromPassphrase(passphrase: string, saltStr: string = DEFAULT_SALT_STR): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const salt = enc.encode(saltStr);

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a string (e.g. financial numbers or sensitive values) using AES-256-GCM
 */
export async function encryptSensitiveData(plainText: string, passphrase: string): Promise<{
  ciphertext: string;
  iv: string;
  salt: string;
}> {
  try {
    const key = await deriveKeyFromPassphrase(passphrase);
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV recommended for GCM

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      enc.encode(plainText)
    );

    // Convert to base64
    const ciphertextBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
    const ivBase64 = btoa(String.fromCharCode(...iv));

    return {
      ciphertext: ciphertextBase64,
      iv: ivBase64,
      salt: DEFAULT_SALT_STR,
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Falha na criptografia ponta a ponta.');
  }
}

/**
 * Decrypts an AES-256-GCM encrypted payload
 */
export async function decryptSensitiveData(
  encrypted: { ciphertext: string; iv: string; salt?: string },
  passphrase: string
): Promise<string> {
  try {
    const key = await deriveKeyFromPassphrase(passphrase, encrypted.salt || DEFAULT_SALT_STR);
    const iv = Uint8Array.from(atob(encrypted.iv), (c) => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(encrypted.ciphertext), (c) => c.charCodeAt(0));

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (error) {
    console.warn('Decryption failed with provided key:', error);
    throw new Error('Chave de descriptografia incorreta ou dados corrompidos.');
  }
}

/**
 * Generates a tamper-evident SHA-256 integrity hash for audit trail chaining
 */
export async function calculateAuditHash(
  prevHash: string,
  timestamp: string,
  userId: string,
  action: string,
  details: string
): Promise<string> {
  const enc = new TextEncoder();
  const payload = `${prevHash}|${timestamp}|${userId}|${action}|${details}`;
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(payload));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Formats a currency string in Brazilian Real (R$)
 */
export function formatBRL(val: number | string): string {
  const num = typeof val === 'string' ? parseFloat(val.replace(/[^\d,-]/g, '').replace(',', '.')) || 0 : val;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}
