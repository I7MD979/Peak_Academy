/**
 * Field-Level Encryption
 * Standard: OWASP A02 | NIST SC-28 | PCI DSS 3.4 | GDPR Art.32
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const ENCODING = "base64";
const SEPARATOR = ":";

function deriveKey(secret) {
  if (!secret) throw new Error("ENCRYPTION_SECRET is required");
  return createHash("sha256").update(String(secret)).digest();
}

let _key = null;

function getKey() {
  if (!_key) {
    _key = deriveKey(process.env.ENCRYPTION_SECRET || process.env.SUPABASE_SERVICE_KEY);
  }
  return _key;
}

export function encrypt(plaintext) {
  if (!plaintext) return plaintext;
  if (typeof plaintext !== "string") plaintext = String(plaintext);
  if (plaintext.startsWith("enc:")) return plaintext;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv, { authTagLength: TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const combined = [iv.toString(ENCODING), authTag.toString(ENCODING), encrypted.toString(ENCODING)].join(
    SEPARATOR
  );

  return `enc:${combined}`;
}

export function decrypt(encryptedValue) {
  if (!encryptedValue) return encryptedValue;
  if (!encryptedValue.startsWith("enc:")) return encryptedValue;

  try {
    const data = encryptedValue.slice(4);
    const parts = data.split(SEPARATOR);
    if (parts.length !== 3) throw new Error("Invalid format");

    const [ivB64, tagB64, cipherB64] = parts;
    const iv = Buffer.from(ivB64, ENCODING);
    const authTag = Buffer.from(tagB64, ENCODING);
    const encrypted = Buffer.from(cipherB64, ENCODING);

    const decipher = createDecipheriv(ALGORITHM, getKey(), iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err) {
    console.error("[encryption] Decrypt failed:", err.message);
    return null;
  }
}

export function encryptIfNeeded(value) {
  if (!value || String(value).startsWith("enc:")) return value;
  return encrypt(String(value));
}

export function decryptIfNeeded(value) {
  if (!value || !String(value).startsWith("enc:")) return value;
  return decrypt(String(value));
}

export function hashForSearch(value) {
  if (!value) return null;
  const pepper = process.env.SEARCH_HASH_PEPPER || process.env.ENCRYPTION_SECRET || "peak-default";
  return createHash("sha256")
    .update(`${pepper}:${String(value).toLowerCase().trim()}`)
    .digest("hex");
}

export function encryptUserFields(userData) {
  const result = { ...userData };
  if (userData.phone) {
    result.phone = encryptIfNeeded(userData.phone);
    result.phone_hash = hashForSearch(userData.phone);
  }
  if (userData.national_id) {
    result.national_id = encryptIfNeeded(userData.national_id);
  }
  return result;
}

export function decryptUserFields(userData) {
  if (!userData) return userData;
  const result = { ...userData };
  if (result.phone) result.phone = decryptIfNeeded(result.phone);
  if (result.national_id) result.national_id = decryptIfNeeded(result.national_id);
  return result;
}
