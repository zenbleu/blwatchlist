import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import type { TrackedEntry } from '@/types/wrapped';

interface WrappedPosterStackProps {
  entries: TrackedEntry[];
  accent: string;
  maxEntries?: number;
}

interface PosterEntry extends TrackedEntry {
  poster: string | null;
}

function PosterCard({ entry, accent, index, total }: {
  entry: PosterEntry;
  accent: string;
  index: number;
  total: number;
}) {
  const [hasError, setHasError] = useState(false);
  const offset = index - (total - 1) / 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.82 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.12 + index * 0.09, type: 'spring', stiffness: 180, damping: 18 }}
      className="absolute left-1/2 top-0 h-44 w-28 overflow-hidden rounded-xl border border-white/20 bg-white/10 shadow-2xl shadow-black/50"
      style={{
        zIndex: index + 1,
        left: `calc(50% + ${offset * 42}px)`,
        rotate: `${offset * 6}deg`,
        transformOrigin: 'bottom center',
        borderColor: `${accent}55`,
      }}
      aria-label={entry.title}
    >
      {entry.poster && !hasError ? (
        <img
          src={entry.poster}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center p-3 text-center text-xs font-bold text-white/80"
          style={{ background: `linear-gradient(145deg, ${accent}99, #111 75%)` }}
        >
          {entry.title}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-2 pb-2 pt-7">
        <p className="truncate text-left text-[10px] font-semibold text-white">{entry.title}</p>
      </div>
    </motion.div>
  );
}

export function WrappedPosterStack({ entries, accent, maxEntries = 4 }: WrappedPosterStackProps) {
  const { state } = useApp();
  const visibleEntries = entries.slice(0, maxEntries).map(entry => ({
    ...entry,
    poster: state.entries.find(sourceEntry => sourceEntry.id === entry.id)?.poster ?? null,
  }));
  if (visibleEntries.length === 0) return null;

  return (
    <div
      className="relative h-44 w-full max-w-[17rem]"
      aria-label={`${visibleEntries.length} title${visibleEntries.length === 1 ? '' : 's'}`}
    >
      {visibleEntries.map((entry, index) => (
        <PosterCard
          key={`${entry.id}-${entry.title}-${index}`}
          entry={entry}
          accent={accent}
          index={index}
          total={visibleEntries.length}
        />
      ))}
    </div>
  );
}