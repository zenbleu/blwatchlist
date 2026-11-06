import { useState, useEffect, useCallback } from 'react';
import type { Shelf } from '@/types';

export const SHELVES_STORAGE_KEY = 'bl_watchlist_custom_shelves_v1';
const SHELVES_EVENT_KEY = 'bl_watchlist_shelves_updated';

export const DEFAULT_SHELVES: Shelf[] = [
  {
    id: 'shelf_comfort_watches',
    name: 'Comfort Watches',
    description: 'Sweet, feel-good, low-angst favorites to rewatch anytime',
    emoji: '🛋️',
    color: '#FF6B35',
    entryIds: [],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    isDefaultPreset: true,
  },
  {
    id: 'shelf_high_stakes',
    name: 'High Stakes',
    description: 'Intense drama, mafia, thrillers, angst, and heart-pounding tension',
    emoji: '⚡',
    color: '#E50914',
    entryIds: [],
    createdAt: 1700000001000,
    updatedAt: 1700000001000,
    isDefaultPreset: true,
  },
  {
    id: 'shelf_must_watch',
    name: 'Must Watch',
    description: 'The definitive BL masterpieces and cultural cornerstones',
    emoji: '🔥',
    color: '#F59E0B',
    entryIds: [],
    createdAt: 1700000002000,
    updatedAt: 1700000002000,
    isDefaultPreset: true,
  },
];

export const SHELF_PRESET_IDEAS: { name: string; description: string; emoji: string; color: string }[] = [
  { name: 'Comfort Watches', description: 'Sweet, feel-good, low-angst favorites', emoji: '🛋️', color: '#FF6B35' },
  { name: 'High Stakes', description: 'Intense drama, mafia, thrillers, and action', emoji: '⚡', color: '#E50914' },
  { name: 'Must Watch', description: 'Essential BL masterpieces everyone should see', emoji: '🔥', color: '#F59E0B' },
  { name: 'Tear-Jerkers & Angst', description: 'Emotional rollercoasters that made me sob', emoji: '😭', color: '#8B5CF6' },
  { name: 'Top Tier Chemistry', description: 'Unbelievable lead couple chemistry and sparks', emoji: '✨', color: '#EC4899' },
  { name: 'Fluffy Rom-Com', description: 'Zero stress, sweet banter, and happy endings', emoji: '🍬', color: '#10B981' },
  { name: 'Office Romance', description: 'Boss-employee, coworker dynamics, and suit aesthetics', emoji: '💼', color: '#0EA5E9' },
  { name: 'Historical & Costume', description: 'Wuxia, period dramas, time-slip, and supernatural', emoji: '🗡️', color: '#A855F7' },
  { name: 'College / School Life', description: 'Campus romance, engineering gear, and first loves', emoji: '🎒', color: '#06B6D4' },
  { name: 'Late Night Binge', description: 'Series so addicting you stayed up until 4 AM', emoji: '🌙', color: '#6366F1' },
];

function loadShelvesFromStorage(): Shelf[] {
  try {
    const raw = localStorage.getItem(SHELVES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_SHELVES;
}

function persistShelves(shelves: Shelf[]) {
  try {
    localStorage.setItem(SHELVES_STORAGE_KEY, JSON.stringify(shelves));
    window.dispatchEvent(new CustomEvent(SHELVES_EVENT_KEY, { detail: shelves }));
  } catch {
    // ignore
  }
}

export function useShelves() {
  const [shelves, setShelves] = useState<Shelf[]>(loadShelvesFromStorage);

  useEffect(() => {
    const handleSync = (event: Event) => {
      const customEvent = event as CustomEvent<Shelf[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setShelves(customEvent.detail);
      } else {
        setShelves(loadShelvesFromStorage());
      }
    };

    window.addEventListener(SHELVES_EVENT_KEY, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(SHELVES_EVENT_KEY, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const createShelf = useCallback((name: string, description?: string, emoji = '📁', color = '#E50914'): Shelf => {
    const newShelf: Shelf = {
      id: `shelf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      description: description?.trim(),
      emoji,
      color,
      entryIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setShelves((prev) => {
      const updated = [...prev, newShelf];
      persistShelves(updated);
      return updated;
    });

    return newShelf;
  }, []);

  const updateShelf = useCallback((shelfId: string, updates: Partial<Omit<Shelf, 'id' | 'createdAt'>>) => {
    setShelves((prev) => {
      const updated = prev.map((s) => {
        if (s.id === shelfId) {
          return {
            ...s,
            ...updates,
            updatedAt: Date.now(),
          };
        }
        return s;
      });
      persistShelves(updated);
      return updated;
    });
  }, []);

  const deleteShelf = useCallback((shelfId: string) => {
    setShelves((prev) => {
      const updated = prev.filter((s) => s.id !== shelfId);
      persistShelves(updated);
      return updated;
    });
  }, []);

  const addEntryToShelf = useCallback((shelfId: string, entryId: string) => {
    setShelves((prev) => {
      const updated = prev.map((s) => {
        if (s.id === shelfId && !s.entryIds.includes(entryId)) {
          return {
            ...s,
            entryIds: [...s.entryIds, entryId],
            updatedAt: Date.now(),
          };
        }
        return s;
      });
      persistShelves(updated);
      return updated;
    });
  }, []);

  const removeEntryFromShelf = useCallback((shelfId: string, entryId: string) => {
    setShelves((prev) => {
      const updated = prev.map((s) => {
        if (s.id === shelfId) {
          return {
            ...s,
            entryIds: s.entryIds.filter((id) => id !== entryId),
            updatedAt: Date.now(),
          };
        }
        return s;
      });
      persistShelves(updated);
      return updated;
    });
  }, []);

  const toggleEntryOnShelf = useCallback((shelfId: string, entryId: string) => {
    setShelves((prev) => {
      const updated = prev.map((s) => {
        if (s.id === shelfId) {
          const exists = s.entryIds.includes(entryId);
          const nextEntryIds = exists
            ? s.entryIds.filter((id) => id !== entryId)
            : [...s.entryIds, entryId];
          return {
            ...s,
            entryIds: nextEntryIds,
            updatedAt: Date.now(),
          };
        }
        return s;
      });
      persistShelves(updated);
      return updated;
    });
  }, []);

  const isEntryOnShelf = useCallback((shelfId: string, entryId: string) => {
    const target = shelves.find((s) => s.id === shelfId);
    return target ? target.entryIds.includes(entryId) : false;
  }, [shelves]);

  const getShelvesForEntry = useCallback((entryId: string): Shelf[] => {
    return shelves.filter((s) => s.entryIds.includes(entryId));
  }, [shelves]);

  const reorderShelfEntries = useCallback((shelfId: string, entryIds: string[]) => {
    setShelves((prev) => {
      const updated = prev.map((s) => {
        if (s.id === shelfId) {
          return {
            ...s,
            entryIds,
            updatedAt: Date.now(),
          };
        }
        return s;
      });
      persistShelves(updated);
      return updated;
    });
  }, []);

  const clearShelf = useCallback((shelfId: string) => {
    setShelves((prev) => {
      const updated = prev.map((s) => {
        if (s.id === shelfId) {
          return {
            ...s,
            entryIds: [],
            updatedAt: Date.now(),
          };
        }
        return s;
      });
      persistShelves(updated);
      return updated;
    });
  }, []);

  return {
    shelves,
    createShelf,
    updateShelf,
    deleteShelf,
    addEntryToShelf,
    removeEntryFromShelf,
    toggleEntryOnShelf,
    isEntryOnShelf,
    getShelvesForEntry,
    reorderShelfEntries,
    clearShelf,
  };
}
