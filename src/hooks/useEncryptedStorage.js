import { useState, useEffect, useRef } from "react";
import { encryptData, decryptData } from "../crypto/encryption.js";

const SUFFIX = "_enc";

/**
 * Like useState but persisted to localStorage with AES-GCM encryption.
 * Returns [value, setValue, isLoaded]
 */
export function useEncryptedStorage(key, initialValue) {
  const [value, setValue]   = useState(initialValue);
  const [loaded, setLoaded] = useState(false);
  const firstLoad = useRef(true);

  // Load on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const stored = localStorage.getItem(key + SUFFIX);
      if (stored) {
        try {
          const decrypted = await decryptData(stored);
          if (!cancelled) setValue(decrypted);
        } catch (e) {
          console.warn(`[crypto] Could not decrypt ${key}:`, e);
        }
      }
      if (!cancelled) setLoaded(true);
    }
    load();
    return () => { cancelled = true; };
  }, [key]); // eslint-disable-line

  // Save on every change (skip first mount)
  useEffect(() => {
    if (!loaded) return;
    if (firstLoad.current) { firstLoad.current = false; return; }
    async function save() {
      try {
        const encrypted = await encryptData(value);
        localStorage.setItem(key + SUFFIX, encrypted);
      } catch (e) {
        console.warn(`[crypto] Could not encrypt ${key}:`, e);
      }
    }
    save();
  }, [key, value, loaded]);

  return [value, setValue, loaded];
}
