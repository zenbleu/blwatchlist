import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Film, Tv } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatRating } from '@/lib/rating';
import type { AnnualTrackedEntry } from '@/types/wrapped';

export interface CarouselPosterEntry extends AnnualTrackedEntry {
  rating?: number;
  rank?: number;
}

interface AnnualWrappedPosterCarouselProps {
  entries: CarouselPosterEntry[];
  accent: string;
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  showRating?: boolean;
  showRank?: boolean;
  autoPlayMs?: number;
  paused?: boolean;
}

function useCompactViewport() {
  const [compact, setCompact] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return compact;
}

function CarouselCard({
  entry,
  poster,
  accent,
  offset,
  compact,
  showRating,
  showRank,
  onSelect,
}: {
  entry: CarouselPosterEntry;
  poster: string | null;
  accent: string;
  offset: number;
  compact: boolean;
  showRating?: boolean;
  showRank?: boolean;
  onSelect: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const absOffset = Math.abs(offset);
  const isCenter = offset === 0;

  const translateX = compact
    ? offset === 0 ? 0 : offset === -1 ? -58 : offset === 1 ? 58 : offset * 53
    : offset === 0 ? 0 : offset === -1 ? -78 : offset === 1 ? 78 : offset * 70;

  const scale = isCenter ? 1 : absOffset === 1 ? 0.85 : absOffset === 2 ? 0.72 : 0.6;
  const opacity = isCenter ? 1 : absOffset === 1 ? 0.92 : absOffset === 2 ? 0.74 : 0;
  const zIndex = isCenter ? 30 : absOffset === 1 ? 20 : absOffset === 2 ? 10 : 0;
  const filter = isCenter
    ? 'brightness(1) saturate(1.06)'
    : absOffset === 1
      ? 'brightness(0.68) saturate(0.45)'
      : 'brightness(0.46) saturate(0.25)';

  return (
    <motion.button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      initial={false}
      animate={{
        x: translateX,
        scale,
        opacity,
        filter,
      }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 28,
        mass: 0.9,
      }}
      style={{
        zIndex,
        marginLeft: compact ? '-74px' : '-90px',
        borderColor: isCenter ? `${accent}aa` : 'rgba(255,255,255,0.14)',
        boxShadow: isCenter
          ? `0 24px 52px -12px rgba(0,0,0,0.88), 0 0 36px -8px ${accent}55`
          : '0 14px 32px -10px rgba(0,0,0,0.8)',
      }}
      aria-label={`${entry.title}${isCenter ? ' (featured)' : ''}`}
      className={`absolute left-1/2 top-0 overflow-hidden rounded-2xl border bg-[#121212] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
        compact ? 'h-[214px] w-[148px]' : 'h-[262px] w-[180px]'
      } ${isCenter ? 'cursor-default' : 'cursor-pointer'}`}
    >
      {poster && !imgError ? (
        <img
          src={poster}
          alt={entry.title}
          referrerPolicy="no-referrer"
          draggable={false}
          className="h-full w-full select-none object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center"
          style={{
            background: `radial-gradient(circle at 30% 20%, ${accent}55, #141414 75%)`,
          }}
        >
          {entry.type === 'Movie' ? (
            <Film className="h-6 w-6 text-white/60" />
          ) : (
            <Tv className="h-6 w-6 text-white/60" />
          )}
          <span className="line-clamp-4 text-xs font-bold leading-snug text-white/90">
            {entry.title}
          </span>
        </div>
      )}

      {/* Measured contrast scrim (only needed over real poster photography) */}
      {poster && !imgError && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
      )}

      {/* Optional top rank / rating marker on the poster */}
      {isCenter && showRank && entry.rank != null && (
        <div
          className="pointer-events-none absolute left-2.5 top-2.5 rounded-md px-2 py-0.5 text-[11px] font-black tracking-wide text-black shadow-md"
          style={{ background: accent }}
        >
          #{entry.rank}
        </div>
      )}
      {isCenter && showRating && entry.rating != null && entry.rating > 0 && (
        <div
          className="pointer-events-none absolute right-2.5 top-2.5 rounded-md bg-black/75 px-2 py-0.5 text-[11px] font-extrabold tabular-nums text-white backdrop-blur-sm"
          style={{ border: `1px solid ${accent}66` }}
        >
          ★ {formatRating(entry.rating)}
        </div>
      )}

      {isCenter && poster && !imgError && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-2.5 pt-6">
          <p className="truncate text-xs font-bold text-white drop-shadow">{entry.title}</p>
          <p className="mt-0.5 truncate text-[10px] font-medium text-white/70">
            {entry.country} · {entry.type}
          </p>
        </div>
      )}
    </motion.button>
  );
}

export function AnnualWrappedPosterCarousel({
  entries,
  accent,
  activeIndex: controlledIndex,
  onActiveIndexChange,
  showRating = false,
  showRank = false,
  autoPlayMs = 3600,
  paused = false,
}: AnnualWrappedPosterCarouselProps) {
  const { state } = useApp();
  const compact = useCompactViewport();
  const prefersReducedMotion = useReducedMotion();

  const total = entries.length;
  const [internalVirtualIndex, setInternalVirtualIndex] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const resumeTimerRef = useRef<number | null>(null);

  const normalizedControlled =
    controlledIndex !== undefined && total > 0
      ? ((controlledIndex % total) + total) % total
      : undefined;

  const activeLogicalIndex =
    normalizedControlled !== undefined
      ? normalizedControlled
      : total > 0
        ? ((internalVirtualIndex % total) + total) % total
        : 0;

  // Keep virtualIndex aligned with controlledIndex using shortest path so slides glide cleanly
  const [controlledSync, setControlledSync] = useState(() => ({
    controlled: normalizedControlled,
    virtualIdx: normalizedControlled ?? 0,
  }));

  if (
    normalizedControlled !== undefined &&
    total > 0 &&
    controlledSync.controlled !== normalizedControlled
  ) {
    const currentMod = ((controlledSync.virtualIdx % total) + total) % total;
    let diff = normalizedControlled - currentMod;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    setControlledSync({
      controlled: normalizedControlled,
      virtualIdx: controlledSync.virtualIdx + diff,
    });
  }

  const virtualIndex =
    normalizedControlled !== undefined ? controlledSync.virtualIdx : internalVirtualIndex;

  const bumpInteractionPause = useCallback(() => {
    setIsInteracting(true);
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => {
      setIsInteracting(false);
    }, 4500);
  }, []);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    };
  }, []);

  const stepBy = useCallback(
    (delta: number) => {
      if (total <= 1 || delta === 0) return;
      bumpInteractionPause();
      if (normalizedControlled !== undefined) {
        const nextLogical = ((activeLogicalIndex + delta) % total + total) % total;
        onActiveIndexChange?.(nextLogical);
      } else {
        setInternalVirtualIndex((prev) => {
          const next = prev + delta;
          onActiveIndexChange?.(((next % total) + total) % total);
          return next;
        });
      }
    },
    [total, bumpInteractionPause, normalizedControlled, activeLogicalIndex, onActiveIndexChange],
  );

  const jumpToLogical = useCallback(
    (targetLogical: number) => {
      if (total <= 1) return;
      const target = ((targetLogical % total) + total) % total;
      if (target === activeLogicalIndex) return;
      let diff = target - activeLogicalIndex;
      if (diff > total / 2) diff -= total;
      if (diff < -total / 2) diff += total;
      stepBy(diff);
    },
    [total, activeLogicalIndex, stepBy],
  );

  // Auto-advance the infinite carousel smoothly when >1 entries and not paused
  useEffect(() => {
    if (total <= 1 || paused || isInteracting || prefersReducedMotion || autoPlayMs <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      if (normalizedControlled !== undefined) {
        onActiveIndexChange?.((activeLogicalIndex + 1) % total);
      } else {
        setInternalVirtualIndex((prev) => {
          const next = prev + 1;
          onActiveIndexChange?.(((next % total) + total) % total);
          return next;
        });
      }
    }, autoPlayMs);
    return () => window.clearInterval(timer);
  }, [
    total,
    paused,
    isInteracting,
    prefersReducedMotion,
    autoPlayMs,
    normalizedControlled,
    activeLogicalIndex,
    onActiveIndexChange,
  ]);

  if (total === 0) return null;

  const posterById = new Map(state.entries.map((entry) => [entry.id, entry.poster]));
  const activeEntry = entries[activeLogicalIndex];

  // Show 1 hero card when total === 1; 5 symmetric infinite coverflow slots when >= 2
  const slotOffsets = total === 1 ? [0] : [-3, -2, -1, 0, 1, 2, 3];

  return (
    <div
      className="flex w-full max-w-[440px] flex-col items-center select-none sm:max-w-[520px]"
      onClick={(event) => event.stopPropagation()}
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      onPointerDown={(event) => {
        dragStartX.current = event.clientX;
      }}
      onPointerUp={(event) => {
        if (dragStartX.current === null) return;
        const delta = event.clientX - dragStartX.current;
        dragStartX.current = null;
        if (Math.abs(delta) > 30) {
          event.stopPropagation();
          if (delta < 0) stepBy(1);
          else stepBy(-1);
        }
      }}
      aria-label={`${total} featured title${total === 1 ? '' : 's'} carousel`}
    >
      {/* Coverflow Poster Stage */}
      <div
        className={`relative w-full ${compact ? 'h-[222px]' : 'h-[270px]'}`}
      >
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                stepBy(-1);
              }}
              aria-label="Previous poster"
              className="absolute left-0 top-1/2 z-40 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/75 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                stepBy(1);
              }}
              aria-label="Next poster"
              className="absolute right-0 top-1/2 z-40 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/75 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {slotOffsets.map((offset) => {
          const slotVirtualIdx = virtualIndex + offset;
          const logicalIdx = ((slotVirtualIdx % total) + total) % total;
          const entry = entries[logicalIdx];
          return (
            <CarouselCard
              key={total === 1 ? `single-${entry.id}` : `slot-${slotVirtualIdx}`}
              entry={entry}
              poster={posterById.get(entry.id) ?? null}
              accent={accent}
              offset={offset}
              compact={compact}
              showRating={showRating}
              showRank={showRank}
              onSelect={() => {
                if (offset !== 0) stepBy(offset);
              }}
            />
          );
        })}
      </div>

      {/* Pagination dots directly beneath the center poster (matching reference) */}
      {total > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {total <= 12 ? (
            entries.map((entry, idx) => {
              const active = idx === activeLogicalIndex;
              return (
                <button
                  key={`${entry.id}-${idx}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    jumpToLogical(idx);
                  }}
                  aria-label={`Show ${entry.title} (${idx + 1} of ${total})`}
                  className="flex h-6 min-w-[14px] items-center justify-center p-0.5 focus-visible:outline-none"
                >
                  <span
                    className={`block rounded-full transition-all duration-200 ${
                      active ? 'h-2 w-5' : 'h-1.5 w-1.5 bg-white/35 hover:bg-white/60'
                    }`}
                    style={active ? { background: accent } : undefined}
                  />
                </button>
              );
            })
          ) : (
            <span className="text-xs font-medium tabular-nums text-white/65">
              {activeLogicalIndex + 1} / {total}
            </span>
          )}
        </div>
      )}

      {/* Editorial spotlight title flanked by hairline rules (matching reference) */}
      <div className="mt-2.5 w-full max-w-sm px-2">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/20" />
          <AnimatePresence mode="wait">
            <motion.p
              key={`${activeEntry.id}-${activeLogicalIndex}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="max-w-[230px] truncate text-center text-sm font-bold tracking-wide text-white sm:max-w-[280px]"
            >
              {activeEntry.title}
            </motion.p>
          </AnimatePresence>
          <div className="h-px flex-1 bg-white/20" />
        </div>
        <div className="mt-1 flex flex-col items-center gap-1">
          <p className="text-xs font-medium text-white/65">
            {activeEntry.country}
            <span aria-hidden="true"> · </span>
            {activeEntry.type}
            {showRating && activeEntry.rating ? (
              <>
                <span aria-hidden="true"> · </span>
                <span className="font-bold tabular-nums" style={{ color: accent }}>
                  ★ {formatRating(activeEntry.rating)}
                </span>
              </>
            ) : null}
          </p>
          <div className="h-0.5 w-16 rounded-full opacity-70" style={{ background: accent }} />
        </div>
      </div>
    </div>
  );
}
