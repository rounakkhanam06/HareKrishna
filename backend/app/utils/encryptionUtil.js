/**
 * encryptionUtil.js
 *
 * AES-256-GCM field-level encryption for sensitive refund payout data.
 *
 * Key:     32-byte (256-bit) hex string from REFUND_ENCRYPTION_KEY env var
 * IV:      12-byte random nonce per encryption (never reused)
 * Auth Tag: 16-byte GCM authentication tag (detects tampering)
 *
 * Storage format (single base64 string):
 *   base64( IV[12 bytes] + AuthTag[16 bytes] + Ciphertext[N bytes] )
 *
 * Security rules:
 *   - Key loaded once at module init, throws if missing or wrong length
 *   - Decrypted values are never logged
 *   - If decryption fails, throws — never returns partial or corrupt data
 *   - Each encryption uses a fresh random IV
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;   // 96-bit IV recommended for GCM
const TAG_LENGTH = 16;  // 128-bit auth tag

let _key = null;

function getKey() {
  if (_key) return _key;

  const hexKey = String(process.env.REFUND_ENCRYPTION_KEY || "").trim();
  if (!hexKey) {
    throw new Error(
      "[encryptionUtil] REFUND_ENCRYPTION_KEY is not set. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  if (hexKey.length !== 64) {
    throw new Error(
      `[encryptionUtil] REFUND_ENCRYPTION_KEY must be 64 hex characters (32 bytes). ` +
      `Got ${hexKey.length} characters.`
    );
  }

  try {
    _key = Buffer.from(hexKey, "hex");
  } catch {
    throw new Error("[encryptionUtil] REFUND_ENCRYPTION_KEY is not valid hex.");
  }

  if (_key.length !== 32) {
    throw new Error("[encryptionUtil] Decoded key must be exactly 32 bytes.");
  }

  return _key;
}

/**
 * Encrypts a plain text string using AES-256-GCM.
 *
 * @param {string} plainText - The value to encrypt.
 * @returns {string} Base64-encoded blob: IV + AuthTag + Ciphertext
 */
export function encrypt(plainText) {
  if (plainText === null || plainText === undefined) {
    throw new Error("[encryptionUtil] Cannot encrypt null or undefined value.");
  }

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  const textBuffer = Buffer.from(String(plainText), "utf8");
  const encrypted = Buffer.concat([cipher.update(textBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Pack: IV (12) + Tag (16) + Ciphertext (N)
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString("base64");
}

/**
 * Decrypts a base64-encoded AES-256-GCM blob produced by `encrypt()`.
 *
 * @param {string} encryptedBlob - Base64 string from encrypt()
 * @returns {string} Original plain text
 * @throws {Error} If decryption fails (wrong key, tampered data, invalid format)
 */
export function decrypt(encryptedBlob) {
  if (!encryptedBlob) {
    throw new Error("[encryptionUtil] Cannot decrypt empty or null value.");
  }

  const key = getKey();
  let combined;
  try {
    combined = Buffer.from(encryptedBlob, "base64");
  } catch {
    throw new Error("[encryptionUtil] Encrypted blob is not valid base64.");
  }

  const minLength = IV_LENGTH + TAG_LENGTH + 1;
  if (combined.length < minLength) {
    throw new Error("[encryptionUtil] Encrypted blob is too short to be valid.");
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    // Do NOT include any key, iv, or ciphertext info in the error
    throw new Error(
      "[encryptionUtil] Decryption failed. The data may be tampered or the key may be incorrect."
    );
  }
}

/**
 * Masks a plain text value for display purposes.
 * Never call this on an encrypted blob — decrypt first.
 *
 * @param {string} value - Plain text to mask
 * @param {"upi"|"account"|"name"|"default"} type - Masking style
 * @returns {string} Masked string
 */
export function maskValue(value, type = "default") {
  if (!value) return "****";
  const str = String(value);

  switch (type) {
    case "upi": {
      // ab****@bank  — show first 2 chars + domain
      const atIdx = str.indexOf("@");
      if (atIdx > 0) {
        const local = str.slice(0, atIdx);
        const domain = str.slice(atIdx); // includes @
        const visible = local.slice(0, Math.min(2, local.length));
        return `${visible}****${domain}`;
      }
      return `${str.slice(0, 2)}****`;
    }
    case "account": {
      // Show last 4 digits only: ****5678
      const digits = str.replace(/\D/g, "");
      if (digits.length >= 4) {
        return `****${digits.slice(-4)}`;
      }
      return "****";
    }
    case "name": {
      // Show first letter of each word: A*** S***
      return str
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => `${word[0].toUpperCase()}***`)
        .join(" ");
    }
    default:
      return `${str.slice(0, 2)}****`;
  }
}
