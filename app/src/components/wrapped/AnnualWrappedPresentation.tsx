import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Crown,
  Globe2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { useAnnualWrapped } from '@/context/AnnualWrappedContext';
import { buildAnnualSlides } from '@/lib/annualWrappedEngine';
import type {
  AnnualHighestRatedEntry,
  AnnualRankingEntry,
  AnnualTrackedEntry,
  AnnualWrappedSlide,
  AnnualWrappedSnapshot,
} from '@/types/wrapped';
import { formatRating } from '@/lib/rating';
import { AnnualWrappedPosterCarousel } from './AnnualWrappedPosterCarousel';

const gradients: Record<string, string> = {
  intro: 'from-[#1a050b] via-[#2f0816] to-[#080808]',
  activity: 'from-[#06131f] via-[#082f44] to-[#080808]',
  completed: 'from-[#06190f] via-[#08402b] to-[#080808]',
  growth: 'from-[#061c17] via-[#075845] to-[#080808]',
  favorites: 'from-[#260619] via-[#6d0f45] to-[#080808]',
  ratings: 'from-[#201604] via-[#644108] to-[#080808]',
  'highest-rated': 'from-[#241504] via-[#8f5205] to-[#080808]',
  countries: 'from-[#041822] via-[#075469] to-[#080808]',
  genres: 'from-[#180b2d] via-[#53208f] to-[#080808]',
  ongoing: 'from-[#07162b] via-[#0b4585] to-[#080808]',
  top10: 'from-[#241904] via-[#856408] to-[#080808]',
  achievement: 'from-[#1d0b2f] via-[#6e31a3] to-[#080808]',
  rank: 'from-[#2c0828] via-[#80205d] to-[#080808]',
  quiet: 'from-[#0c1024] via-[#1c2861] to-[#080808]',
  ending: 'from-[#1a050a] via-[#5c101b] to-[#080808]',
};

const accents: Record<string, string> = {
  intro: '#fb7185',
  activity: '#38bdf8',
  completed: '#4ade80',
  growth: '#34d399',
  favorites: '#f472b6',
  ratings: '#fbbf24',
  'highest-rated': '#facc15',
  countries: '#22d3ee',
  genres: '#c084fc',
  ongoing: '#60a5fa',
  top10: '#facc15',
  achievement: '#d8b4fe',
  rank: '#f0abfc',
  quiet: '#818cf8',
  ending: '#fb7185',
};

function useCountUp(target: number, durationMs = 750) {
  const prefersReducedMotion = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion || target === 0) {
      return;
    }
    const isDecimal = !Number.isInteger(target);
    let rafId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = target * eased;
      setValue(isDecimal ? Math.round(next * 100) / 100 : Math.round(next));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, durationMs, prefersReducedMotion]);

  return prefersReducedMotion || target === 0 ? target : value;
}

function AmbientStageEffects({
  accent,
  slideType,
}: {
  accent: string;
  slideType: AnnualWrappedSlide['type'];
}) {
  const prefersReducedMotion = useReducedMotion();
  const showSparkles =
    slideType === 'intro' ||
    slideType === 'highest-rated' ||
    slideType === 'achievement' ||
    slideType === 'rank' ||
    slideType === 'ending';

  const particles = useMemo(
    () => [
      { left: '14%', top: '22%', size: 6, delay: 0 },
      { left: '84%', top: '18%', size: 5, delay: 0.7 },
      { left: '22%', top: '76%', size: 4, delay: 1.2 },
      { left: '78%', top: '72%', size: 7, delay: 0.4 },
      { left: '52%', top: '14%', size: 4, delay: 1.6 },
    ],
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Subtle central halo */}
      <div
        className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl transition-colors duration-700"
        style={{
          background: `radial-gradient(circle, ${accent}66 0%, transparent 68%)`,
        }}
      />
      {/* Ultra-fine vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, transparent 45%, rgba(0,0,0,0.68) 100%)',
        }}
      />
      {showSparkles &&
        !prefersReducedMotion &&
        particles.map((particle, idx) => (
          <motion.span
            key={idx}
            initial={{ opacity: 0.15, scale: 0.8, y: 0 }}
            animate={{
              opacity: [0.18, 0.75, 0.18],
              scale: [0.85, 1.2, 0.85],
              y: [0, -14, 0],
            }}
            transition={{
              duration: 4.4 + idx * 0.6,
              delay: particle.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute rounded-full"
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              background: accent,
              boxShadow: `0 0 12px ${accent}`,
            }}
          />
        ))}
    </div>
  );
}

function SlideFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-5 pb-20 pt-20 text-center sm:px-8 sm:pb-16 sm:pt-20">
        {children}
      </div>
    </div>
  );
}

function Narrator({ text, accent }: { text?: string; accent: string }) {
  if (!text) return null;
  return (
    <motion.blockquote
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="mt-4 max-w-md rounded-xl border-l-2 bg-white/[0.04] px-4 py-2.5 text-left text-xs italic leading-relaxed text-white/75 backdrop-blur-sm sm:text-sm"
      style={{ borderColor: accent }}
    >
      “{text}”
    </motion.blockquote>
  );
}

function Intro({ slide, accent }: { slide: AnnualWrappedSlide; accent: string }) {
  const payload = slide.payload as {
    year: number;
    totalActivity: number;
    completedCount?: number;
    collectionSize?: number | null;
  };
  const animatedMoments = useCountUp(payload.totalActivity, 850);

  return (
    <SlideFrame>
      <motion.div
        initial={{ scale: 0.6, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 190, damping: 18 }}
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] shadow-2xl backdrop-blur-md"
        style={{ boxShadow: `0 0 40px -8px ${accent}66` }}
      >
        <Sparkles className="h-8 w-8" style={{ color: accent }} />
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="text-xs font-bold uppercase tracking-[0.34em] text-white/60"
      >
        Annual Retrospective
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.18, type: 'spring', stiffness: 170 }}
        className="mt-2 font-black tracking-tight tabular-nums leading-none"
        style={{
          color: accent,
          fontSize: 'clamp(4.25rem, 18vw, 7.5rem)',
          textShadow: `0 12px 48px ${accent}45`,
        }}
      >
        {payload.year}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
        className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl"
      >
        BL Wrapped
      </motion.p>

      {payload.totalActivity > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-6 flex w-full max-w-xs items-center justify-center gap-4 border-y border-white/10 py-3 text-xs text-white/75"
        >
          <div>
            <p className="text-lg font-black tabular-nums text-white">{animatedMoments}</p>
            <p className="text-[11px] uppercase tracking-wider text-white/45">Moments</p>
          </div>
          {payload.completedCount !== undefined && payload.completedCount > 0 && (
            <>
              <div className="h-7 w-px bg-white/15" />
              <div>
                <p className="text-lg font-black tabular-nums text-white">
                  {payload.completedCount}
                </p>
                <p className="text-[11px] uppercase tracking-wider text-white/45">Completed</p>
              </div>
            </>
          )}
          {payload.collectionSize !== undefined && payload.collectionSize !== null && (
            <>
              <div className="h-7 w-px bg-white/15" />
              <div>
                <p className="text-lg font-black tabular-nums text-white">
                  {payload.collectionSize}
                </p>
                <p className="text-[11px] uppercase tracking-wider text-white/45">Library</p>
              </div>
            </>
          )}
        </motion.div>
      )}

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65 }}
        className="mt-6 text-xs font-medium tracking-wide text-white/45"
      >
        Tap or press next to relive your year →
      </motion.p>
    </SlideFrame>
  );
}

function Stat({
  slide,
  accent,
  carouselPaused,
}: {
  slide: AnnualWrappedSlide;
  accent: string;
  carouselPaused: boolean;
}) {
  const payload = slide.payload as {
    count: number;
    label: string;
    titles?: string[];
    entries?: AnnualTrackedEntry[];
  };
  const animatedCount = useCountUp(payload.count);
  const formattedCount = Number.isInteger(payload.count)
    ? animatedCount
    : animatedCount.toFixed(2);

  return (
    <SlideFrame>
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.72, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 175, damping: 20 }}
          className="font-black leading-none tabular-nums"
          style={{
            color: accent,
            fontSize: payload.entries?.length
              ? 'clamp(3.1rem, 11vw, 5.2rem)'
              : 'clamp(4.2rem, 18vw, 7.5rem)',
            textShadow: `0 10px 36px ${accent}38`,
          }}
        >
          {formattedCount}
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mt-1.5 text-lg font-bold tracking-tight text-white sm:text-2xl"
        >
          {payload.label}
        </motion.p>
      </div>

      {payload.entries && payload.entries.length > 0 ? (
        <div className="mt-4 w-full flex justify-center">
          <AnnualWrappedPosterCarousel
            entries={payload.entries}
            accent={accent}
            paused={carouselPaused}
          />
        </div>
      ) : (
        !!payload.titles?.length && (
          <div className="mt-4 flex w-full max-w-xs flex-col gap-1.5">
            {payload.titles.map((title, index) => (
              <motion.p
                key={`${title}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + index * 0.06 }}
                className="truncate text-sm text-white/65"
              >
                {title}
              </motion.p>
            ))}
          </div>
        )
      )}

      <Narrator text={slide.narratorComment} accent={accent} />
    </SlideFrame>
  );
}

function Highlight({
  slide,
  accent,
  year,
  carouselPaused,
}: {
  slide: AnnualWrappedSlide;
  accent: string;
  year: number;
  carouselPaused: boolean;
}) {
  const payload = slide.payload as {
    title: string;
    country: string;
    type: string;
    rating: number;
    entryId?: string;
    year?: number;
    entries?: AnnualHighestRatedEntry[];
  };

  const entries: AnnualHighestRatedEntry[] =
    payload.entries && payload.entries.length > 0
      ? payload.entries
      : [
          {
            id: payload.entryId ?? payload.title,
            title: payload.title,
            country: payload.country,
            type: payload.type as 'Movie' | 'Series',
            rating: payload.rating,
          },
        ];

  const [activeIndex, setActiveIndex] = useState(0);
  const current = entries[activeIndex] ?? entries[0];
  const displayYear = payload.year ?? year;

  return (
    <SlideFrame>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.26em] text-white/55">
        <Star className="h-3.5 w-3.5" style={{ color: accent, fill: accent }} />
        <span>
          {entries.length > 1
            ? `Your ${entries.length} Highest-Rated BLs`
            : 'Your Highest-Rated BL'}
        </span>
      </div>

      <p className="mt-1 text-xs font-medium text-white/45">
        Rated 9.5–10 in {displayYear}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${current.id}-${current.rating}`}
          initial={{ scale: 0.86, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-2 flex items-baseline justify-center gap-1.5"
        >
          <span
            className="text-5xl font-black tracking-tight tabular-nums sm:text-6xl"
            style={{
              color: accent,
              textShadow: `0 8px 34px ${accent}50`,
            }}
          >
            {formatRating(current.rating)}
          </span>
          <span className="text-sm font-bold text-white/45">/ 10</span>
        </motion.div>
      </AnimatePresence>

      <div className="mt-3 flex w-full justify-center">
        <AnnualWrappedPosterCarousel
          entries={entries}
          accent={accent}
          activeIndex={activeIndex}
          onActiveIndexChange={setActiveIndex}
          showRating
          paused={carouselPaused}
        />
      </div>

      <Narrator text={slide.narratorComment} accent={accent} />
    </SlideFrame>
  );
}

function Distribution({
  slide,
  accent,
  kind,
  carouselPaused,
}: {
  slide: AnnualWrappedSlide;
  accent: string;
  kind: 'country' | 'genre';
  carouselPaused: boolean;
}) {
  const payload = slide.payload as {
    name: string;
    count: number;
    all: [string, number][];
    entries?: AnnualTrackedEntry[];
  };
  const total = Math.max(
    1,
    payload.all.reduce((sum, [, count]) => sum + count, 0),
  );

  return (
    <SlideFrame>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-white/50">
        {kind === 'country' && <Globe2 className="h-3.5 w-3.5" style={{ color: accent }} />}
        <span>{kind === 'country' ? 'Your BL passport' : 'Your favorite genre'}</span>
      </div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-1 max-w-md text-3xl font-black tracking-tight sm:text-4xl"
        style={{ color: accent }}
      >
        {payload.name}
      </motion.p>
      <p className="mt-0.5 text-xs font-medium text-white/55 tabular-nums">
        {payload.count} {kind === 'country' ? 'title' : 'exploration'}
        {payload.count !== 1 ? 's' : ''}
      </p>

      {payload.entries && payload.entries.length > 0 && (
        <div className="mt-3 flex w-full justify-center">
          <AnnualWrappedPosterCarousel
            entries={payload.entries}
            accent={accent}
            paused={carouselPaused}
          />
        </div>
      )}

      <div className="mt-3 flex w-full max-w-sm flex-col gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 backdrop-blur-sm">
        {payload.all.slice(0, 5).map(([name, count], index) => (
          <div key={`${name}-${index}`} className="flex items-center gap-2.5 text-xs">
            <span className="w-24 truncate text-right font-medium text-white/70">{name}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: count / total }}
                transition={{ delay: 0.2 + index * 0.06, duration: 0.45 }}
                className="h-full w-full origin-left rounded-full"
                style={{ background: accent }}
              />
            </div>
            <span className="w-6 text-right font-semibold tabular-nums text-white/55">
              {count}
            </span>
          </div>
        ))}
      </div>

      <Narrator text={slide.narratorComment} accent={accent} />
    </SlideFrame>
  );
}

function TopTen({
  slide,
  accent,
  carouselPaused,
}: {
  slide: AnnualWrappedSlide;
  accent: string;
  carouselPaused: boolean;
}) {
  const payload = slide.payload as {
    entries: AnnualRankingEntry[];
    drawerYear: number;
  };
  const ordered = useMemo(
    () => [...payload.entries].sort((a, b) => a.rank - b.rank).slice(0, 10),
    [payload.entries],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <SlideFrame>
      <div className="flex items-center gap-2">
        <Crown className="h-5 w-5" style={{ color: accent }} />
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/60">
          Your {payload.drawerYear} Top 10
        </p>
      </div>

      <div className="mt-3 flex w-full justify-center">
        <AnnualWrappedPosterCarousel
          entries={ordered}
          accent={accent}
          activeIndex={activeIndex}
          onActiveIndexChange={setActiveIndex}
          showRank
          paused={carouselPaused}
        />
      </div>

      <div
        className="mt-3 grid w-full max-w-lg grid-cols-1 gap-1.5 sm:grid-cols-2"
        onClick={(event) => event.stopPropagation()}
      >
        {ordered.map((entry, idx) => {
          const selected = idx === activeIndex;
          return (
            <button
              key={`${entry.id}-${entry.rank}`}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setActiveIndex(idx);
              }}
              className={`flex min-h-[38px] items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                selected
                  ? 'border-white/30 bg-white/15'
                  : 'border-white/[0.06] bg-white/[0.04] hover:bg-white/[0.08]'
              }`}
            >
              <span
                className="w-6 shrink-0 text-center text-xs font-black tabular-nums"
                style={{ color: selected || entry.rank === 1 ? accent : 'rgba(255,255,255,0.5)' }}
              >
                #{entry.rank}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">
                {entry.title}
              </span>
            </button>
          );
        })}
      </div>

      <Narrator text={slide.narratorComment} accent={accent} />
    </SlideFrame>
  );
}

function Achievement({ slide, accent }: { slide: AnnualWrappedSlide; accent: string }) {
  const payload = slide.payload as { achievements: Array<{ title: string; type: string }> };
  return (
    <SlideFrame>
      <motion.div
        initial={{ scale: 0.7, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 180 }}
        className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.07]"
        style={{ boxShadow: `0 0 32px -6px ${accent}55` }}
      >
        <Award className="h-8 w-8" style={{ color: accent }} />
      </motion.div>
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/50">
        Collection Honors
      </p>
      <p className="mt-1 text-2xl font-black text-white sm:text-3xl">Milestones unlocked</p>

      <div className="mt-4 flex w-full max-w-sm flex-col gap-2">
        {payload.achievements.slice(0, 6).map((achievement, index) => (
          <motion.div
            key={`${achievement.title}-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 + index * 0.08 }}
            className="flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold backdrop-blur-sm"
            style={{
              color: '#ffffff',
              borderColor: `${accent}55`,
              background: `${accent}1a`,
            }}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accent }} />
            <span className="min-w-0 flex-1 truncate">{achievement.title}</span>
          </motion.div>
        ))}
      </div>

      <Narrator text={slide.narratorComment} accent={accent} />
    </SlideFrame>
  );
}

function Rank({ slide, accent }: { slide: AnnualWrappedSlide; accent: string }) {
  const payload = slide.payload as {
    rank: string;
    emoji: string;
    completedCount?: number;
    collectionSize?: number | null;
  };
  return (
    <SlideFrame>
      <motion.div
        initial={{ scale: 0.65, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 170 }}
        className="flex h-24 w-24 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] text-5xl shadow-2xl"
        style={{ boxShadow: `0 0 48px -6px ${accent}66` }}
      >
        {payload.emoji}
      </motion.div>

      <p className="mt-5 text-xs font-bold uppercase tracking-[0.28em] text-white/50">
        Your Year-End BL Rank
      </p>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-2 text-3xl font-black tracking-tight sm:text-5xl"
        style={{ color: accent }}
      >
        {payload.rank}
      </motion.p>

      {(payload.completedCount !== undefined || payload.collectionSize != null) && (
        <div className="mt-5 flex items-center gap-5 border-t border-white/10 pt-4 text-xs text-white/60">
          {payload.completedCount !== undefined && (
            <span className="tabular-nums">
              <strong className="text-white">{payload.completedCount}</strong> completed this year
            </span>
          )}
          {payload.collectionSize != null && (
            <span className="tabular-nums">
              <strong className="text-white">{payload.collectionSize}</strong> total in library
            </span>
          )}
        </div>
      )}
    </SlideFrame>
  );
}

function Ending({
  slide,
  accent,
  onReplay,
  onDismiss,
}: {
  slide: AnnualWrappedSlide;
  accent: string;
  onReplay: () => void;
  onDismiss: () => void;
}) {
  const payload = slide.payload as {
    year: number;
    completedCount?: number;
    favoritesCount?: number;
    countriesCount?: number;
    topRating?: number | null;
    collectionSize?: number | null;
  };

  const recapItems = [
    { label: 'Completed', value: payload.completedCount ?? 0 },
    { label: 'Favorites', value: payload.favoritesCount ?? 0 },
    { label: 'Countries', value: payload.countriesCount ?? 0 },
    {
      label: 'Top Rating',
      value: payload.topRating ? formatRating(payload.topRating) : '—',
    },
  ];

  return (
    <SlideFrame>
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring' }}
        className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06]"
        style={{ boxShadow: `0 0 36px -6px ${accent}55` }}
      >
        <Sparkles className="h-7 w-7" style={{ color: accent }} />
      </motion.div>

      <h2 className="text-2xl font-black tracking-tight text-white sm:text-4xl">
        That’s your {payload.year} BL journey.
      </h2>
      {slide.narratorComment && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-white/65">
          {slide.narratorComment}
        </p>
      )}

      <div className="mt-6 grid w-full max-w-sm grid-cols-2 gap-2.5 sm:grid-cols-4 sm:max-w-md">
        {recapItems.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center backdrop-blur-sm"
          >
            <p className="text-xl font-black tabular-nums text-white" style={{ color: accent }}>
              {item.value}
            </p>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-white/45">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      <div
        className="mt-7 flex flex-wrap items-center justify-center gap-3"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onReplay();
          }}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <RotateCcw className="h-4 w-4" />
          Replay {payload.year}
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDismiss();
          }}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-black transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          style={{ background: accent }}
        >
          Finish Wrapped
        </button>
      </div>
    </SlideFrame>
  );
}

function renderSlide(
  slide: AnnualWrappedSlide,
  accent: string,
  year: number,
  carouselPaused: boolean,
  onReplay: () => void,
  onDismiss: () => void,
) {
  switch (slide.type) {
    case 'intro':
      return <Intro slide={slide} accent={accent} />;
    case 'countries':
      return (
        <Distribution
          slide={slide}
          accent={accent}
          kind="country"
          carouselPaused={carouselPaused}
        />
      );
    case 'genres':
      return (
        <Distribution
          slide={slide}
          accent={accent}
          kind="genre"
          carouselPaused={carouselPaused}
        />
      );
    case 'highest-rated':
      return (
        <Highlight
          slide={slide}
          accent={accent}
          year={year}
          carouselPaused={carouselPaused}
        />
      );
    case 'top10':
      return (
        <TopTen slide={slide} accent={accent} carouselPaused={carouselPaused} />
      );
    case 'achievement':
      return <Achievement slide={slide} accent={accent} />;
    case 'rank':
      return <Rank slide={slide} accent={accent} />;
    case 'quiet':
      return (
        <SlideFrame>
          <div className="text-6xl">🌙</div>
          <p className="mt-4 text-3xl font-bold text-white">A quieter year</p>
          <Narrator text={slide.narratorComment} accent={accent} />
        </SlideFrame>
      );
    case 'ending':
      return (
        <Ending
          slide={slide}
          accent={accent}
          onReplay={onReplay}
          onDismiss={onDismiss}
        />
      );
    default:
      return <Stat slide={slide} accent={accent} carouselPaused={carouselPaused} />;
  }
}

export default function AnnualWrappedPresentation({
  snapshot,
  onDismiss,
}: {
  snapshot: AnnualWrappedSnapshot;
  onDismiss: () => void;
}) {
  const slides = useMemo(() => buildAnnualSlides(snapshot), [snapshot]);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const current = slides[Math.min(index, slides.length - 1)];
  const accent = accents[current.type] ?? accents.intro;

  const next = useCallback(() => {
    if (index < slides.length - 1) {
      setDirection(1);
      setIndex((value) => value + 1);
    } else {
      onDismiss();
    }
  }, [index, slides.length, onDismiss]);

  const previous = useCallback(() => {
    if (index > 0) {
      setDirection(-1);
      setIndex((value) => value - 1);
    }
  }, [index]);

  const replayFromStart = useCallback(() => {
    setDirection(-1);
    setIndex(0);
  }, []);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault();
        next();
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        previous();
      }
      if (event.key === 'Escape') {
        onDismiss();
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [next, previous, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={`${snapshot.year} Annual BL Wrapped`}
      className="fixed inset-0 z-[110] flex select-none flex-col overflow-hidden bg-[#080808]"
      onTouchStart={(event) => {
        touchStart.current = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        };
      }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return;
        const dx = event.changedTouches[0].clientX - touchStart.current.x;
        const dy = event.changedTouches[0].clientY - touchStart.current.y;
        touchStart.current = null;
        if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.25) {
          if (dx < 0) next();
          else previous();
        }
      }}
    >
      {/* Dynamic gradient background */}
      <motion.div
        key={current.type}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.55 }}
        className={`absolute inset-0 bg-gradient-to-b ${gradients[current.type] ?? gradients.intro}`}
      />
      <AmbientStageEffects accent={accent} slideType={current.type} />

      {/* Top segmented story progress bars */}
      <div className="relative z-30 px-4 pt-3">
        <div className="flex gap-1">
          {slides.map((s, itemIndex) => (
            <div
              key={s.id}
              className="h-1 flex-1 overflow-hidden rounded-full bg-white/15"
            >
              <motion.div
                initial={false}
                animate={{ scaleX: itemIndex <= index ? 1 : 0 }}
                transition={{ duration: 0.25 }}
                style={{ background: accent, transformOrigin: 'left' }}
                className="h-full"
              />
            </div>
          ))}
        </div>

        {/* Clean top HUD bar */}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold tracking-[0.18em] text-white/60">
              {snapshot.year} BL WRAPPED
            </span>
            <span className="text-xs font-medium tabular-nums text-white/35">
              {index + 1} / {slides.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setCarouselPaused((prev) => !prev);
              }}
              aria-label={carouselPaused ? 'Resume poster carousel' : 'Pause poster carousel'}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/75 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {carouselPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDismiss();
              }}
              aria-label="Close Annual Wrapped"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop side slide buttons */}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          previous();
        }}
        disabled={index === 0}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white disabled:pointer-events-none disabled:opacity-20 md:flex"
      >
        <ChevronLeft size={22} />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          next();
        }}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white md:flex"
      >
        <ChevronRight size={22} />
      </button>

      {/* Main slide canvas (tap left 30% -> prev, right 70% -> next) */}
      <div
        className="relative z-10 flex-1 overflow-hidden"
        onClick={(event) => {
          if (event.clientX < window.innerWidth * 0.3) previous();
          else next();
        }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current.id}
            custom={direction}
            initial={{ x: direction * 56, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -56, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute inset-0"
          >
            {renderSlide(
              current,
              accent,
              snapshot.year,
              carouselPaused,
              replayFromStart,
              onDismiss,
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Compact mobile-friendly bottom navigation bar */}
      <div
        className="pointer-events-none relative z-30 flex items-center justify-between px-4 pb-3 md:hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            previous();
          }}
          disabled={index === 0}
          aria-label="Previous slide"
          className="pointer-events-auto flex h-11 min-w-[44px] items-center justify-center gap-1 rounded-full bg-white/10 px-3 text-xs font-semibold text-white/80 backdrop-blur-sm disabled:opacity-25"
        >
          <ChevronLeft size={16} />
          Prev
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            next();
          }}
          aria-label={index === slides.length - 1 ? 'Finish Wrapped' : 'Next slide'}
          className="pointer-events-auto flex h-11 min-w-[44px] items-center justify-center gap-1 rounded-full bg-white/15 px-3.5 text-xs font-semibold text-white backdrop-blur-sm"
        >
          {index === slides.length - 1 ? 'Done' : 'Next'}
          <ChevronRight size={16} />
        </button>
      </div>
    </motion.div>
  );
}

export function AnnualWrappedPresentationContainer() {
  const {
    activeAnnualSnapshot,
    pendingAnnualSnapshot,
    viewAnnualSnapshot,
    dismissAnnualPresentation,
  } = useAnnualWrapped();
  const autoPresentedRef = useRef(false);
  useEffect(() => {
    if (!autoPresentedRef.current && pendingAnnualSnapshot) {
      autoPresentedRef.current = true;
      viewAnnualSnapshot(pendingAnnualSnapshot);
    }
  }, [pendingAnnualSnapshot, viewAnnualSnapshot]);
  if (!activeAnnualSnapshot) return null;
  return (
    <AnimatePresence>
      <AnnualWrappedPresentation
        key={activeAnnualSnapshot.year}
        snapshot={activeAnnualSnapshot}
        onDismiss={dismissAnnualPresentation}
      />
    </AnimatePresence>
  );
}