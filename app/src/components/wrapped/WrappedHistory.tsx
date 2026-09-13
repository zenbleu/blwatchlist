// ── Monthly BL Wrapped — History View ────────────────────────────────────────
// Full-screen sheet listing every generated Wrapped in reverse chronological order.

import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Clock } from 'lucide-react';
import { useWrapped } from '@/context/WrappedContext';
import { monthKeyToLabel } from '@/lib/wrappedDB';
import type { MonthlyWrappedSnapshot } from '@/types/wrapped';

function SnapshotCard({ snapshot, onReplay }: { snapshot: MonthlyWrappedSnapshot; onReplay: () => void }) {
  const d = snapshot.data;
  const totalActivity =
    d.completedTitles.length +
    d.statusCompletions.length +
    d.droppedTitles.length +
    d.ongoingStarted.length +
    d.favoritesAdded.length +
    d.ratingsGiven +
    d.top10Updates;

  const isQuiet = totalActivity === 0 && d.totalEntriesAdded === 0;
  const label = monthKeyToLabel(snapshot.month);

  // Build a short summary line
  const highlights: string[] = [];
  const allCompleted = d.completedTitles.length + d.statusCompletions.length;
  if (allCompleted > 0)          highlights.push(`${allCompleted} completed`);
  if (d.favoritesAdded.length > 0) highlights.push(`${d.favoritesAdded.length} fav${d.favoritesAdded.length > 1 ? 's' : ''}`);
  if (d.ratingsGiven > 0)        highlights.push(`${d.ratingsGiven} rated`);
  if (d.top10Updates > 0)        highlights.push(`${d.top10Updates} Top-10`);
  const summary = isQuiet ? 'Quiet month' : (highlights.slice(0, 3).join(' · ') || 'Activity logged');

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onReplay}
      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors text-left"
    >
      {/* Indicator dot */}
      <div className="relative shrink-0">
        <div
          className={`w-3 h-3 rounded-full ${snapshot.isViewed ? 'bg-white/20' : 'bg-[#E50914]'}`}
        />
        {!snapshot.isViewed && (
          <span className="absolute inset-0 rounded-full bg-[#E50914] animate-ping opacity-50" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm">{label}</span>
          {!snapshot.isViewed && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#E50914]/20 text-[#E50914]">NEW</span>
          )}
        </div>
        <div className="text-white/40 text-xs mt-0.5 truncate">{summary}</div>
      </div>

      {/* Play icon */}
      <div className="shrink-0 text-white/30">
        <Play size={16} />
      </div>
    </motion.button>
  );
}

export default function WrappedHistory() {
  const { snapshots, historyOpen, closeHistory, replaySnapshot } = useWrapped();

  const unviewed = snapshots.filter(s => !s.isViewed);
  const viewed   = snapshots.filter(s =>  s.isViewed);

  return (
    <AnimatePresence>
      {historyOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/70"
            onClick={closeHistory}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-[95] bg-[#111] rounded-t-2xl max-h-[85vh] flex flex-col"
          >
            {/* Handle */}
            <div className="flex items-center justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-white/10">
              <div>
                <h2 className="text-white font-bold text-lg">Wrapped History</h2>
                <p className="text-white/40 text-xs mt-0.5">
                  {snapshots.length} month{snapshots.length !== 1 ? 's' : ''} recorded
                </p>
              </div>
              <button
                onClick={closeHistory}
                className="p-2 rounded-full bg-white/10 hover:bg-white/15 transition-colors"
              >
                <X size={18} className="text-white/60" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 pb-8 pt-3">
              {snapshots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <Clock size={36} className="text-white/20" />
                  <p className="text-white/40 text-sm">
                    No Wrapped history yet.<br />
                    Your first summary will appear at the start of next month.
                  </p>
                </div>
              ) : (
                <>
                  {unviewed.length > 0 && (
                    <div className="mb-4">
                      <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-2 px-1">
                        New
                      </p>
                      <div className="flex flex-col gap-2">
                        {unviewed.map(snap => (
                          <SnapshotCard
                            key={snap.month}
                            snapshot={snap}
                            onReplay={() => replaySnapshot(snap.month)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {viewed.length > 0 && (
                    <div>
                      {unviewed.length > 0 && (
                        <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-2 px-1 mt-4">
                          Previous
                        </p>
                      )}
                      <div className="flex flex-col gap-2">
                        {viewed.map(snap => (
                          <SnapshotCard
                            key={snap.month}
                            snapshot={snap}
                            onReplay={() => replaySnapshot(snap.month)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
