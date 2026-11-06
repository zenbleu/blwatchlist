import type { BlPairingRecord } from '@/types/pairing';

export const PAIRINGS_STORAGE_KEY = 'bl_watchlist_pairings_v1';
export const TITLE_CP_STORAGE_KEY = 'bl_watchlist_title_cp_partners_v1';
export const DISMISSED_PAIRINGS_STORAGE_KEY = 'bl_watchlist_dismissed_pairings_v1';

export const PAIRINGS_UPDATED_EVENT = 'bl_watchlist_pairings_updated';
export const TITLE_CP_UPDATED_EVENT = 'bl_watchlist_title_cp_updated';

export function makePairingId(id1: string, id2: string): string {
  const [a, b] = [id1, id2].sort();
  return `cp_${a}_${b}`;
}

export function makeTitleActorKey(entryId: string, actorId: string): string {
  return `${entryId}_${actorId}`;
}

export function loadStoredPairings(): Record<string, BlPairingRecord> {
  try {
    const raw = localStorage.getItem(PAIRINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredPairings(pairings: Record<string, BlPairingRecord>) {
  try {
    localStorage.setItem(PAIRINGS_STORAGE_KEY, JSON.stringify(pairings));
    window.dispatchEvent(new CustomEvent(PAIRINGS_UPDATED_EVENT, { detail: pairings }));
  } catch {
    // ignore storage write errors
  }
}

export function loadTitleCpPartners(): Record<string, string> {
  try {
    const raw = localStorage.getItem(TITLE_CP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveTitleCpPartners(map: Record<string, string>) {
  try {
    localStorage.setItem(TITLE_CP_STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent(TITLE_CP_UPDATED_EVENT, { detail: map }));
  } catch {
    // ignore
  }
}

export function setTitleCpPartner(entryId: string, actor1Id: string, actor2Id: string | null) {
  const current = loadTitleCpPartners();
  const next = { ...current };

  const key1 = makeTitleActorKey(entryId, actor1Id);
  const oldPartner = next[key1];

  if (oldPartner && oldPartner !== actor2Id) {
    delete next[makeTitleActorKey(entryId, oldPartner)];
  }

  if (actor2Id) {
    const key2 = makeTitleActorKey(entryId, actor2Id);
    next[key1] = actor2Id;
    next[key2] = actor1Id;

    // Automatically make sure a pairing record exists between them
    const stored = loadStoredPairings();
    const pairId = makePairingId(actor1Id, actor2Id);
    if (!stored[pairId]) {
      stored[pairId] = {
        id: pairId,
        actor1Id,
        actor2Id,
        isFavorite: false,
        createdAt: Date.now(),
      };
      saveStoredPairings(stored);
    }
  } else {
    delete next[key1];
  }

  saveTitleCpPartners(next);
}

export function loadDismissedPairings(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_PAIRINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDismissedPairings(ids: string[]) {
  try {
    localStorage.setItem(DISMISSED_PAIRINGS_STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(PAIRINGS_UPDATED_EVENT));
  } catch {
    // ignore
  }
}
