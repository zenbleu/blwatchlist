// ── Monthly BL Wrapped — React Context ───────────────────────────────────────
// Handles: auto-generating missed snapshots, surfacing pending wraps,
// managing the active viewing session, and providing history access.

import React, {
  createContext, useContext, useEffect, useState, useCallback, useRef,
} from 'react';
import { useApp } from '@/context/AppContext';
import type { MonthlyWrappedSnapshot, WrappedContextValue, MonthKey } from '@/types/wrapped';
import {
  loadAllSnapshots,
  loadMonthlyActivity,
  saveSnapshotOnce,
  markSnapshotViewed,
  currentMonthKey,
  monthKeysBetween,
} from '@/lib/wrappedDB';
import { generateSnapshot } from '@/lib/wrappedEngine';

// ── Storage key for "when did tracking begin" ─────────────────────────────────
const START_MONTH_KEY = 'bl-wrapped-start-month';

function getOrInitStartMonth(): MonthKey {
  const stored = localStorage.getItem(START_MONTH_KEY);
  if (stored && /^\d{4}-\d{2}$/.test(stored)) return stored;
  const now = currentMonthKey();
  localStorage.setItem(START_MONTH_KEY, now);
  return now;
}

// ── Context ───────────────────────────────────────────────────────────────────

const WrappedContext = createContext<WrappedContextValue | null>(null);

export function WrappedProvider({ children }: { children: React.ReactNode }) {
  const { state, isLoaded } = useApp();
  const [snapshots, setSnapshots] = useState<MonthlyWrappedSnapshot[]>([]);
  const [pendingSnapshot, setPendingSnapshot] = useState<MonthlyWrappedSnapshot | null>(null);
  const [activeSnapshot, setActiveSnapshot] = useState<MonthlyWrappedSnapshot | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const initialized = useRef(false);

  // ── Generate missing snapshots for past months ──────────────────────────────
  useEffect(() => {
    if (!isLoaded || initialized.current) return;
    initialized.current = true;

    (async () => {
      const startMonth  = getOrInitStartMonth();
      const thisMonth   = currentMonthKey();

      // All past months (not including the current month, which is still in progress)
      const pastMonths  = monthKeysBetween(startMonth, thisMonth);

      // Fetch existing snapshots
      const existing    = await loadAllSnapshots();
      const existingSet = new Set(existing.map(s => s.month));

      // Collect current stats for snapshot generation
      const currentCollectionSize = state.entries.length;
      const currentCompletedCount = state.entries.filter(e => e.status === 'COMPLETE').length;

      const newSnapshots: MonthlyWrappedSnapshot[] = [];

      for (const month of pastMonths) {
        if (existingSet.has(month)) continue; // already generated

        const activity = await loadMonthlyActivity(month);
        const snap = generateSnapshot(activity, currentCollectionSize, currentCompletedCount);
        const saved = await saveSnapshotOnce(snap);
        if (saved) newSnapshots.push(snap);
      }

      const allSnaps = [...existing, ...newSnapshots].sort(
        (a, b) => b.month.localeCompare(a.month),
      );

      setSnapshots(allSnaps);

      // Surface first unviewed snapshot
      const firstPending = allSnaps.find(s => !s.isViewed) ?? null;
      setPendingSnapshot(firstPending);

      setIsReady(true);
    })();
  }, [isLoaded, state.entries]);

  // ── Public API ────────────────────────────────────────────────────────────────

  const viewSnapshot = useCallback((snapshot: MonthlyWrappedSnapshot) => {
    setActiveSnapshot(snapshot);
    setHistoryOpen(false);
  }, []);

  const dismissPresentation = useCallback(async () => {
    if (activeSnapshot) {
      await markSnapshotViewed(activeSnapshot.month);
      // Update local state so the dot goes away
      setSnapshots(prev =>
        prev.map(s => s.month === activeSnapshot.month ? { ...s, isViewed: true } : s),
      );
      // Remove from pending queue
      setPendingSnapshot(prev =>
        prev?.month === activeSnapshot.month ? null : prev,
      );
    }
    setActiveSnapshot(null);
  }, [activeSnapshot]);

  const openHistory = useCallback(() => setHistoryOpen(true), []);
  const closeHistory = useCallback(() => setHistoryOpen(false), []);

  const replaySnapshot = useCallback((month: MonthKey) => {
    const snap = snapshots.find(s => s.month === month);
    if (snap) viewSnapshot(snap);
  }, [snapshots, viewSnapshot]);

  return (
    <WrappedContext.Provider value={{
      snapshots,
      pendingSnapshot,
      activeSnapshot,
      historyOpen,
      isReady,
      viewSnapshot,
      dismissPresentation,
      openHistory,
      closeHistory,
      replaySnapshot,
    }}>
      {children}
    </WrappedContext.Provider>
  );
}

export function useWrapped(): WrappedContextValue {
  const ctx = useContext(WrappedContext);
  if (!ctx) throw new Error('useWrapped must be used within WrappedProvider');
  return ctx;
}
