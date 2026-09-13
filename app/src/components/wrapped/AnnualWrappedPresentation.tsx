import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Crown, X } from 'lucide-react';
import { useAnnualWrapped } from '@/context/AnnualWrappedContext';
import { buildAnnualSlides } from '@/lib/annualWrappedEngine';
import type { AnnualWrappedSlide, AnnualWrappedSnapshot } from '@/types/wrapped';
import { formatRating } from '@/lib/rating';
import { WrappedPosterStack } from './WrappedPosterStack';

const gradients: Record<string, string> = {
  intro: 'from-[#130507] via-[#2a0713] to-[#080808]',
  activity: 'from-[#07121c] via-[#062b3d] to-[#080808]',
  completed: 'from-[#07180f] via-[#073b28] to-[#080808]',
  growth: 'from-[#071b16] via-[#075744] to-[#080808]',
  favorites: 'from-[#220617] via-[#6b0e43] to-[#080808]',
  ratings: 'from-[#1e1605] via-[#634208] to-[#080808]',
  'highest-rated': 'from-[#211405] via-[#9a5a06] to-[#080808]',
  countries: 'from-[#051721] via-[#07566a] to-[#080808]',
  genres: 'from-[#170b2a] via-[#52208c] to-[#080808]',
  ongoing: 'from-[#071527] via-[#0a4380] to-[#080808]',
  top10: 'from-[#211804] via-[#816109] to-[#080808]',
  achievement: 'from-[#1b0b2b] via-[#7134a5] to-[#080808]',
  rank: 'from-[#2b0827] via-[#81215f] to-[#080808]',
  quiet: 'from-[#0d1023] via-[#1d2862] to-[#080808]',
  ending: 'from-[#180508] via-[#5b1019] to-[#080808]',
};

const accents: Record<string, string> = {
  intro: '#fb7185', activity: '#38bdf8', completed: '#4ade80', growth: '#34d399',
  favorites: '#f472b6', ratings: '#fbbf24', 'highest-rated': '#facc15',
  countries: '#22d3ee', genres: '#c084fc', ongoing: '#60a5fa', top10: '#facc15',
  achievement: '#d8b4fe', rank: '#f0abfc', quiet: '#818cf8', ending: '#fb7185',
};

function Narrator({ text, accent }: { text?: string; accent: string }) {
  if (!text) return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="mt-5 max-w-xs rounded-xl px-4 py-2.5 text-sm italic"
      style={{ background: `${accent}1f`, color: `${accent}dd` }}
    >
      “{text}”
    </motion.p>
  );
}

function Intro({ slide, accent }: { slide: AnnualWrappedSlide; accent: string }) {
  const payload = slide.payload as { year: number; totalActivity: number };
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-8 text-center">
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 180 }}
        className="text-7xl"
      >
        ✨
      </motion.div>
      <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-lg font-semibold text-white/70">
        Your
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="text-6xl font-black tracking-tight"
        style={{ color: accent }}
      >
        {payload.year}
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-3xl font-bold text-white">
        BL Wrapped
      </motion.p>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }} className="mt-4 text-sm text-white/40">
        Tap to relive your year →
      </motion.p>
    </div>
  );
}

function Stat({ slide, accent }: { slide: AnnualWrappedSlide; accent: string }) {
  const payload = slide.payload as { count: number; label: string; titles?: string[]; entries?: Parameters<typeof WrappedPosterStack>[0]['entries'] };
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      {payload.entries && <WrappedPosterStack entries={payload.entries} accent={accent} />}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 160 }}
        className="font-black leading-none"
        style={{ color: accent, fontSize: 'clamp(4.5rem, 22vw, 9rem)' }}
      >
        {payload.count}
      </motion.div>
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-white">
        {payload.label}
      </motion.p>
      {!!payload.titles?.length && (
        <div className="mt-3 flex w-full max-w-xs flex-col gap-1.5">
          {payload.titles.map((title, index) => (
            <motion.p
              key={`${title}-${index}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.08 }}
              className="truncate text-sm text-white/55"
            >
              {title}
            </motion.p>
          ))}
        </div>
      )}
      <Narrator text={slide.narratorComment} accent={accent} />
    </div>
  );
}

function Highlight({ slide, accent }: { slide: AnnualWrappedSlide; accent: string }) {
  const payload = slide.payload as { title: string; country: string; type: string; rating: number; entryId?: string };
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <WrappedPosterStack entries={[{ id: payload.entryId ?? payload.title, title: payload.title, country: payload.country, type: payload.type as 'Movie' | 'Series' }]} accent={accent} maxEntries={1} />
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/50">Your highest-rated BL</p>
      <motion.p initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-8xl font-black" style={{ color: accent }}>
        {formatRating(payload.rating)}
      </motion.p>
      <p className="max-w-xs text-2xl font-bold text-white">{payload.title}</p>
      <p className="text-sm text-white/45">{payload.country} · {payload.type}</p>
      <Narrator text={slide.narratorComment} accent={accent} />
    </div>
  );
}

function Distribution({ slide, accent, kind }: { slide: AnnualWrappedSlide; accent: string; kind: 'country' | 'genre' }) {
  const payload = slide.payload as { name: string; count: number; all: [string, number][]; entries?: Parameters<typeof WrappedPosterStack>[0]['entries'] };
  const total = payload.all.reduce((sum, [, count]) => sum + count, 0);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      {payload.entries && <WrappedPosterStack entries={payload.entries} accent={accent} />}
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/50">
        {kind === 'country' ? 'Your BL passport' : 'Your favorite genre'}
      </p>
      <p className="max-w-xs text-4xl font-black" style={{ color: accent }}>{payload.name}</p>
      <p className="text-white/55">{payload.count} {kind === 'country' ? 'title' : 'exploration'}{payload.count !== 1 ? 's' : ''}</p>
      <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
        {payload.all.slice(0, 5).map(([name, count], index) => (
          <div key={`${name}-${index}`} className="flex items-center gap-2 text-xs">
            <span className="w-24 truncate text-right text-white/55">{name}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(count / total) * 100}%` }}
                transition={{ delay: 0.25 + index * 0.08 }}
                className="h-full rounded-full"
                style={{ background: accent }}
              />
            </div>
            <span className="w-4 text-white/40">{count}</span>
          </div>
        ))}
      </div>
      <Narrator text={slide.narratorComment} accent={accent} />
    </div>
  );
}

function TopTen({ slide, accent }: { slide: AnnualWrappedSlide; accent: string }) {
  const payload = slide.payload as { entries: Array<{ id: string; title: string; rank: number; country: string; type: 'Movie' | 'Series' }>; drawerYear: number };
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <Crown className="h-12 w-12" style={{ color: accent }} />
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/50">Your {payload.drawerYear} Top 10</p>
      <WrappedPosterStack entries={payload.entries} accent={accent} />
      <div className="flex w-full max-w-sm flex-col gap-1.5">
        {payload.entries.slice(0, 10).map((entry, index) => (
          <motion.div
            key={`${entry.title}-${entry.rank}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + index * 0.08 }}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-left ${entry.rank === 1 ? 'bg-white/15 ring-1 ring-white/20' : 'bg-white/5'}`}
          >
            <span className="w-6 text-center text-sm font-black" style={{ color: entry.rank === 1 ? accent : 'rgba(255,255,255,.5)' }}>#{entry.rank}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{entry.title}</span>
          </motion.div>
        ))}
      </div>
      <Narrator text={slide.narratorComment} accent={accent} />
    </div>
  );
}

function Achievement({ slide, accent }: { slide: AnnualWrappedSlide; accent: string }) {
  const payload = slide.payload as { achievements: Array<{ title: string; type: string }> };
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-8 text-center">
      <motion.div initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} className="text-7xl">🏅</motion.div>
      <p className="text-2xl font-bold text-white">Milestones unlocked</p>
      <div className="flex w-full max-w-xs flex-col gap-2">
        {payload.achievements.slice(0, 5).map((achievement, index) => (
          <motion.div
            key={`${achievement.title}-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + index * 0.1 }}
            className="rounded-xl border px-4 py-3 text-sm font-medium"
            style={{ color: accent, borderColor: `${accent}55`, background: `${accent}18` }}
          >
            {achievement.title}
          </motion.div>
        ))}
      </div>
      <Narrator text={slide.narratorComment} accent={accent} />
    </div>
  );
}

function Rank({ slide, accent }: { slide: AnnualWrappedSlide; accent: string }) {
  const payload = slide.payload as { rank: string; emoji: string };
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-8 text-center">
      <div className="text-7xl">{payload.emoji}</div>
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/50">Your BL rank</p>
      <p className="text-4xl font-black" style={{ color: accent }}>{payload.rank}</p>
    </div>
  );
}

function Ending({ slide, accent }: { slide: AnnualWrappedSlide; accent: string }) {
  const payload = slide.payload as { year: number };
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-8 text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="text-7xl">✨</motion.div>
      <p className="text-3xl font-black text-white">That’s your {payload.year} BL journey.</p>
      <p className="max-w-xs text-base leading-relaxed text-white/60">{slide.narratorComment}</p>
      <div className="rounded-full px-6 py-2.5 text-sm font-bold text-white" style={{ background: accent }}>THE NEXT CHAPTER AWAITS</div>
    </div>
  );
}

function renderSlide(slide: AnnualWrappedSlide, accent: string) {
  switch (slide.type) {
    case 'intro': return <Intro slide={slide} accent={accent} />;
    case 'countries': return <Distribution slide={slide} accent={accent} kind="country" />;
    case 'genres': return <Distribution slide={slide} accent={accent} kind="genre" />;
    case 'highest-rated': return <Highlight slide={slide} accent={accent} />;
    case 'top10': return <TopTen slide={slide} accent={accent} />;
    case 'achievement': return <Achievement slide={slide} accent={accent} />;
    case 'rank': return <Rank slide={slide} accent={accent} />;
    case 'quiet': return <div className="flex h-full flex-col items-center justify-center gap-5 px-8 text-center"><div className="text-7xl">🌙</div><p className="text-3xl font-bold text-white">A quieter year</p><Narrator text={slide.narratorComment} accent={accent} /></div>;
    case 'ending': return <Ending slide={slide} accent={accent} />;
    default: return <Stat slide={slide} accent={accent} />;
  }
}

export default function AnnualWrappedPresentation({ snapshot, onDismiss }: { snapshot: AnnualWrappedSnapshot; onDismiss: () => void }) {
  const slides = buildAnnualSlides(snapshot);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const touchStart = useRef<number | null>(null);
  const current = slides[index];
  const accent = accents[current.type] ?? accents.intro;

  const next = useCallback(() => {
    if (index < slides.length - 1) {
      setDirection(1);
      setIndex(value => value + 1);
    } else onDismiss();
  }, [index, slides.length, onDismiss]);
  const previous = useCallback(() => {
    if (index > 0) {
      setDirection(-1);
      setIndex(value => value - 1);
    }
  }, [index]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === ' ') next();
      if (event.key === 'ArrowLeft') previous();
      if (event.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [next, previous, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex select-none flex-col bg-[#080808]"
      style={{ touchAction: 'none' }}
      onTouchStart={event => { touchStart.current = event.touches[0].clientX; }}
      onTouchEnd={event => {
        if (touchStart.current === null) return;
        const distance = event.changedTouches[0].clientX - touchStart.current;
        if (Math.abs(distance) > 50) distance < 0 ? next() : previous();
        touchStart.current = null;
      }}
    >
      <motion.div key={current.type} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className={`absolute inset-0 bg-gradient-to-b ${gradients[current.type] ?? gradients.intro}`} />
      <div className="absolute left-0 right-0 top-0 z-20 flex gap-1 px-4 pt-3">
        {slides.map((_, itemIndex) => <div key={itemIndex} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/20"><motion.div initial={{ scaleX: 0 }} animate={{ scaleX: itemIndex <= index ? 1 : 0 }} style={{ background: accent, transformOrigin: 'left' }} className="h-full" /></div>)}
      </div>
      <button onClick={onDismiss} aria-label="Close Annual Wrapped" className="absolute right-4 top-8 z-30 rounded-full bg-white/10 p-2 text-white/70"><X size={18} /></button>
      <p className="absolute left-4 top-8 z-20 text-xs font-medium tracking-wide text-white/35">{snapshot.year} BL WRAPPED</p>
      <button onClick={previous} aria-label="Previous slide" className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full p-2 text-white/50 hover:bg-white/10 md:block"><ChevronLeft size={22} /></button>
      <button onClick={next} aria-label="Next slide" className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full p-2 text-white/50 hover:bg-white/10 md:block"><ChevronRight size={22} /></button>
      <div className="relative flex-1" onClick={event => { if (event.clientX < window.innerWidth * 0.35) previous(); else next(); }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current.id}
            custom={direction}
            initial={{ x: direction * 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -60, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            {renderSlide(current, accent)}
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 text-xs text-white/30">{index + 1} / {slides.length}</p>
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
  const [autoPresented, setAutoPresented] = useState(false);
  useEffect(() => {
    if (!autoPresented && pendingAnnualSnapshot) {
      setAutoPresented(true);
      viewAnnualSnapshot(pendingAnnualSnapshot);
    }
  }, [autoPresented, pendingAnnualSnapshot, viewAnnualSnapshot]);
  if (!activeAnnualSnapshot) return null;
  return <AnimatePresence><AnnualWrappedPresentation key={activeAnnualSnapshot.year} snapshot={activeAnnualSnapshot} onDismiss={dismissAnnualPresentation} /></AnimatePresence>;
}