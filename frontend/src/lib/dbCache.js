/**
 * BookBridge Local-First Cache Utility (IndexedDB + Storage Fallback)
 * 
 * Used ONLY for non-sensitive public/UI data caching (Book catalogue, Categories, Chat history).
 * NEVER stores passwords, payment credentials, or admin keys.
 */

const DB_NAME = "BookBridgeCache";
const DB_VERSION = 1;
const STORE_NAME = "keyvalue";

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      resolve(null); // Fallback to localStorage if IndexedDB unavailable
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null); // Graceful fallback
  });
}

export async function setCache(key, value, ttlMs = 1000 * 60 * 60 * 24) {
  const payload = {
    value,
    expiresAt: Date.now() + ttlMs,
    timestamp: Date.now()
  };

  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(payload, key);
      return;
    }
  } catch (err) {
    console.warn("IndexedDB set failed, using localStorage fallback:", err.message);
  }

  // Fallback to localStorage
  try {
    localStorage.setItem(`bbc_${key}`, JSON.stringify(payload));
  } catch (err) {
    console.warn("Storage fallback failed:", err.message);
  }
}

export async function getCache(key) {
  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(key);
      const result = await new Promise((res) => {
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(null);
      });
      if (result) {
        if (result.expiresAt && Date.now() > result.expiresAt) {
          clearCache(key);
          return null;
        }
        return result.value;
      }
    }
  } catch (err) {
    console.warn("IndexedDB get failed, trying fallback:", err.message);
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(`bbc_${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(`bbc_${key}`);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

export async function clearCache(key) {
  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, "readwrite");
      if (key) {
        tx.objectStore(STORE_NAME).delete(key);
      } else {
        tx.objectStore(STORE_NAME).clear();
      }
    }
  } catch {}

  try {
    if (key) {
      localStorage.removeItem(`bbc_${key}`);
    } else {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("bbc_")) localStorage.removeItem(k);
      });
    }
  } catch {}
}
