import { useState, useCallback } from 'react';
import type { AppState, StorageResult } from '@/types';

const DB_NAME = 'BLWatchlistDB';
const DB_VERSION = 1;
const STORE_NAME = 'appState';
const KEY_NAME = 'bl-watchlist-data';
const DATA_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(new Error(`Failed to open IndexedDB: ${request.error?.message || 'Unknown error'}`));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function saveToIndexedDB(state: AppState): Promise<StorageResult> {
  try {
    const db = await openDB();
    return new Promise((resolve, _reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Check size before saving
      const jsonString = JSON.stringify({ version: DATA_VERSION, data: state });
      const sizeMB = jsonString.length / (1024 * 1024);
      
      if (sizeMB > 50) {
        resolve({
          success: false,
          message: `Data too large (${sizeMB.toFixed(1)} MB)`,
          details: `The watchlist data (${sizeMB.toFixed(1)} MB) exceeds IndexedDB's typical 50MB limit. Try removing some poster images or entries.`,
          error: 'QUOTA_EXCEEDED'
        });
        db.close();
        return;
      }
      
      const request = store.put({ version: DATA_VERSION, data: state, savedAt: Date.now() }, KEY_NAME);
      
      request.onsuccess = () => {
        db.close();
        resolve({
          success: true,
          message: 'All data saved successfully.',
          details: `Saved ${state.entries.length} entries, ${state.favorites.length} favorites, ${state.top10Drawers.length} top-10 drawers (${sizeMB.toFixed(1)} MB). IndexedDB has much higher limits than localStorage (typically 50MB+).`
        });
      };
      
      request.onerror = () => {
        db.close();
        const errorMsg = request.error?.message || 'Unknown error';
        let details = `IndexedDB write failed: ${errorMsg}`;
        if (errorMsg.includes('quota') || errorMsg.includes('Quota')) {
          details = 'Your browser storage is full. Try clearing some data or reducing the number of entries with poster images.';
        }
        resolve({
          success: false,
          message: 'Save failed - IndexedDB write error',
          details,
          error: errorMsg
        });
      };
      
      transaction.onerror = () => {
        db.close();
        resolve({
          success: false,
          message: 'Save failed - Transaction error',
          details: `IndexedDB transaction failed: ${transaction.error?.message || 'Unknown error'}. This may indicate the storage quota has been exceeded.`,
          error: transaction.error?.message
        });
      };
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: 'Save failed - Could not open IndexedDB',
      details: `Failed to open IndexedDB: ${errorMsg}. This may happen in private browsing mode or if your browser has disabled storage access.`,
      error: errorMsg
    };
  }
}

export async function loadFromIndexedDB(): Promise<AppState | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, _reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(KEY_NAME);
      
      request.onsuccess = () => {
        db.close();
        const result = request.result;
        if (result && result.version === DATA_VERSION && result.data) {
          resolve(result.data as AppState);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        db.close();
        console.warn('Failed to read from IndexedDB:', request.error);
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('Failed to open IndexedDB for reading:', err);
    return null;
  }
}

export async function clearIndexedDB(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, _reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(KEY_NAME);
      request.onsuccess = () => { db.close(); resolve(); };
      request.onerror = () => { db.close(); throw request.error; };
    });
  } catch {
    // Silently fail
  }
}

// Check storage usage
export async function getStorageInfo(): Promise<{ usage: number; quota: number } | null> {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
  } catch {
    // Not supported
  }
  return null;
}

export function useStorage() {
  const [lastResult, setLastResult] = useState<StorageResult | null>(null);
  
  const save = useCallback(async (state: AppState): Promise<StorageResult> => {
    const result = await saveToIndexedDB(state);
    setLastResult(result);
    return result;
  }, []);
  
  const load = useCallback(async (): Promise<AppState | null> => {
    return loadFromIndexedDB();
  }, []);
  
  return { save, load, lastResult, clear: clearIndexedDB };
}
