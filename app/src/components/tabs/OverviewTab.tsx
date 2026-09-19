import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Tv,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  BarChart3,
  Play,
  CalendarClock,
  CheckCircle2,
  Heart,
  Star,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatSeasonLabel } from '@/lib/entry';
import Poster from '../Poster';
import RatingCircle from '../RatingCircle';
import EntryModal from '../EntryModal';
import type { Entry, OngoingEntry } from '@/types';
import { getNextUpcomingRelease, getOngoingSchedule, type UpcomingRelease } from '@/lib/episodeSchedule';
import { formatRating } from '@/lib/rating';

const RECENTLY_ADDED_WINDOW = 24 * 60 * 60 * 1000;

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
                        // These cards are visible in the initial 3D carousel,
                        // but their transforms can confuse browser lazy-load
                        // visibility checks until the user interacts.
                        loading="eager"
                        decoding="async"
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
                        {item.entry.season != null && (
                          <p className="text-[#777] text-[10px]">{formatSeasonLabel(item.entry.season)}</p>
                        )}
                        <p className="text-[#B3B3B3] text-[11px] mt-1">
                          {item.ongoing.airDays.join(', ')}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                           <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                             item.schedule.isFinalEpisodeScheduledToday
                               ? 'text-orange-300 bg-orange-500/20'
                               : item.schedule.isSpecialEpisodeScheduledToday
                                 ? 'text-yellow-300 bg-yellow-400/20'
                                 : 'text-[#E50914] bg-[#E50914]/20'
                           }`}>
                             {item.schedule.isFinalEpisodeScheduledToday
                               ? 'Final EP'
                               : item.schedule.isSpecialEpisodeScheduledToday
                                 ? 'Special Episode'
                                 : 'Airing Today'}
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
   Personal Watchlist Snapshot
   ============================================================ */
function PersonalSnapshot({
  total,
  ongoing,
  completed,
  planned,
  favorites,
  averageRating,
}: {
  total: number;
  ongoing: number;
  completed: number;
  planned: number;
  favorites: number;
  averageRating: number | null;
}) {
  const metrics = [
    { label: 'Total BLs', value: total, icon: BarChart3, color: 'text-white' },
    { label: 'Watching', value: ongoing, icon: Play, color: 'text-red-300' },
    { label: 'Completed', value: completed, icon: CheckCircle2, color: 'text-emerald-300' },
    { label: 'Planned', value: planned, icon: CalendarClock, color: 'text-amber-300' },
    { label: 'Favorites', value: favorites, icon: Heart, color: 'text-pink-300' },
    {
      label: 'Avg. rating',
      value: averageRating === null ? '—' : formatRating(averageRating),
      icon: Star,
      color: 'text-yellow-300',
    },
  ];

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3 py-3 sm:px-4">
      <div className="mb-2.5 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-[#E50914]" />
        <h2 className="text-sm font-bold text-white">Your watchlist</h2>
        <span className="text-[11px] text-[#666]">personal snapshot</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.07] overflow-hidden rounded-xl border border-white/[0.06] bg-black/10 sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex min-w-0 items-center gap-2 px-3 py-2.5 lg:px-3.5">
            <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
            <div className="min-w-0">
              <p className="text-[10px] leading-none text-[#777]">{label}</p>
              <p className="mt-1 text-sm font-bold leading-none text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ContinueWatchingSection({
  items,
  onEntryClick,
}: {
  items: {
    entry: Entry;
    ongoingData: OngoingEntry;
    schedule: ReturnType<typeof getOngoingSchedule>;
  }[];
  onEntryClick: (entry: Entry) => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Play className="h-4 w-4 text-[#E50914]" />
        <h2 className="text-base font-bold text-white">Continue Watching</h2>
        <span className="text-xs text-[#666]">{items.length} in progress</span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-5 text-center">
          <p className="text-sm text-[#777]">Nothing in progress right now.</p>
          <p className="mt-1 text-xs text-[#555]">Titles you start watching will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {items.slice(0, 6).map(({ entry, ongoingData, schedule }) => {
            const totalEpisodes = schedule.totalEpisodes || ongoingData.totalEpisodes;
            const watchedEpisodes = Math.min(totalEpisodes, Math.max(0, ongoingData.currentEpisode));
            const progress = totalEpisodes > 0 ? (watchedEpisodes / totalEpisodes) * 100 : 0;
            const watchedSpecials = (ongoingData.specialEpisodes || []).filter((special) => special.watched).length;
            const specialCount = (ongoingData.specialEpisodes || []).length;
            const status = schedule.isSpecialEpisodeScheduledToday
              ? 'Special episode today'
              : schedule.isAiringToday
                ? 'Airing today'
                : schedule.isConfigured && schedule.airedEpisode !== null
                  ? `Latest aired: Ep ${schedule.airedEpisode}`
                  : 'In progress';

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onEntryClick(entry)}
                className="group flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#141414] p-3 text-left transition-colors hover:border-white/[0.16] hover:bg-white/[0.055]"
              >
                <Poster src={entry.poster} title={entry.title} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-bold text-white group-hover:text-[#ff6670]">{entry.title}</p>
                    <span className="shrink-0 rounded-full bg-[#E50914]/15 px-2 py-0.5 text-[9px] font-semibold text-red-200">
                      Watching
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#B3B3B3]">
                    Ep {watchedEpisodes} / {totalEpisodes}
                    {specialCount > 0 && ` · Specials ${watchedSpecials}/${specialCount}`}
                  </p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#E50914] transition-all"
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 truncate text-[10px] text-[#777]">{status}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function formatReleaseDate(date: Date, now: Date): string {
  if (date.toDateString() === now.toDateString()) return 'Today';
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatReleaseCountdown(release: UpcomingRelease, now: Date): string {
  if (!release.hasExactTime) return formatReleaseDate(release.releaseAt, now);
  const difference = release.releaseAt.getTime() - now.getTime();
  if (difference <= 0) return 'Available now';

  const totalMinutes = Math.ceil(difference / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${minutes}m`;
  return `in ${minutes}m`;
}

function UpcomingReleasesSection({
  releases,
  now,
  onEntryClick,
}: {
  releases: { entry: Entry; ongoingData: OngoingEntry; release: UpcomingRelease }[];
  now: Date;
  onEntryClick: (entry: Entry) => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-[#E50914]" />
        <h2 className="text-base font-bold text-white">Upcoming Releases</h2>
        <span className="text-xs text-[#666]">what&apos;s next</span>
      </div>

      {releases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-5 text-center">
          <p className="text-sm text-[#777]">No upcoming releases on your current watchlist.</p>
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {releases.slice(0, 6).map(({ entry, release }) => {
            const releaseTitle = release.type === 'special'
              ? `Special ${release.specialEpisode?.specialNumber ?? ''} · ${release.specialEpisode?.title ?? 'Special Episode'}`
              : `Episode ${release.episodeNumber ?? 'next'} / ${entry.type === 'Series' ? 'series' : 'title'}`;

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onEntryClick(entry)}
                className="group flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#141414] p-3 text-left transition-colors hover:border-white/[0.16] hover:bg-white/[0.055]"
              >
                <Poster src={entry.poster} title={entry.title} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white group-hover:text-[#ff6670]">{entry.title}</p>
                  <p className="mt-1 truncate text-[10px] text-[#B3B3B3]">{releaseTitle}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
                    <span className="text-[#E50914]">{formatReleaseDate(release.releaseAt, now)}</span>
                    <span className="truncate text-[#777]">{formatReleaseCountdown(release, now)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function RecentlyCompletedSection({
  entries,
  ratingByEntryId,
  onEntryClick,
}: {
  entries: Entry[];
  ratingByEntryId: ReadonlyMap<string, number>;
  onEntryClick: (entry: Entry) => void;
}) {
  if (entries.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
        <h2 className="text-base font-bold text-white">Recently Completed</h2>
        <span className="text-xs text-[#666]">freshly finished</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {entries.slice(0, 10).map((entry) => {
          const rating = ratingByEntryId.get(entry.id);
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onEntryClick(entry)}
              className="group relative w-28 shrink-0 text-left"
            >
              <div className="relative">
                <Poster src={entry.poster} title={entry.title} size="lg" className="h-40 w-28 rounded-xl" />
                {rating !== undefined && (
                  <div className="absolute right-1.5 top-1.5 rounded-full bg-black/70 backdrop-blur-sm">
                    <RatingCircle rating={rating} size={30} />
                  </div>
                )}
              </div>
              <p className="mt-2 truncate text-xs font-medium text-white group-hover:text-[#ff6670]">{entry.title}</p>
              <p className="mt-0.5 truncate text-[10px] text-[#777]">
                {entry.year} · {entry.type}
              </p>
            </button>
          );
        })}
      </div>
    </section>
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
  const [now] = useState(() => Date.now());

  const recentEntries = useMemo(() => {
    return entries
      .filter(e => now - e.createdAt < RECENTLY_ADDED_WINDOW)
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
            {entry.season != null && (
              <p className="text-[#777] text-[10px]">{formatSeasonLabel(entry.season)}</p>
            )}
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
function RewatchPosterCard({
  entry,
  rating,
  isFavorite = false,
  onClick,
}: {
  entry: Entry;
  rating: number;
  isFavorite?: boolean;
  onClick: () => void;
}) {
  const hasRating = Number.isFinite(rating) && rating > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View details for ${entry.title}`}
      className="group relative block w-[min(74vw,220px)] shrink-0 snap-start text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E50914] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808] sm:w-[210px] lg:w-[clamp(210px,17.5vw,250px)]"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/[0.12] bg-[#151515] shadow-xl transition-all duration-300 group-hover:-translate-y-1 group-hover:border-white/[0.25]">
        <Poster
          src={entry.poster}
          title={entry.title}
          size="lg"
          className="!h-full !w-full !rounded-2xl transition-transform duration-500 group-hover:scale-[1.03]"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/95" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {isFavorite && (
          <div className="absolute left-3 top-3 rounded-full bg-[#E50914] px-2.5 py-1 text-[9px] font-bold text-white shadow-lg">
            <span className="flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" />
              Top
            </span>
          </div>
        )}

        <div className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 shadow-lg backdrop-blur-md">
          {hasRating ? (
            <RatingCircle rating={rating} size={44} />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/20 text-xs font-semibold text-white/60">
              —
            </div>
          )}
        </div>

        <div className="absolute inset-x-4 bottom-4">
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/60">
            Rewatch pick
          </p>
          <h3 className="line-clamp-2 text-base font-bold leading-tight text-white transition-colors group-hover:text-[#ff6670] sm:text-lg">
            {entry.title}
          </h3>
          <p className="mt-1.5 text-[11px] text-white/75">
            {entry.year}
            <span className="mx-1.5 text-white/35">•</span>
            {entry.type}
            {entry.season != null && (
              <>
                <span className="mx-1.5 text-white/35">•</span>
                {formatSeasonLabel(entry.season)}
              </>
            )}
          </p>
        </div>
      </div>
    </button>
  );
}

function RewatchPosterCarousel({
  entries,
  favorites,
  ratingByEntryId,
  onEntryClick,
}: {
  entries: Entry[];
  favorites?: Entry[];
  ratingByEntryId: ReadonlyMap<string, number>;
  onEntryClick: (entry: Entry) => void;
}) {
  return (
    <div>
      <div
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-5 pt-2 scrollbar-hide sm:gap-5"
      >
        {entries.map((entry) => (
          <RewatchPosterCard
            key={entry.id}
            entry={entry}
            rating={ratingByEntryId.get(entry.id) ?? 0}
            isFavorite={favorites?.some((favorite) => favorite.id === entry.id)}
            onClick={() => onEntryClick(entry)}
          />
        ))}
      </div>
    </div>
  );
}

function RewatchPicksSection({
  entries,
  favorites,
  ratingByEntryId,
  onEntryClick
}: {
  entries: Entry[];
  favorites: Entry[];
  ratingByEntryId: ReadonlyMap<string, number>;
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
      <RewatchPosterCarousel
        entries={picks}
        favorites={favorites}
        ratingByEntryId={ratingByEntryId}
        onEntryClick={onEntryClick}
      />
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

function CountryRewatchSections({
  entries,
  ratingByEntryId,
  onEntryClick,
}: {
  entries: Entry[];
  ratingByEntryId: ReadonlyMap<string, number>;
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
          <RewatchPosterCarousel
            entries={group.entries}
            ratingByEntryId={ratingByEntryId}
            onEntryClick={onEntryClick}
          />
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
       .filter(({ schedule }) =>
         schedule.isAiringToday ||
         schedule.isSpecialEpisodeScheduledToday ||
         schedule.isFinalEpisodeScheduledToday,
       )
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

  const ratingByEntryId = useMemo(() => {
    const ratings = new Map<string, number>();
    state.favorites.forEach((rating) => ratings.set(rating.entryId, rating.overallRating));
    state.ratings.forEach((rating) => ratings.set(rating.entryId, rating.overallRating));
    return ratings;
  }, [state.favorites, state.ratings]);

  const ongoingItems = useMemo(() => {
    return state.entries
      .filter((entry) => entry.status === 'ONGOING')
      .map((entry) => {
        const ongoingData = state.ongoing.find((ongoing) => ongoing.entryId === entry.id);
        return ongoingData
          ? { entry, ongoingData, schedule: getOngoingSchedule(ongoingData, now) }
          : null;
      })
      .filter(Boolean) as {
        entry: Entry;
        ongoingData: OngoingEntry;
        schedule: ReturnType<typeof getOngoingSchedule>;
      }[];
  }, [state.entries, state.ongoing, now]);

  const continueWatching = useMemo(() => {
    return [...ongoingItems].sort((a, b) => {
      const aHasStarted = a.ongoingData.currentEpisode > 0 ||
        (a.ongoingData.specialEpisodes || []).some((special) => special.watched);
      const bHasStarted = b.ongoingData.currentEpisode > 0 ||
        (b.ongoingData.specialEpisodes || []).some((special) => special.watched);
      return Number(bHasStarted) - Number(aHasStarted)
        || b.entry.lastUpdatedAt - a.entry.lastUpdatedAt
        || a.entry.title.localeCompare(b.entry.title);
    });
  }, [ongoingItems]);

  const upcomingReleases = useMemo(() => {
    return ongoingItems
      .map(({ entry, ongoingData }) => {
        const release = getNextUpcomingRelease(ongoingData, now);
        return release ? { entry, ongoingData, release } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a!.release.releaseAt.getTime() - b!.release.releaseAt.getTime()) as {
        entry: Entry;
        ongoingData: OngoingEntry;
        release: UpcomingRelease;
      }[];
  }, [ongoingItems, now]);

  const recentlyCompleted = useMemo(() => {
    return state.entries
      .filter((entry) => entry.status === 'COMPLETE')
      .sort((a, b) =>
        (b.lastUpdatedAt || b.createdAt) - (a.lastUpdatedAt || a.createdAt),
      );
  }, [state.entries]);

  const averageRating = useMemo(() => {
    const values = [...ratingByEntryId.values()].filter((rating) => Number.isFinite(rating) && rating > 0);
    if (values.length === 0) return null;
    return values.reduce((sum, rating) => sum + rating, 0) / values.length;
  }, [ratingByEntryId]);

  return (
    <div className="space-y-8 w-full">
      {/* Personal Snapshot */}
      <PersonalSnapshot
        total={state.entries.length}
        ongoing={state.entries.filter((entry) => entry.status === 'ONGOING').length}
        completed={state.entries.filter((entry) => entry.status === 'COMPLETE').length}
        planned={state.entries.filter((entry) => entry.status === 'PLANNED').length}
        favorites={state.favorites.length}
        averageRating={averageRating}
      />

      {/* Continue Watching */}
      <ContinueWatchingSection
        items={continueWatching}
        onEntryClick={setSelectedEntry}
      />

      {/* Upcoming Releases */}
      <UpcomingReleasesSection
        releases={upcomingReleases}
        now={now}
        onEntryClick={setSelectedEntry}
      />

      {/* Recently Completed */}
      <RecentlyCompletedSection
        entries={recentlyCompleted}
        ratingByEntryId={ratingByEntryId}
        onEntryClick={setSelectedEntry}
      />

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
        ratingByEntryId={ratingByEntryId}
        onEntryClick={setSelectedEntry}
      />

      <CountryRewatchSections
        entries={state.entries}
        ratingByEntryId={ratingByEntryId}
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
