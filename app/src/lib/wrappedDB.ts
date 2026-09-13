// ── BL Wrapped — Dedicated IndexedDB store ───────────────────────────────────
// Uses a SEPARATE database (BLWrappedDB) so there is zero risk of corrupting
// the main app data, and so versioning is independent.

import type {
  MonthlyActivityData,
  MonthlyWrappedSnapshot,
  MonthKey,
  AnnualActivityData,
  AnnualWrappedSnapshot,
} from '@/types/wrapped';
import { emptyActivityData, emptyAnnualActivityData } from '@/types/wrapped';

const WRAPPED_DB_NAME    = 'BLWrappedDB';
const WRAPPED_DB_VERSION = 2;
const ACTIVITY_STORE     = 'monthlyActivity';   // live tracking, keyed by "YYYY-MM"
const SNAPSHOT_STORE     = 'wrappedSnapshots';  // permanent history, keyed by "YYYY-MM"
const ANNUAL_ACTIVITY_STORE = 'annualActivity'; // live yearly tracking, keyed by year
const ANNUAL_SNAPSHOT_STORE = 'annualSnapshots'; // permanent history, keyed by year

// ── DB open / upgrade ─────────────────────────────────────────────────────────

function openWrappedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(WRAPPED_DB_NAME, WRAPPED_DB_VERSION);
    req.onerror = () => reject(new Error(`BLWrappedDB open failed: ${req.error?.message}`));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (ev) => {
      const db = (ev.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(ACTIVITY_STORE)) {
        db.createObjectStore(ACTIVITY_STORE);
      }
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        db.createObjectStore(SNAPSHOT_STORE);
      }
      if (!db.objectStoreNames.contains(ANNUAL_ACTIVITY_STORE)) {
        db.createObjectStore(ANNUAL_ACTIVITY_STORE);
      }
      if (!db.objectStoreNames.contains(ANNUAL_SNAPSHOT_STORE)) {
        db.createObjectStore(ANNUAL_SNAPSHOT_STORE);
      }
    };
  });
}

// ── Activity (current-month live data) ───────────────────────────────────────

export async function loadMonthlyActivity(month: MonthKey): Promise<MonthlyActivityData> {
  try {
    const db = await openWrappedDB();
    return new Promise((resolve) => {
      const tx  = db.transaction([ACTIVITY_STORE], 'readonly');
      const req = tx.objectStore(ACTIVITY_STORE).get(month);
      req.onsuccess = () => {
        db.close();
        resolve(req.result ? (req.result as MonthlyActivityData) : emptyActivityData(month));
      };
      req.onerror = () => { db.close(); resolve(emptyActivityData(month)); };
    });
  } catch {
    return emptyActivityData(month);
  }
}

export async function saveMonthlyActivity(data: MonthlyActivityData): Promise<void> {
  try {
    const db = await openWrappedDB();
    await new Promise<void>((resolve) => {
      const tx  = db.transaction([ACTIVITY_STORE], 'readwrite');
      const req = tx.objectStore(ACTIVITY_STORE).put({ ...data, updatedAt: Date.now() }, data.month);
      req.onsuccess = () => { db.close(); resolve(); };
      req.onerror  = () => { db.close(); resolve(); };
    });
  } catch { /* silently continue */ }
}

// ── Snapshots (immutable historical records) ──────────────────────────────────

export async function loadAllSnapshots(): Promise<MonthlyWrappedSnapshot[]> {
  try {
    const db = await openWrappedDB();
    return new Promise((resolve) => {
      const tx    = db.transaction([SNAPSHOT_STORE], 'readonly');
      const store = tx.objectStore(SNAPSHOT_STORE);
      const req   = store.getAll();
      req.onsuccess = () => {
        db.close();
        const all = (req.result || []) as MonthlyWrappedSnapshot[];
        // Sort newest first
        all.sort((a, b) => b.month.localeCompare(a.month));
        resolve(all);
      };
      req.onerror = () => { db.close(); resolve([]); };
    });
  } catch {
    return [];
  }
}

export async function loadSnapshot(month: MonthKey): Promise<MonthlyWrappedSnapshot | null> {
  try {
    const db = await openWrappedDB();
    return new Promise((resolve) => {
      const tx  = db.transaction([SNAPSHOT_STORE], 'readonly');
      const req = tx.objectStore(SNAPSHOT_STORE).get(month);
      req.onsuccess = () => { db.close(); resolve(req.result ?? null); };
      req.onerror  = () => { db.close(); resolve(null); };
    });
  } catch {
    return null;
  }
}

/**
 * Save a snapshot only if one does not already exist for that month.
 * Returns true if saved, false if a snapshot already existed (data integrity).
 */
export async function saveSnapshotOnce(snapshot: MonthlyWrappedSnapshot): Promise<boolean> {
  try {
    const db = await openWrappedDB();
    return new Promise((resolve) => {
      const tx    = db.transaction([SNAPSHOT_STORE], 'readwrite');
      const store = tx.objectStore(SNAPSHOT_STORE);
      // Check existence first
      const checkReq = store.get(snapshot.month);
      checkReq.onsuccess = () => {
        if (checkReq.result) {
          db.close();
          resolve(false); // already exists — do nothing
          return;
        }
        const putReq = store.put(snapshot, snapshot.month);
        putReq.onsuccess = () => { db.close(); resolve(true); };
        putReq.onerror   = () => { db.close(); resolve(false); };
      };
      checkReq.onerror = () => { db.close(); resolve(false); };
    });
  } catch {
    return false;
  }
}

export async function markSnapshotViewed(month: MonthKey): Promise<void> {
  try {
    const db = await openWrappedDB();
    await new Promise<void>((resolve) => {
      const tx    = db.transaction([SNAPSHOT_STORE], 'readwrite');
      const store = tx.objectStore(SNAPSHOT_STORE);
      const req   = store.get(month);
      req.onsuccess = () => {
        const snap = req.result as MonthlyWrappedSnapshot | undefined;
        if (snap && !snap.isViewed) {
          store.put({ ...snap, isViewed: true }, month);
        }
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror    = () => { db.close(); resolve(); };
      };
      req.onerror = () => { db.close(); resolve(); };
    });
  } catch { /* silently continue */ }
}

// ── Annual activity ───────────────────────────────────────────────────────────

export async function loadAnnualActivity(year: number): Promise<AnnualActivityData> {
  try {
    const db = await openWrappedDB();
    return new Promise((resolve) => {
      const tx = db.transaction([ANNUAL_ACTIVITY_STORE], 'readonly');
      const req = tx.objectStore(ANNUAL_ACTIVITY_STORE).get(year);
      req.onsuccess = () => {
        db.close();
        resolve(req.result
          ? { ...emptyAnnualActivityData(year), ...(req.result as AnnualActivityData), year }
          : emptyAnnualActivityData(year));
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
      const tx = db.transaction([ANNUAL_ACTIVITY_STORE], 'readwrite');
      const req = tx.objectStore(ANNUAL_ACTIVITY_STORE).put(
        { ...data, updatedAt: Date.now() },
        data.year,
      );
      req.onsuccess = () => { db.close(); resolve(); };
      req.onerror = () => { db.close(); resolve(); };
    });
  } catch { /* tracking must never interrupt the app */ }
}

export async function loadAllAnnualSnapshots(): Promise<AnnualWrappedSnapshot[]> {
  try {
    const db = await openWrappedDB();
    return new Promise((resolve) => {
      const tx = db.transaction([ANNUAL_SNAPSHOT_STORE], 'readonly');
      const req = tx.objectStore(ANNUAL_SNAPSHOT_STORE).getAll();
      req.onsuccess = () => {
        db.close();
        const all = (req.result || []) as AnnualWrappedSnapshot[];
        all.sort((a, b) => b.year - a.year);
        resolve(all);
      };
      req.onerror = () => { db.close(); resolve([]); };
    });
  } catch {
    return [];
  }
}

export async function saveAnnualSnapshotOnce(snapshot: AnnualWrappedSnapshot): Promise<boolean> {
  try {
    const db = await openWrappedDB();
    return new Promise((resolve) => {
      const tx = db.transaction([ANNUAL_SNAPSHOT_STORE], 'readwrite');
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
        putReq.onerror = () => { db.close(); resolve(false); };
      };
      checkReq.onerror = () => { db.close(); resolve(false); };
    });
  } catch {
    return false;
  }
}

export async function markAnnualSnapshotViewed(year: number): Promise<void> {
  try {
    const db = await openWrappedDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction([ANNUAL_SNAPSHOT_STORE], 'readwrite');
      const store = tx.objectStore(ANNUAL_SNAPSHOT_STORE);
      const req = store.get(year);
      req.onsuccess = () => {
        const snap = req.result as AnnualWrappedSnapshot | undefined;
        if (snap && !snap.isViewed) store.put({ ...snap, isViewed: true }, year);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); resolve(); };
      };
      req.onerror = () => { db.close(); resolve(); };
    });
  } catch { /* silently continue */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns "YYYY-MM" for today */
export function currentMonthKey(): MonthKey {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function currentYear(): number {
  return new Date().getFullYear();
}

/** Returns every "YYYY-MM" key between startMonth (inclusive) and endMonth (exclusive) */
export function monthKeysBetween(startMonth: MonthKey, endMonth: MonthKey): MonthKey[] {
  const result: MonthKey[] = [];
  let [y, m] = startMonth.split('-').map(Number);
  const [ey, em] = endMonth.split('-').map(Number);
  while (y < ey || (y === ey && m < em)) {
    result.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return result;
}

/** Human-readable month name from "YYYY-MM" */
export function monthKeyToLabel(month: MonthKey): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function monthKeyToMonthName(month: MonthKey): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long' });
}
