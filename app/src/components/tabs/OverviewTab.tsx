import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tv, ChevronLeft, ChevronRight, Clock, Sparkles } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import Poster from '../Poster';
import EntryModal from '../EntryModal';
import type { Entry } from '@/types';
import { getOngoingSchedule } from '@/lib/episodeSchedule';

function dailySeed(day: string, salt = '') {
  let seed = 0;
  for (const character of `${day}:${salt}`) seed = (seed * 31 + character.charCodeAt(0)) >>> 0;
  return seed;
}

function dailyShuffle<T>(values: T[], day: string, salt: string): T[] {
  const result = [...values];
  let seed = dailySeed(day, salt);
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/* ============================================================
   Airing Today - 3D Coverflow Carousel
   ============================================================ */
function AiringTodayCarousel({
  airingToday,
  onEntryClick
}: {
  airingToday: {
    entry: Entry;
    ongoing: { currentEpisode: number; totalEpisodes: number; airDays: string[] };
    schedule: ReturnType<typeof getOngoingSchedule>;
  }[];
  onEntryClick: (entry: Entry) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handlePrev = useCallback(() => {
    setActiveIndex(prev => (prev > 0 ? prev - 1 : airingToday.length - 1));
  }, [airingToday.length]);

  const handleNext = useCallback(() => {
    setActiveIndex(prev => (prev < airingToday.length - 1 ? prev + 1 : 0));
  }, [airingToday.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handlePrev, handleNext]);

  if (airingToday.length === 0) {
    return (
      <div className="relative h-64 rounded-2xl overflow-hidden bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] flex items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(229,9,20,0.08)_0%,_transparent_70%)]" />
        <div className="text-center relative z-10">
          <Tv className="w-10 h-10 text-[#444] mx-auto mb-3" />
          <p className="text-[#666] text-sm font-medium">No Airing BL Today</p>
          <p className="text-[#555] text-xs mt-1">Check back tomorrow for updates</p>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div className="relative select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-white font-bold text-base flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E50914] animate-pulse" />
            Airing Today
          </h2>
          <p className="text-[#888] text-xs mt-0.5">{today} &middot; {airingToday.length} series</p>
        </div>
        {airingToday.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors tap-active"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={handleNext}
              className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors tap-active"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* 3D Coverflow Carousel */}
      <div
        className="relative h-[360px] sm:h-[400px]"
        style={{ perspective: '1200px' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="relative w-full h-full"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {airingToday.map((item, index) => {
            const offset = index - activeIndex;
            const isActive = index === activeIndex;
            // Wrap around for infinite visual feel
            let visualOffset = offset;
            if (offset > airingToday.length / 2) visualOffset = offset - airingToday.length;
            if (offset < -airingToday.length / 2) visualOffset = offset + airingToday.length;

            const absVisual = Math.abs(visualOffset);

            // 3D Coverflow transforms
            const rotateY = visualOffset * -45; // degrees
            const translateX = visualOffset * 160; // px
            const translateZ = isActive ? 120 : -absVisual * 80;
            const scale = isActive ? 1 : Math.max(0.65, 1 - absVisual * 0.15);
            const opacity = isActive ? 1 : Math.max(0.35, 1 - absVisual * 0.3);
            const zIndex = airingToday.length - absVisual;

            // Card dimensions
            const cardWidth = isActive ? 200 : 150;
            const cardHeight = isActive ? 290 : 215;

            return (
              <motion.div
                key={item.entry.id}
                className="absolute top-1/2 left-1/2 cursor-pointer"
                style={{
                  zIndex,
                  transformStyle: 'preserve-3d',
                  marginLeft: -cardWidth / 2,
                  marginTop: -cardHeight / 2,
                }}
                animate={{
                  x: translateX,
                  scale,
                  opacity,
                  rotateY,
                  translateZ,
                }}
                transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                onClick={() => !isActive ? setActiveIndex(index) : onEntryClick(item.entry)}
              >
                <div className="relative flex flex-col items-center" style={{ transformStyle: 'preserve-3d' }}>
                  {/* Poster Card */}
                  <div
                    className={`relative rounded-2xl overflow-hidden shadow-2xl transition-shadow duration-300 ${
                      isActive
                        ? 'shadow-red-900/50 ring-1 ring-[#E50914]/30'
                        : 'shadow-black/70'
                    }`}
                    style={{
                      width: cardWidth,
                      height: cardHeight,
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {item.entry.poster ? (
                      <img
                        src={item.entry.poster}
                        alt={item.entry.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center">
                        <Tv className="w-10 h-10 text-[#444]" />
                      </div>
                    )}

                    {/* Glassmorphism overlay for active card */}
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    )}

                    {/* Subtle side shadow for depth on non-active cards */}
                    {!isActive && visualOffset > 0 && (
                      <div className="absolute inset-0 bg-gradient-to-l from-black/50 to-transparent" />
                    )}
                    {!isActive && visualOffset < 0 && (
                      <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
                    )}

                    {/* Active card info overlay */}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-white font-bold text-sm truncate">{item.entry.title}</p>
                        <p className="text-[#B3B3B3] text-[11px] mt-1">
                          {item.ongoing.airDays.join(', ')}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            item.schedule.isFinalEpisodeScheduledToday
                              ? 'text-amber-300 bg-amber-500/20'
                              : 'text-[#E50914] bg-[#E50914]/20'
                          }`}>
                            {item.schedule.isFinalEpisodeScheduledToday ? 'Final EP' : 'Airing Today'}
                          </span>
                        </div>
                        <div className="mt-1 space-y-0.5 text-[10px]">
                          <p className="text-[#B3B3B3]">
                            Watched: Ep {item.ongoing.currentEpisode} / {item.ongoing.totalEpisodes}
                          </p>
                          {item.schedule.isConfigured && (
                            <p className="text-white">
                              Latest aired: Ep {item.schedule.airedEpisode} / {item.schedule.totalEpisodes}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Non-active card title below */}
                  {!isActive && (
                    <p className="text-[#888] text-[11px] mt-2.5 truncate max-w-[130px] text-center">
                      {item.entry.title}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Dot indicators */}
        {airingToday.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 pb-2">
            {airingToday.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`rounded-full transition-all duration-300 ${
                  index === activeIndex
                    ? 'w-5 h-1.5 bg-[#E50914]'
                    : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Recently Added Entries (24h window)
   ============================================================ */
function RecentlyAddedSection({
  entries,
  onEntryClick
}: {
  entries: Entry[];
  onEntryClick: (entry: Entry) => void;
}) {
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  const recentEntries = useMemo(() => {
    return entries
      .filter(e => now - e.createdAt < twentyFourHours)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);
  }, [entries, now]);

  // Hide entire section if no qualifying entries
  if (recentEntries.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-[#E50914]" />
        <h2 className="text-white font-bold text-base">Recently Added</h2>
        <span className="text-[#666] text-xs">({recentEntries.length})</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {recentEntries.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onEntryClick(entry)}
            className="flex-shrink-0 w-28 text-left"
          >
            <Poster src={entry.poster} title={entry.title} size="lg" className="w-28 h-40 rounded-xl" />
            <p className="text-white text-xs font-medium mt-2 truncate">{entry.title}</p>
            <p className="text-[#888] text-[10px]">{entry.year}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Curated Rewatch Picks
   ============================================================ */
function RewatchPicksSection({
  entries,
  favorites,
  onEntryClick
}: {
  entries: Entry[];
  favorites: Entry[];
  onEntryClick: (entry: Entry) => void;
}) {
  const [today, setToday] = useState(() => new Date().toDateString());
  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextDay = new Date().toDateString();
      setToday((current) => current === nextDay ? current : nextDay);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const picks = useMemo(() => {
    const shuffledFavs = dailyShuffle(favorites, today, 'favorites');
    const nonFavEntries = entries.filter(e => !favorites.some(f => f.id === e.id));
    const shuffledGeneral = dailyShuffle(nonFavEntries, today, 'general');
    const droppedEntries = entries.filter(e => e.status === 'DROPPED');
    const shuffledDropped = dailyShuffle(droppedEntries, today, 'dropped');

    const selected: Entry[] = [];

    // 2 Favorites
    for (let i = 0; i < Math.min(2, shuffledFavs.length); i++) {
      selected.push(shuffledFavs[i]);
    }

    // 2 General List Entries (not favorites, not dropped)
    const generalCandidates = shuffledGeneral.filter(e => e.status !== 'DROPPED');
    for (let i = 0; i < Math.min(2, generalCandidates.length); i++) {
      if (!selected.some(s => s.id === generalCandidates[i].id)) {
        selected.push(generalCandidates[i]);
      }
    }

    // 1 Dropped Entry
    for (let i = 0; i < Math.min(1, shuffledDropped.length); i++) {
      if (!selected.some(s => s.id === shuffledDropped[i].id)) {
        selected.push(shuffledDropped[i]);
      }
    }

    // If we don't have 5, fill with random entries
    if (selected.length < 5) {
      const remaining = dailyShuffle(entries, today, 'remaining').filter(e => !selected.some(s => s.id === e.id));
      while (selected.length < 5 && remaining.length > 0) {
        selected.push(remaining.shift()!);
      }
    }

    return dailyShuffle(selected, today, 'final');
  }, [entries, favorites, today]);

  if (picks.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-yellow-400" />
        <h2 className="text-white font-bold text-base">Top Rewatch Picks</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {picks.map((entry) => {
          const isFav = favorites.some(f => f.id === entry.id);
          return (
            <button
              key={entry.id}
              onClick={() => onEntryClick(entry)}
              className="flex-shrink-0 w-28 text-left"
            >
              <div className="relative">
                <Poster src={entry.poster} title={entry.title} size="lg" className="w-28 h-40 rounded-xl" />
                {isFav && (
                  <div className="absolute top-1.5 right-1.5 bg-[#E50914] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    <span className="flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" />
                      Top
                    </span>
                  </div>
                )}
              </div>
              <p className="text-white text-xs font-medium mt-2 truncate">{entry.title}</p>
              <p className="text-[#888] text-[10px]">{entry.year}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const REWATCH_GROUPS = [
  { country: 'Thailand', title: 'Thai BLs That Hit Different' },
  { country: 'China', title: 'Chinese BLs Worth the Eternal Wait' },
  { country: 'Japan', title: 'Senpai, Again? A Must-Rewatch JBLs' },
  { country: 'South Korea', title: 'K-BLs You Can Binge in One Sitting' },
  { country: 'Taiwan', title: 'Bold Taiwanese BLs on Repeat' },
  { country: 'Other', title: 'Mainstream BLs That Live in Our Heads Rent-Free' },
] as const;

function CountryRewatchSections({ entries, onEntryClick }: { entries: Entry[]; onEntryClick: (entry: Entry) => void }) {
  const [today, setToday] = useState(() => new Date().toDateString());
  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextDay = new Date().toDateString();
      setToday((current) => current === nextDay ? current : nextDay);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const groups = REWATCH_GROUPS.map((group) => ({
    ...group,
    entries: dailyShuffle(
      entries.filter((entry) => entry.status === 'COMPLETE' && entry.country === group.country),
      today,
      group.country,
    ).slice(0, 5),
  })).filter((group) => group.entries.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.country}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <h2 className="text-white font-bold text-base">{group.title}</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {group.entries.map((entry) => (
              <button key={entry.id} onClick={() => onEntryClick(entry)} className="flex-shrink-0 w-28 text-left">
                <Poster src={entry.poster} title={entry.title} size="lg" className="w-28 h-40 rounded-xl" />
                <p className="text-white text-xs font-medium mt-2 truncate">{entry.title}</p>
                <p className="text-[#888] text-[10px]">{entry.year}</p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   Main Overview Tab
   ============================================================ */
export default function OverviewTab() {
  const { state } = useApp();
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const airingToday = useMemo(() => {
    return state.ongoing
      .map(o => ({ ongoing: o, schedule: getOngoingSchedule(o, now) }))
      .filter(({ schedule }) => schedule.isAiringToday || schedule.isFinalEpisodeScheduledToday)
      .map(o => {
        const entry = state.entries.find(e => e.id === o.ongoing.entryId);
          return entry
            ? { entry, ongoing: o.ongoing, schedule: o.schedule }
            : null;
      })
       .filter(Boolean) as {
         entry: Entry;
         ongoing: typeof state.ongoing[number];
         schedule: ReturnType<typeof getOngoingSchedule>;
       }[];
  }, [state, now]);

  // Entries for Recently Added (General List only)
  const generalListEntries = useMemo(() => {
    return state.entries;
  }, [state.entries]);

  // Entries for Rewatch Picks
  const favoritedEntries = useMemo(() => {
    return state.favorites
      .map(f => state.entries.find(e => e.id === f.entryId))
      .filter(Boolean) as Entry[];
  }, [state.favorites, state.entries]);

  return (
    <div className="space-y-8 w-full">
      {/* Airing Today Hero - 3D Coverflow */}
      <AiringTodayCarousel
        airingToday={airingToday}
        onEntryClick={setSelectedEntry}
      />

      {/* Recently Added Entries */}
      <RecentlyAddedSection
        entries={generalListEntries}
        onEntryClick={setSelectedEntry}
      />

      {/* Curated Rewatch Picks */}
      <RewatchPicksSection
        entries={state.entries}
        favorites={favoritedEntries}
        onEntryClick={setSelectedEntry}
      />

      <CountryRewatchSections
        entries={state.entries}
        onEntryClick={setSelectedEntry}
      />

      {/* Entry Detail Modal */}
      <EntryModal
        isOpen={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        entry={selectedEntry}
      />
    </div>
  );
}
