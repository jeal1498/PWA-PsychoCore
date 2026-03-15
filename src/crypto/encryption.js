/**
 * PsychoCore Encryption Module
 * Uses Web Crypto API (AES-GCM 256 + PBKDF2 SHA-256)
 * No external dependencies required.
 */

const SALT_KEY    = "pc_salt";
const VERIFY_KEY  = "pc_verify";
const DATA_SUFFIX = "_enc";

let _key = null; // In-memory derived key — cleared on lock

// ── Helpers ──────────────────────────────────────────────────────────────────
function b64ToBytes(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}
function bytesToB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

async function getOrCreateSalt() {
  const stored = localStorage.getItem(SALT_KEY);
  if (stored) return b64ToBytes(stored);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(SALT_KEY, bytesToB64(salt));
  return salt;
}

async function deriveKey(pin, salt) {
  const enc = new TextEncoder();
  const material = await crypto.subtle.importKey(
    "raw", enc.encode(pin), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptWith(key, plaintext) {
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ct  = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  const out = new Uint8Array(12 + ct.byteLength);
  out.set(iv);
  out.set(new Uint8Array(ct), 12);
  return bytesToB64(out);
}

async function decryptWith(key, b64) {
  const data = b64ToBytes(b64);
  const iv   = data.slice(0, 12);
  const ct   = data.slice(12);
  const pt   = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Initialize crypto from PIN. Returns true if PIN is correct (or first run). */
export async function initCrypto(pin) {
  const salt = await getOrCreateSalt();
  const key  = await deriveKey(pin, salt);

  const stored = localStorage.getItem(VERIFY_KEY);
  if (!stored) {
    // First run — save verification token
    const token = await encryptWith(key, "psychocore_ok");
    localStorage.setItem(VERIFY_KEY, token);
    _key = key;
    return true;
  }

  try {
    const result = await decryptWith(key, stored);
    if (result === "psychocore_ok") { _key = key; return true; }
    return false;
  } catch {
    return false;
  }
}

/** Encrypt a JSON-serializable value. Returns base64 string. */
export async function encryptData(value) {
  if (!_key) throw new Error("Crypto key not initialized");
  return encryptWith(_key, JSON.stringify(value));
}

/** Decrypt and parse a base64 encrypted string. */
export async function decryptData(b64) {
  if (!_key) throw new Error("Crypto key not initialized");
  return JSON.parse(await decryptWith(_key, b64));
}

/** Change PIN — re-encrypts all stored data with the new key. */
export async function changePIN(oldPin, newPin) {
  const salt   = await getOrCreateSalt();
  const oldKey = await deriveKey(oldPin, salt);

  // Verify old PIN
  const stored = localStorage.getItem(VERIFY_KEY);
  try {
    const r = await decryptWith(oldKey, stored);
    if (r !== "psychocore_ok") return false;
  } catch { return false; }

  // Collect all encrypted keys
  const DATA_KEYS = [
    "pc_patients","pc_appointments","pc_sessions",
    "pc_payments","pc_resources","pc_profile"
  ];

  // Decrypt with old key
  const decrypted = {};
  for (const k of DATA_KEYS) {
    const val = localStorage.getItem(k + DATA_SUFFIX);
    if (val) {
      try { decrypted[k] = await decryptWith(oldKey, val); } catch {}
    }
  }

  // Generate new key and re-encrypt
  const newKey = await deriveKey(newPin, salt);
  for (const [k, v] of Object.entries(decrypted)) {
    localStorage.setItem(k + DATA_SUFFIX, await encryptWith(newKey, v));
  }

  // Update verification token
  localStorage.setItem(VERIFY_KEY, await encryptWith(newKey, "psychocore_ok"));
  _key = newKey;
  return true;
}

/** Clear key from memory (on lock). */
export function clearCryptoKey() {
  _key = null;
}

/** True if a salt + verification token exist (app has been set up). */
export function isCryptoSetUp() {
  return !!(localStorage.getItem(SALT_KEY) && localStorage.getItem(VERIFY_KEY));
}
