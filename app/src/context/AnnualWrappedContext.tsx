// ── Annual BL Wrapped — React Context ────────────────────────────────────────
// Handles: auto-generating missed annual snapshots, surfacing pending wraps,
// managing the active viewing session, and providing history access.
// Separate from the monthly WrappedContext but follows the same patterns.

import React, {
  createContext, useContext, useEffect, useState, useCallback, useRef,
} from 'react';
import { useApp } from '@/context/AppContext';
import type { AnnualWrappedSnapshot, AnnualWrappedContextValue, YearKey } from '@/types/annualWrapped';
import {
  loadAllAnnualSnapshots,
  loadAnnualActivity,
  saveAnnualSnapshotOnce,
  markAnnualSnapshotViewed,
  currentYear,
  yearsBetween,
} from '@/lib/annualWrappedDB';
import { generateAnnualSnapshot } from '@/lib/annualWrappedEngine';

const START_YEAR_KEY = 'bl-wrapped-start-year';

function getOrInitStartYear(): YearKey {
  const stored = localStorage.getItem(START_YEAR_KEY);
  if (stored && /^\d{4}$/.test(stored)) return parseInt(stored, 10);
  const now = currentYear();
  localStorage.setItem(START_YEAR_KEY, String(now));
  return now;
}

const AnnualWrappedContext = createContext<AnnualWrappedContextValue | null>(null);

export function AnnualWrappedProvider({ children }: { children: React.ReactNode }) {
  const { state, isLoaded } = useApp();
  const [annualSnapshots, setAnnualSnapshots] = useState<AnnualWrappedSnapshot[]>([]);
  const [pendingAnnualSnapshot, setPendingAnnualSnapshot] = useState<AnnualWrappedSnapshot | null>(null);
  const [activeAnnualSnapshot, setActiveAnnualSnapshot] = useState<AnnualWrappedSnapshot | null>(null);
  const [annualHistoryOpen, setAnnualHistoryOpen] = useState(false);
  const [isAnnualReady, setIsAnnualReady] = useState(false);
  const initialized = useRef(false);

  // ── Generate missing annual snapshots for past years ────────────────────────
  useEffect(() => {
    if (!isLoaded || initialized.current) return;
    initialized.current = true;

    (async () => {
      const startYear  = getOrInitStartYear();
      const thisYear   = currentYear();

      // All past years (not including the current year, which is still in progress)
      const pastYears  = yearsBetween(startYear, thisYear);

      // Fetch existing annual snapshots
      const existing    = await loadAllAnnualSnapshots();
      const existingSet = new Set(existing.map(s => s.year));

      // Collect current stats for snapshot generation
      const currentCollectionSize = state.entries.length;
      const currentCompletedCount = state.entries.filter(e => e.status === 'COMPLETE').length;

      const newSnapshots: AnnualWrappedSnapshot[] = [];

      for (const year of pastYears) {
        if (existingSet.has(year)) continue;

        const activity = await loadAnnualActivity(year);
        const snap = generateAnnualSnapshot(activity, currentCollectionSize, currentCompletedCount);
        const saved = await saveAnnualSnapshotOnce(snap);
        if (saved) newSnapshots.push(snap);
      }

      const allSnaps = [...existing, ...newSnapshots].sort((a, b) => b.year - a.year);

      setAnnualSnapshots(allSnaps);

      // Surface first unviewed snapshot
      const firstPending = allSnaps.find(s => !s.isViewed) ?? null;
      setPendingAnnualSnapshot(firstPending);

      setIsAnnualReady(true);
    })();
  }, [isLoaded, state.entries]);

  // ── Public API ────────────────────────────────────────────────────────────────

  const viewAnnualSnapshot = useCallback((snapshot: AnnualWrappedSnapshot) => {
    setActiveAnnualSnapshot(snapshot);
    setAnnualHistoryOpen(false);
  }, []);

  const dismissAnnualPresentation = useCallback(async () => {
    if (activeAnnualSnapshot) {
      await markAnnualSnapshotViewed(activeAnnualSnapshot.year);
      setAnnualSnapshots(prev =>
        prev.map(s => s.year === activeAnnualSnapshot.year ? { ...s, isViewed: true } : s),
      );
      setPendingAnnualSnapshot(prev =>
        prev?.year === activeAnnualSnapshot.year ? null : prev,
      );
    }
    setActiveAnnualSnapshot(null);
  }, [activeAnnualSnapshot]);

  const openAnnualHistory = useCallback(() => setAnnualHistoryOpen(true), []);
  const closeAnnualHistory = useCallback(() => setAnnualHistoryOpen(false), []);

  const replayAnnualSnapshot = useCallback((year: YearKey) => {
    const snap = annualSnapshots.find(s => s.year === year);
    if (snap) viewAnnualSnapshot(snap);
  }, [annualSnapshots, viewAnnualSnapshot]);

  return (
    <AnnualWrappedContext.Provider value={{
      annualSnapshots,
      pendingAnnualSnapshot,
      activeAnnualSnapshot,
      annualHistoryOpen,
      isAnnualReady,
      viewAnnualSnapshot,
      dismissAnnualPresentation,
      openAnnualHistory,
      closeAnnualHistory,
      replayAnnualSnapshot,
    }}>
      {children}
    </AnnualWrappedContext.Provider>
  );
}

export function useAnnualWrapped(): AnnualWrappedContextValue {
  const ctx = useContext(AnnualWrappedContext);
  if (!ctx) throw new Error('useAnnualWrapped must be used within AnnualWrappedProvider');
  return ctx;
}
