import { useEffect, useRef, useState, useCallback } from "react";

const DB_NAME    = "psychocore_backups";
const STORE_NAME = "backups";
const MAX_BACKUPS = 20;

// ── IndexedDB helpers ────────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
        store.createIndex("timestamp", "timestamp");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function saveToIDB(data) {
  const db    = await openDB();
  const tx    = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const json  = JSON.stringify(data);
  store.add({ timestamp: Date.now(), size: json.length, data: json });

  // Prune old backups — keep MAX_BACKUPS
  const all = await new Promise((res, rej) => {
    const r = store.index("timestamp").openCursor(null, "prev");
    const items = [];
    r.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) { items.push(cursor.primaryKey); cursor.continue(); }
      else res(items);
    };
    r.onerror = rej;
  });
  if (all.length > MAX_BACKUPS) {
    all.slice(MAX_BACKUPS).forEach((id) => store.delete(id));
  }

  return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
}

export async function loadBackupsFromIDB() {
  const db    = await openDB();
  const tx    = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  return new Promise((res, rej) => {
    const items = [];
    const r = store.index("timestamp").openCursor(null, "prev");
    r.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        const { id, timestamp, size } = cursor.value;
        items.push({ id, timestamp, size });
        cursor.continue();
      } else res(items);
    };
    r.onerror = rej;
  });
}

export async function getBackupById(id) {
  const db    = await openDB();
  const tx    = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  return new Promise((res, rej) => {
    const r = store.get(id);
    r.onsuccess = () => res(r.result ? JSON.parse(r.result.data) : null);
    r.onerror   = rej;
  });
}

export async function deleteBackupById(id) {
  const db    = await openDB();
  const tx    = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(id);
  return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
}

// ── File System Access API helpers ───────────────────────────────────────────
const FS_HANDLE_KEY = "pc_fs_handle";

export async function requestFSDirectory() {
  if (!("showDirectoryPicker" in window)) return null;
  try {
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    // Persist handle (best-effort — requires StorageManager permission)
    try {
      const root = await navigator.storage.getDirectory();
      const ref  = await root.getFileHandle("pc_fs_ref", { create: true });
      const w    = await ref.createWritable();
      await w.write(JSON.stringify({ name: handle.name }));
      await w.close();
    } catch {}
    return handle;
  } catch { return null; }
}

export async function writeToFSDirectory(handle, data) {
  if (!handle) return false;
  try {
    const ts   = new Date().toISOString().replace(/[:.]/g, "-");
    const name = `psychocore-backup-${ts}.json`;
    const fh   = await handle.getFileHandle(name, { create: true });
    const w    = await fh.createWritable();
    await w.write(JSON.stringify(data, null, 2));
    await w.close();
    return true;
  } catch { return false; }
}

// ── Hook ─────────────────────────────────────────────────────────────────────
const DEBOUNCE_MS = 2000;

/**
 * useAutoBackup — saves to IndexedDB on every data change (debounced).
 * Optionally also writes to a File System directory if handle is granted.
 *
 * @param {object} allData — snapshot of all app data
 * @returns {{ lastBackup, doBackup, fsSupported, fsHandle, requestFS }}
 */
export function useAutoBackup(allData) {
  const [lastBackup, setLastBackup] = useState(null);
  const [fsHandle,   setFsHandle]   = useState(null);
  const timerRef    = useRef(null);
  const prevDataRef = useRef(null);

  const fsSupported = "showDirectoryPicker" in window;

  const doBackup = useCallback(async (data) => {
    const payload = { ...data, _meta: { ts: Date.now(), version: "1.0" } };
    try {
      await saveToIDB(payload);
      if (fsHandle) await writeToFSDirectory(fsHandle, payload);
      setLastBackup(Date.now());
    } catch (e) {
      console.warn("[backup] Failed:", e);
    }
  }, [fsHandle]);

  // Auto-backup on data change (debounced)
  useEffect(() => {
    const serialized = JSON.stringify(allData);
    if (serialized === prevDataRef.current) return;
    prevDataRef.current = serialized;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doBackup(allData), DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
  }, [allData, doBackup]);

  const requestFS = useCallback(async () => {
    const handle = await requestFSDirectory();
    if (handle) setFsHandle(handle);
    return !!handle;
  }, []);

  return { lastBackup, doBackup: () => doBackup(allData), fsSupported, fsHandle, requestFS };
}
