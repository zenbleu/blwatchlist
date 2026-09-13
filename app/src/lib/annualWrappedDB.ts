// ── Annual BL Wrapped — Dedicated IndexedDB store ────────────────────────────
// Extends the same BLWrappedDB database with version 2, adding annual stores.

import type { AnnualActivityData, AnnualWrappedSnapshot, YearKey } from '@/types/annualWrapped';
import { emptyAnnualActivityData } from '@/types/annualWrapped';

const WRAPPED_DB_NAME    = 'BLWrappedDB';
const WRAPPED_DB_VERSION = 2;
const ACTIVITY_STORE     = 'monthlyActivity';
const SNAPSHOT_STORE     = 'wrappedSnapshots';
const ANNUAL_ACTIVITY_STORE = 'annualActivity';
const ANNUAL_SNAPSHOT_STORE = 'annualSnapshots';

// ── DB open / upgrade ─────────────────────────────────────────────────────────

function openWrappedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(WRAPPED_DB_NAME, WRAPPED_DB_VERSION);
    req.onerror = () => reject(new Error(`BLWrappedDB open failed: ${req.error?.message}`));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (ev) => {
      const db = (ev.target as IDBOpenDBRequest).result;
      // v1 stores
      if (!db.objectStoreNames.contains(ACTIVITY_STORE)) {
        db.createObjectStore(ACTIVITY_STORE);
      }
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        db.createObjectStore(SNAPSHOT_STORE);
      }
      // v2 stores — annual
      if (!db.objectStoreNames.contains(ANNUAL_ACTIVITY_STORE)) {
        db.createObjectStore(ANNUAL_ACTIVITY_STORE);
      }
      if (!db.objectStoreNames.contains(ANNUAL_SNAPSHOT_STORE)) {
        db.createObjectStore(ANNUAL_SNAPSHOT_STORE);
      }
    };
  });
}

// ── Annual Activity (current-year live data) ──────────────────────────────────

export async function loadAnnualActivity(year: YearKey): Promise<AnnualActivityData> {
  try {
    const db = await openWrappedDB();
    return new Promise((resolve) => {
      const tx  = db.transaction([ANNUAL_ACTIVITY_STORE], 'readonly');
      const req = tx.objectStore(ANNUAL_ACTIVITY_STORE).get(year);
      req.onsuccess = () => {
        db.close();
        resolve(req.result ? (req.result as AnnualActivityData) : emptyAnnualActivityData(year));
      };
      req.onerror = () => { db.close(); resolve(emptyAnnualActivityData(year)); };
    });
  } catch {
    return emptyAnnualActivityData(year);
  }
}

export async function saveAnnualActivity(data: AnnualActivityData): Promise<void> {
  try {
    const db = await openWrappedDB();
    await new Promise<void>((resolve) => {
      const tx  = db.transaction([ANNUAL_ACTIVITY_STORE], 'readwrite');
      const req = tx.objectStore(ANNUAL_ACTIVITY_STORE).put({ ...data, updatedAt: Date.now() }, data.year);
      req.onsuccess = () => { db.close(); resolve(); };
      req.onerror  = () => { db.close(); resolve(); };
    });
  } catch { /* silently continue */ }
}

// ── Annual Snapshots (immutable historical records) ───────────────────────────

export async function loadAllAnnualSnapshots(): Promise<AnnualWrappedSnapshot[]> {
  try {
    const db = await openWrappedDB();
    return new Promise((resolve) => {
      const tx    = db.transaction([ANNUAL_SNAPSHOT_STORE], 'readonly');
      const store = tx.objectStore(ANNUAL_SNAPSHOT_STORE);
      const req   = store.getAll();
      req.onsuccess = () => {
        db.close();
        const all = (req.result || []) as AnnualWrappedSnapshot[];
        // We need to extract keys since we use numeric year keys
        const allWithKeys = all.map((snap, idx) => {
          if (snap.year !== undefined) return snap;
          // Fallback: use index-based year if missing
          return { ...snap, year: new Date().getFullYear() - idx };
        });
        allWithKeys.sort((a, b) => b.year - a.year);
        resolve(allWithKeys);
      };
      req.onerror = () => { db.close(); resolve([]); };
    });
  } catch {
    return [];
  }
}

export async function loadAnnualSnapshot(year: YearKey): Promise<AnnualWrappedSnapshot | null> {
  try {
    const db = await openWrappedDB();
    return new Promise((resolve) => {
      const tx  = db.transaction([ANNUAL_SNAPSHOT_STORE], 'readonly');
      const req = tx.objectStore(ANNUAL_SNAPSHOT_STORE).get(year);
      req.onsuccess = () => { db.close(); resolve(req.result ?? null); };
      req.onerror  = () => { db.close(); resolve(null); };
    });
  } catch {
    return null;
  }
}

/**
 * Save an annual snapshot only if one does not already exist for that year.
 * Returns true if saved, false if a snapshot already existed (data integrity).
 */
export async function saveAnnualSnapshotOnce(snapshot: AnnualWrappedSnapshot): Promise<boolean> {
  try {
    const db = await openWrappedDB();
    return new Promise((resolve) => {
      const tx    = db.transaction([ANNUAL_SNAPSHOT_STORE], 'readwrite');
      const store = tx.objectStore(ANNUAL_SNAPSHOT_STORE);
      const checkReq = store.get(snapshot.year);
      checkReq.onsuccess = () => {
        if (checkReq.result) {
          db.close();
          resolve(false);
          return;
        }
        const putReq = store.put(snapshot, snapshot.year);
        putReq.onsuccess = () => { db.close(); resolve(true); };
        putReq.onerror   = () => { db.close(); resolve(false); };
      };
      checkReq.onerror = () => { db.close(); resolve(false); };
    });
  } catch {
    return false;
  }
}

export async function markAnnualSnapshotViewed(year: YearKey): Promise<void> {
  try {
    const db = await openWrappedDB();
    await new Promise<void>((resolve) => {
      const tx    = db.transaction([ANNUAL_SNAPSHOT_STORE], 'readwrite');
      const store = tx.objectStore(ANNUAL_SNAPSHOT_STORE);
      const req   = store.get(year);
      req.onsuccess = () => {
        const snap = req.result as AnnualWrappedSnapshot | undefined;
        if (snap && !snap.isViewed) {
          store.put({ ...snap, isViewed: true }, year);
        }
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror    = () => { db.close(); resolve(); };
      };
      req.onerror = () => { db.close(); resolve(); };
    });
  } catch { /* silently continue */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the current calendar year */
export function currentYear(): YearKey {
  return new Date().getFullYear();
}

/** Returns every year between startYear (inclusive) and endYear (exclusive) */
export function yearsBetween(startYear: YearKey, endYear: YearKey): YearKey[] {
  const result: YearKey[] = [];
  for (let y = startYear; y < endYear; y++) {
    result.push(y);
  }
  return result;
}
