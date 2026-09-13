// ── Monthly BL Wrapped — Full-Screen Presentation ────────────────────────────
// Spotify-Wrapped-style experience: one story per slide, swipe/tap navigation,
// smooth Framer Motion transitions, optimised for mobile-first touch.

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWrapped } from '@/context/WrappedContext';
import type { MonthlyWrappedSnapshot, WrappedSlide } from '@/types/wrapped';
import { buildSlides } from '@/lib/wrappedEngine';
import { monthKeyToLabel } from '@/lib/wrappedDB';
import { formatRating } from '@/lib/rating';
import { WrappedPosterStack } from './WrappedPosterStack';

// ── Gradient palette per slide type ──────────────────────────────────────────
const SLIDE_GRADIENTS: Record<string, string> = {
  intro:         'from-[#0a0a0a] via-[#1a0505] to-[#0a0a0a]',
  completed:     'from-[#0a0a0a] via-[#061a06] to-[#0a0a0a]',
  ongoing:       'from-[#0a0a0a] via-[#06101a] to-[#0a0a0a]',
  planned:       'from-[#0a0a0a] via-[#10091a] to-[#0a0a0a]',
  dropped:       'from-[#0a0a0a] via-[#1a0a06] to-[#0a0a0a]',
  favorites:     'from-[#0a0a0a] via-[#1a0510] to-[#0a0a0a]',
  ratings:       'from-[#0a0a0a] via-[#15100a] to-[#0a0a0a]',
  'highest-rated':'from-[#0a0a0a] via-[#1a0a00] to-[#0a0a0a]',
  'avg-rating':  'from-[#0a0a0a] via-[#101505] to-[#0a0a0a]',
  country:       'from-[#0a0a0a] via-[#00101a] to-[#0a0a0a]',
  top10:         'from-[#0a0a0a] via-[#1a1000] to-[#0a0a0a]',
  achievement:   'from-[#0a0a0a] via-[#10001a] to-[#0a0a0a]',
  growth:        'from-[#0a0a0a] via-[#00150f] to-[#0a0a0a]',
  rank:          'from-[#0a0a0a] via-[#150020] to-[#0a0a0a]',
  quiet:         'from-[#0a0a0a] via-[#0a0a1a] to-[#0a0a0a]',
  ending:        'from-[#0a0a0a] via-[#1a0505] to-[#0a0a0a]',
};

const SLIDE_ACCENTS: Record<string, string> = {
  intro: '#E50914', completed: '#22c55e', ongoing: '#3b82f6', planned: '#a855f7',
  dropped: '#f97316', favorites: '#ec4899', ratings: '#f59e0b',
  'highest-rated': '#f59e0b', 'avg-rating': '#84cc16', country: '#06b6d4',
  top10: '#eab308', achievement: '#c084fc', growth: '#10b981',
  rank: '#e879f9', quiet: '#6366f1', ending: '#E50914',
};

// ── Individual slide renderers ─────────────────────────────────────────────────

function IntroSlide({ slide, accent }: { slide: WrappedSlide; accent: string }) {
  const p = slide.payload as { monthName: string; year: number };
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-6">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="text-6xl mb-2"
      >
        🎬
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="font-black text-5xl tracking-tight leading-none"
        style={{ color: accent }}
      >
        {p.monthName}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="text-white/50 text-2xl font-medium"
      >
        {p.year}
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-white/70 text-xl font-light mt-2"
      >
        Your BL Journey
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        className="text-white/30 text-sm mt-4"
      >
        Tap to continue →
      </motion.div>
    </div>
  );
}

function StatSlide({ slide, accent }: { slide: WrappedSlide; accent: string }) {
  const p = slide.payload as { count: number; label: string; titles?: string[]; entries?: Parameters<typeof WrappedPosterStack>[0]['entries'] };
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-5">
      {p.entries && <WrappedPosterStack entries={p.entries} accent={accent} />}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 180 }}
        className="font-black leading-none"
        style={{ fontSize: 'clamp(5rem, 20vw, 9rem)', color: accent }}
      >
        {p.count}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="text-white text-2xl font-semibold tracking-wide"
      >
        {p.label}
      </motion.div>
      {p.titles && p.titles.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="flex flex-col gap-1.5 mt-2 w-full max-w-xs"
        >
          {p.titles.map((t, i) => (
            <motion.div
              key={t}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 + i * 0.08 }}
              className="text-white/60 text-sm truncate"
            >
              {t}
            </motion.div>
          ))}
        </motion.div>
      )}
      {slide.narratorComment && (
        <NarratorComment comment={slide.narratorComment} accent={accent} />
      )}
    </div>
  );
}

function HighlightSlide({ slide, accent }: { slide: WrappedSlide; accent: string }) {
  const p = slide.payload as { title: string; country: string; type: string; rating: number; entryId?: string };
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-4">
      <WrappedPosterStack entries={[{ id: p.entryId ?? p.title, title: p.title, country: p.country, type: p.type as 'Movie' | 'Series' }]} accent={accent} maxEntries={1} />
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-white/50 text-sm uppercase tracking-widest font-semibold"
      >
        Highest Rated This Month
      </motion.div>
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 160 }}
        className="font-black text-7xl"
        style={{ color: accent }}
      >
        {formatRating(p.rating)}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-white font-bold text-xl leading-tight max-w-xs"
      >
        {p.title}
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65 }}
        className="text-white/40 text-sm"
      >
        {p.country} · {p.type}
      </motion.div>
      {slide.narratorComment && (
        <NarratorComment comment={slide.narratorComment} accent={accent} />
      )}
    </div>
  );
}

function CountrySlide({ slide, accent }: { slide: WrappedSlide; accent: string }) {
  const p = slide.payload as { country: string; count: number; allCountries: [string, number][]; entries?: Parameters<typeof WrappedPosterStack>[0]['entries'] };
  const total = p.allCountries.reduce((s, [, n]) => s + n, 0);
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-4">
      {p.entries && <WrappedPosterStack entries={p.entries} accent={accent} />}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-white/50 text-sm uppercase tracking-widest font-semibold"
      >
        Most Watched Country
      </motion.div>
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 150 }}
        className="font-black text-4xl leading-tight max-w-xs"
        style={{ color: accent }}
      >
        {p.country}
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-white/50 text-base"
      >
        {p.count} title{p.count !== 1 ? 's' : ''} watched
      </motion.div>
      {p.allCountries.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="flex flex-col gap-2 w-full max-w-xs mt-2"
        >
          {p.allCountries.slice(0, 4).map(([country, count], i) => (
            <motion.div
              key={country}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.65 + i * 0.1 }}
              className="flex items-center gap-2"
            >
              <span className="text-white/60 text-xs w-24 text-right truncate">{country}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(count / total) * 100}%`, background: accent }}
                />
              </div>
              <span className="text-white/40 text-xs w-4">{count}</span>
            </motion.div>
          ))}
        </motion.div>
      )}
      {slide.narratorComment && (
        <NarratorComment comment={slide.narratorComment} accent={accent} />
      )}
    </div>
  );
}

function AchievementSlide({ slide, accent }: { slide: WrappedSlide; accent: string }) {
  const p = slide.payload as { achievements: Array<{ title: string; type: string }> };
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-5">
      <motion.div
        initial={{ scale: 0, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
        className="text-6xl"
      >
        🎖
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="text-white font-bold text-2xl"
      >
        Achievement{p.achievements.length !== 1 ? 's' : ''} Unlocked
      </motion.div>
      <div className="flex flex-col gap-2.5 w-full max-w-xs">
        {p.achievements.slice(0, 3).map((a, i) => (
          <motion.div
            key={a.title}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 + i * 0.1 }}
            className="rounded-xl px-4 py-3 text-sm font-medium"
            style={{ background: `${accent}20`, border: `1px solid ${accent}40`, color: accent }}
          >
            {a.title}
          </motion.div>
        ))}
      </div>
      {slide.narratorComment && (
        <NarratorComment comment={slide.narratorComment} accent={accent} />
      )}
    </div>
  );
}

function RankSlide({ slide, accent }: { slide: WrappedSlide; accent: string }) {
  const p = slide.payload as { rank: string; emoji: string; isNew: boolean };
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-5">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 180 }}
        className="text-7xl"
      >
        {p.emoji}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-white/50 text-sm uppercase tracking-widest font-semibold"
      >
        Your BL Rank
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="font-black text-3xl"
        style={{ color: accent }}
      >
        {p.rank}
      </motion.div>
      {slide.narratorComment && (
        <NarratorComment comment={slide.narratorComment} accent={accent} />
      )}
    </div>
  );
}

function EndingSlide({ slide, accent }: { slide: WrappedSlide; accent: string }) {
  const p = slide.payload as { monthName: string; year: number; totalCompleted: number };
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-6">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 180 }}
        className="text-6xl"
      >
        ✨
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="font-black text-3xl text-white leading-tight"
      >
        That's your {p.monthName} {p.year}
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-white/60 text-base max-w-xs"
      >
        {slide.narratorComment}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.85 }}
        className="mt-4 px-6 py-2.5 rounded-full font-semibold text-sm"
        style={{ background: accent, color: '#fff' }}
      >
        BL WATCHLIST
      </motion.div>
    </div>
  );
}

function QuietSlide({ slide }: { slide: WrappedSlide }) {
  const p = slide.payload as { monthName: string; year: number };
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="text-6xl"
      >
        🌙
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="font-bold text-2xl text-white"
      >
        A Quiet {p.monthName}
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-white/60 text-base max-w-xs"
      >
        {slide.narratorComment}
      </motion.div>
    </div>
  );
}

function NarratorComment({ comment, accent }: { comment: string; accent: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="mt-3 max-w-xs text-center text-sm italic px-3 py-2 rounded-lg"
      style={{ background: `${accent}15`, color: `${accent}cc` }}
    >
      "{comment}"
    </motion.div>
  );
}

function renderSlide(slide: WrappedSlide, accent: string) {
  switch (slide.type) {
    case 'intro':          return <IntroSlide     slide={slide} accent={accent} />;
    case 'completed':
    case 'ongoing':
    case 'planned':
    case 'dropped':
    case 'favorites':
    case 'ratings':
    case 'avg-rating':
    case 'top10':
    case 'growth':         return <StatSlide      slide={slide} accent={accent} />;
    case 'highest-rated':  return <HighlightSlide slide={slide} accent={accent} />;
    case 'country':        return <CountrySlide   slide={slide} accent={accent} />;
    case 'achievement':    return <AchievementSlide slide={slide} accent={accent} />;
    case 'rank':           return <RankSlide      slide={slide} accent={accent} />;
    case 'ending':         return <EndingSlide    slide={slide} accent={accent} />;
    case 'quiet':          return <QuietSlide     slide={slide} />;
    default:               return <StatSlide      slide={slide} accent={accent} />;
  }
}

// ── Main Presentation Component ───────────────────────────────────────────────

interface Props {
  snapshot: MonthlyWrappedSnapshot;
  onDismiss: () => void;
}

export default function WrappedPresentation({ snapshot, onDismiss }: Props) {
  const slides = buildSlides(snapshot);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const touchStartX = useRef<number | null>(null);

  const currentSlide = slides[index];
  const accent = SLIDE_ACCENTS[currentSlide.type] ?? '#E50914';
  const gradient = SLIDE_GRADIENTS[currentSlide.type] ?? SLIDE_GRADIENTS.intro;

  const goNext = useCallback(() => {
    if (index < slides.length - 1) {
      setDirection(1);
      setIndex(i => i + 1);
    } else {
      onDismiss();
    }
  }, [index, slides.length, onDismiss]);

  const goPrev = useCallback(() => {
    if (index > 0) {
      setDirection(-1);
      setIndex(i => i - 1);
    }
  }, [index]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, onDismiss]);

  // Touch / swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      delta < 0 ? goNext() : goPrev();
    }
    touchStartX.current = null;
  };

  // Tap zones (left 35% = prev, right 65% = next)
  const handleTap = (e: React.MouseEvent) => {
    const x = e.clientX;
    const w = window.innerWidth;
    if (x < w * 0.35) goPrev();
    else goNext();
  };

  const slideVariants = {
    enter:  (dir: number) => ({ x: dir * 60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (dir: number) => ({ x: -dir * 60, opacity: 0 }),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col select-none"
      style={{ touchAction: 'none' }}
    >
      {/* Background gradient */}
      <motion.div
        key={currentSlide.type}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className={`absolute inset-0 bg-gradient-to-b ${gradient}`}
      />

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-3 px-4">
        {slides.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 rounded-full bg-white/20 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: accent }}
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: i <= index ? 1 : 0 }}
              transition={{ duration: i === index ? 0.3 : 0, ease: 'easeOut' }}
            />
          </div>
        ))}
      </div>

      {/* Exit button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        className="absolute top-8 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Close Wrapped"
      >
        <X size={18} className="text-white/70" />
      </button>

      {/* Month label */}
      <div className="absolute top-8 left-4 z-20">
        <span className="text-white/30 text-xs font-medium tracking-wide">
          {monthKeyToLabel(snapshot.month)}
        </span>
      </div>

      {/* Tap zone indicators on hover (desktop) */}
      <button
        onClick={(e) => { e.stopPropagation(); goPrev(); }}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/0 hover:bg-white/10 transition-colors opacity-0 hover:opacity-100"
        aria-label="Previous"
      >
        <ChevronLeft size={20} className="text-white/50" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); goNext(); }}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/0 hover:bg-white/10 transition-colors opacity-0 hover:opacity-100"
        aria-label="Next"
      >
        <ChevronRight size={20} className="text-white/50" />
      </button>

      {/* Slide area — tap-to-navigate */}
      <div
        className="relative flex-1"
        onClick={handleTap}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.32, 0, 0.67, 0] }}
            className="absolute inset-0 flex flex-col"
          >
            {renderSlide(currentSlide, accent)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide counter */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <span className="text-white/25 text-xs">
          {index + 1} / {slides.length}
        </span>
      </div>
    </motion.div>
  );
}

// ── Auto-presented wrapper (used in App.tsx) ──────────────────────────────────

export function WrappedPresentationContainer() {
  const { activeSnapshot, pendingSnapshot, viewSnapshot, dismissPresentation } = useWrapped();

  // Auto-present the first unviewed wrapped once on load
  const [autoPresented, setAutoPresented] = useState(false);
  useEffect(() => {
    if (!autoPresented && pendingSnapshot) {
      setAutoPresented(true);
      viewSnapshot(pendingSnapshot);
    }
  }, [pendingSnapshot, autoPresented, viewSnapshot]);

  if (!activeSnapshot) return null;

  return (
    <AnimatePresence>
      <WrappedPresentation
        key={activeSnapshot.month}
        snapshot={activeSnapshot}
        onDismiss={dismissPresentation}
      />
    </AnimatePresence>
  );
}
