import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Star,
  Globe,
  Heart,
  Trophy,
  Calendar,
  TrendingUp,
  CheckCircle,
  XCircle,
  Film,
  Tv,
  ChevronRight,
  BookOpen,
  Lock,
  Sparkles,
  Crown,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatRating } from '@/lib/rating';
import {
  WATCHER_TITLES,
  computeProfileProgress,
  type AchievementStatus,
  type PersonalityTrait,
} from '@/lib/profileProgress';

/* ============================================================
   Section Header Component
   ============================================================ */
function SectionHeader({
  title,
  icon: Icon,
  action,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-[#E50914]" />
      <h3 className="text-white font-bold text-sm uppercase tracking-wider">{title}</h3>
      <div className="flex-1 h-px bg-white/[0.06] ml-2" />
      {action}
    </div>
  );
}

function ProfilePortalModal({
  isOpen,
  zIndexClass = 'z-[105]',
  children,
}: {
  isOpen: boolean;
  zIndexClass?: string;
  children: React.ReactNode;
}) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className={`fixed inset-0 ${zIndexClass} pointer-events-auto`}>
          {children}
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ============================================================
   BL Watcher Profile Component
   ============================================================ */
export default function BLWatcherProfile({
  onBack,
  initialSection,
}: {
  onBack: () => void;
  initialSection?: 'title' | 'personality' | 'achievements';
}) {
  const { state, dispatch } = useApp();
  const [watchingSinceInput, setWatchingSinceInput] = useState(
    state.watchingSince?.toString() || '',
  );
  const [showTitlesModal, setShowTitlesModal] = useState(false);
  const [showAllPersonalities, setShowAllPersonalities] = useState(false);
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [selectedTrait, setSelectedTrait] = useState<PersonalityTrait | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementStatus | null>(null);
  const [activeRecordModal, setActiveRecordModal] = useState<'highestSeries' | 'highestMovie' | 'mostWatchedCountry' | null>(null);

  const titleSectionRef = useRef<HTMLDivElement>(null);
  const personalitySectionRef = useRef<HTMLDivElement>(null);
  const achievementsSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialSection) return;
    const targetRef = initialSection === 'personality'
      ? personalitySectionRef
      : initialSection === 'achievements'
        ? achievementsSectionRef
        : titleSectionRef;
    const timer = window.setTimeout(() => {
      targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [initialSection]);

  const progress = useMemo(() => computeProfileProgress(state), [state]);
  const {
    total,
    completed,
    ongoing,
    dropped,
    planned,
    favorites,
    top10,
    avgRating,
    countryBreakdown,
    highestRated,
    watchingSince,
    currentYear,
    experience,
    currentTitle,
    nextTitle,
    progressPercent,
    movies,
    series,
    perfectRatings,
    personalityTraits,
    allPersonalityTraits,
    achievements,
  } = progress;

  /* ---- Personal Records ---- */
  const personalRecords = useMemo(() => {
    // Highest Rated Series (with ties)
    const seriesRatings = highestRated.filter((h) => h.type === 'Series');
    const maxSeriesRating = seriesRatings[0]?.rating || 0;
    const highestSeriesTied = seriesRatings.filter((s) => s.rating === maxSeriesRating);
    const highestSeries = seriesRatings[0] || null;

    // Highest Rated Movie (with ties)
    const movieRatings = highestRated.filter((h) => h.type === 'Movie');
    const maxMovieRating = movieRatings[0]?.rating || 0;
    const highestMovieTied = movieRatings.filter((m) => m.rating === maxMovieRating);
    const highestMovie = movieRatings[0] || null;

    // Most Watched Country (with ties)
    const maxCountryCount = countryBreakdown[0]?.[1] || 0;
    const mostWatchedCountryTied = countryBreakdown.filter(([, count]) => count === maxCountryCount);
    const favoriteCountry = countryBreakdown[0] || null;

    // Completion & Drop rates
    const completedPct = total > 0 ? (completed / total) * 100 : 0;
    const plannedPct = total > 0 ? (planned / total) * 100 : 0;
    const ongoingPct = total > 0 ? (ongoing / total) * 100 : 0;
    const droppedPct = total > 0 ? (dropped / total) * 100 : 0;

    // Most common status
    const statusCounts = [
      { status: 'Completed', count: completed },
      { status: 'Planned', count: planned },
      { status: 'Ongoing', count: ongoing },
      { status: 'Dropped', count: dropped },
    ];
    const mostCommonStatus = statusCounts.sort((a, b) => b.count - a.count)[0];

    // Preferred format
    const preferredFormat = movies > series
      ? 'Movie'
      : series > movies
        ? 'Series'
        : 'Balanced';

    // Preferred Country
    const preferredCountry = countryBreakdown[0]?.[0] || '—';

    // Favorite Rating Category
    const ratedFavorites = state.favorites;
    const favCategoryAvgs = ratedFavorites.length > 0 ? [
      { name: 'Storyline', avg: ratedFavorites.reduce((s, f) => s + f.storyline, 0) / ratedFavorites.length },
      { name: 'Acting', avg: ratedFavorites.reduce((s, f) => s + f.acting, 0) / ratedFavorites.length },
      { name: 'Music', avg: ratedFavorites.reduce((s, f) => s + f.music, 0) / ratedFavorites.length },
      { name: 'Chemistry', avg: ratedFavorites.reduce((s, f) => s + f.chemistry, 0) / ratedFavorites.length },
      { name: 'Production', avg: ratedFavorites.reduce((s, f) => s + (f.production ?? f.cinematography ?? 0), 0) / ratedFavorites.length },
    ].sort((a, b) => b.avg - a.avg)[0]?.name || '—' : '—';

    // Top 10 stats
    const totalRankedEntries = state.top10Drawers.reduce((sum, d) => sum + d.entries.length, 0);
    const earliestRankingYear = state.top10Drawers.length > 0
      ? Math.min(...state.top10Drawers.map((d) => d.year))
      : null;
    const latestRankingYear = state.top10Drawers.length > 0
      ? Math.max(...state.top10Drawers.map((d) => d.year))
      : null;

    return {
      highestSeries,
      highestSeriesTied,
      highestMovie,
      highestMovieTied,
      favoriteCountry,
      mostWatchedCountryTied,
      totalFavorites: favorites,
      totalTop10Drawers: top10,
      totalRankedEntries,
      earliestRankingYear,
      latestRankingYear,
      avgRating,
      completionRate: completedPct.toFixed(1),
      plannedRate: plannedPct.toFixed(1),
      ongoingRate: ongoingPct.toFixed(1),
      dropRate: droppedPct.toFixed(1),
      mostCommonStatus: mostCommonStatus?.status || '—',
      preferredFormat,
      preferredCountry,
      favoriteRatingCategory: favCategoryAvgs,
      countriesRepresented: countryBreakdown.length,
      totalMovies: movies,
      totalSeries: series,
      perfectRatings,
    };
  }, [highestRated, countryBreakdown, total, completed, dropped, planned, ongoing, favorites, top10, avgRating, movies, series, perfectRatings, state.favorites, state.top10Drawers]);

  /* ---- Collection Insights ---- */
  const insights = useMemo(() => {
    const parts: string[] = [];

    if (watchingSince && experience > 0) {
      parts.push(`Over the past ${experience} years, you've built a collection of `);
    } else {
      parts.push('You have built a collection of ');
    }

    parts.push(`${total} BL title${total !== 1 ? 's' : ''}`);

    if (countryBreakdown.length >= 3) {
      parts.push(` spanning ${countryBreakdown.length} countries`);
    }

    parts.push('. ');

    if (ongoing > 0) {
      parts.push(`You actively follow ${ongoing} ongoing release${ongoing !== 1 ? 's' : ''}, `);
    }

    if (favorites > 0) {
      parts.push(`have rated ${favorites} favorite${favorites !== 1 ? 's' : ''}, `);
    }

    if (top10 > 0) {
      parts.push(`and maintain Top 10 rankings for ${top10} year${top10 !== 1 ? 's' : ''}`);
    }

    if (!parts[parts.length - 1].endsWith('. ')) {
      parts.push(', creating a well-curated archive of the genre');
    }

    parts.push('.');

    return parts.join('');
  }, [watchingSince, experience, total, countryBreakdown.length, ongoing, favorites, top10]);

  /* ---- Handlers ---- */
  const handleWatchingSinceChange = useCallback((value: string) => {
    setWatchingSinceInput(value);
    const year = parseInt(value, 10);
    if (!isNaN(year) && year >= 1980 && year <= currentYear) {
      dispatch({ type: 'SET_WATCHING_SINCE', payload: year });
    } else if (value === '') {
      dispatch({ type: 'SET_WATCHING_SINCE', payload: null });
    }
  }, [dispatch, currentYear]);

  const unlockedAchievementCount = achievements.filter((a) => a.unlocked).length;
  const lockedTraits = allPersonalityTraits.filter((t) => !t.unlocked);

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-black overflow-y-auto"
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-white font-bold text-base">BL Watcher Profile</h1>
          <button
            type="button"
            onClick={onBack}
            aria-label="Close BL Watcher Profile"
            className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-8 max-w-2xl mx-auto">

        {/* ===== 1. PROFILE HEADER ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center"
        >
          <button
            type="button"
            onClick={() => setShowTitlesModal(true)}
            className="group inline-flex flex-col items-center focus:outline-none"
          >
            <div className="text-6xl mb-3 transition-transform group-hover:scale-105">{currentTitle.emoji}</div>
            <h2 className="text-2xl font-extrabold text-white mb-2 group-hover:text-[#E50914] transition-colors">
              {currentTitle.emoji} {currentTitle.name}
            </h2>
          </button>
          <p className="text-[#888] text-sm italic max-w-sm mx-auto">
            &ldquo;{currentTitle.description}&rdquo;
          </p>

          {/* Stats Row */}
          <div className="flex items-center justify-center gap-6 mt-5">
            <div className="text-center">
              <p className="text-white font-bold text-lg">{total}</p>
              <p className="text-[#888] text-[10px] uppercase tracking-wider">Collection</p>
            </div>
            <div className="w-px h-8 bg-white/[0.1]" />
            <div className="text-center">
              <p className="text-white font-bold text-lg">{watchingSince || '—'}</p>
              <p className="text-[#888] text-[10px] uppercase tracking-wider">Watching Since</p>
            </div>
            <div className="w-px h-8 bg-white/[0.1]" />
            <div className="text-center">
              <p className="text-white font-bold text-lg">{experience > 0 ? `${experience} Years` : '—'}</p>
              <p className="text-[#888] text-[10px] uppercase tracking-wider">Experience</p>
            </div>
          </div>
        </motion.div>

        {/* ===== 2. WATCHING SINCE INPUT ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4"
        >
          <SectionHeader title="Watching Since" icon={Calendar} />
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={watchingSinceInput}
              onChange={(e) => handleWatchingSinceChange(e.target.value)}
              placeholder={currentYear.toString()}
              min={1980}
              max={currentYear}
              className="bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3 text-white text-sm w-full focus:outline-none focus:border-[#E50914]/50 transition-colors placeholder:text-[#555]"
            />
          </div>
          <p className="text-[#666] text-xs mt-2">
            Enter the year you started watching BL. This is for your personal profile only.
          </p>
        </motion.div>

        {/* ===== 3. COLLECTION PROGRESS ===== */}
        <motion.div
          ref={titleSectionRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4"
        >
          <SectionHeader
            title="Collection Progress"
            icon={TrendingUp}
            action={
              <button
                type="button"
                onClick={() => setShowTitlesModal(true)}
                className="flex items-center gap-1 text-[#E50914] text-xs font-semibold hover:underline"
              >
                All Titles <ChevronRight className="w-3 h-3" />
              </button>
            }
          />

          <button
            type="button"
            onClick={() => setShowTitlesModal(true)}
            className="w-full text-center mb-4 rounded-xl py-2 hover:bg-white/[0.03] transition-colors"
          >
            <p className="text-[#888] text-xs uppercase tracking-wider">Current Title</p>
            <p className="text-white font-bold text-lg mt-1">{currentTitle.emoji} {currentTitle.name}</p>
          </button>

          {/* Progress Bar */}
          <div className="relative">
            <div className="w-full h-3 bg-white/[0.08] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#E50914] via-[#ff2d55] to-[#ff6b35] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[#888] text-xs">{total} titles</span>
              {nextTitle && (
                <span className="text-[#E50914] text-xs font-medium">
                  Next: {nextTitle.emoji} {nextTitle.name} ({nextTitle.min})
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* ===== 4. COLLECTION PERSONALITY ===== */}
        <motion.div
          ref={personalitySectionRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4"
        >
          <SectionHeader
            title="Collection Personality"
            icon={Heart}
            action={
              <span className="text-[#888] text-xs font-semibold">
                {personalityTraits.length} / {allPersonalityTraits.length}
              </span>
            }
          />

          {personalityTraits.length === 0 ? (
            <p className="text-[#666] text-sm text-center py-4">Keep collecting to discover your personality traits</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {personalityTraits.slice(0, 6).map((trait) => (
                <button
                  type="button"
                  key={trait.id}
                  onClick={() => setSelectedTrait(trait)}
                  className="text-left bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.09] rounded-xl px-3 py-2.5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{trait.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{trait.name}</p>
                      <p className="text-[#888] text-[11px] truncate">{trait.shortDesc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Always allow viewing all 28 personality traits & unlock requirements */}
          <button
            type="button"
            onClick={() => setShowAllPersonalities(true)}
            className="flex items-center gap-1 text-[#E50914] text-xs font-semibold mt-3 hover:underline"
          >
            {personalityTraits.length > 6 ? 'See More' : `View All (${personalityTraits.length}/${allPersonalityTraits.length})`}
            <ChevronRight className="w-3 h-3" />
          </button>
        </motion.div>

        {/* ===== 5. ACHIEVEMENT SHOWCASE ===== */}
        <motion.div
          ref={achievementsSectionRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4"
        >
          <SectionHeader title="Achievement Showcase" icon={Trophy} />

          {/* Unlocked Count */}
          <div className="text-center mb-3">
            <span className="text-[#E50914] font-bold text-sm">
              {unlockedAchievementCount} / {achievements.length} Achievements Unlocked
            </span>
          </div>

          {/* Preview Grid (first 6 unlocked, or first 6 total if none) */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {(unlockedAchievementCount > 0
              ? achievements.filter((a) => a.unlocked).slice(0, 6)
              : achievements.slice(0, 6)
            ).map((ach) => (
              <button
                type="button"
                key={ach.id}
                onClick={() => setSelectedAchievement(ach)}
                className={`p-2 rounded-xl border text-center transition-all ${
                  ach.unlocked
                    ? 'bg-white/[0.06] border-white/[0.1] hover:border-white/[0.22] hover:bg-white/[0.09]'
                    : 'bg-white/[0.02] border-white/[0.04] opacity-40 hover:opacity-65'
                }`}
              >
                <div className={`text-xl mb-0.5 ${ach.unlocked ? '' : 'grayscale'}`}>{ach.emoji}</div>
                <p className={`text-[10px] font-semibold leading-tight ${ach.unlocked ? 'text-white' : 'text-[#666]'}`}>
                  {ach.name}
                </p>
              </button>
            ))}
          </div>

          {/* See More link */}
          <button
            type="button"
            onClick={() => setShowAllAchievements(true)}
            className="flex items-center gap-1 text-[#E50914] text-xs font-semibold mt-3 hover:underline"
          >
            See More <ChevronRight className="w-3 h-3" />
          </button>
        </motion.div>

        {/* ===== 6. PERSONAL RECORDS ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4"
        >
          <SectionHeader title="Personal Records" icon={Star} />

          <div className="space-y-4">
            {/* Collection Records */}
            <RecordGroup title="Collection Records" icon={BookOpen}>
              <RecordRow label="Total Entries" value={total.toString()} icon={BookOpen} />
              <RecordRow label="Completed Titles" value={completed.toString()} icon={CheckCircle} />
              <RecordRow label="Planned Titles" value={planned.toString()} icon={Calendar} />
              <RecordRow label="Ongoing Titles" value={ongoing.toString()} icon={TrendingUp} />
              <RecordRow label="Dropped Titles" value={dropped.toString()} icon={XCircle} />
              <RecordRow label="Favorite Titles" value={favorites.toString()} icon={Heart} />
            </RecordGroup>

            {/* Rating Records */}
            <RecordGroup title="Rating Records" icon={Star}>
              <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <Tv className="w-3.5 h-3.5 text-[#666]" />
                  <span className="text-[#888] text-xs">Highest Rated Series</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white text-xs font-semibold">
                    {personalRecords.highestSeries ? `${personalRecords.highestSeries.title} (${formatRating(personalRecords.highestSeries.rating)})` : '—'}
                  </span>
                  {personalRecords.highestSeriesTied.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setActiveRecordModal('highestSeries')}
                      className="text-[#E50914] text-[10px] font-semibold hover:underline"
                    >
                      See More
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <Film className="w-3.5 h-3.5 text-[#666]" />
                  <span className="text-[#888] text-xs">Highest Rated Movie</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white text-xs font-semibold">
                    {personalRecords.highestMovie ? `${personalRecords.highestMovie.title} (${formatRating(personalRecords.highestMovie.rating)})` : '—'}
                  </span>
                  {personalRecords.highestMovieTied.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setActiveRecordModal('highestMovie')}
                      className="text-[#E50914] text-[10px] font-semibold hover:underline"
                    >
                      See More
                    </button>
                  )}
                </div>
              </div>
              <RecordRow label="Average Overall Rating" value={`★ ${personalRecords.avgRating}`} icon={Star} />
              <RecordRow label="Perfect 10/10 Ratings" value={personalRecords.perfectRatings.toString()} icon={Trophy} />
            </RecordGroup>

            {/* Top 10 Records */}
            <RecordGroup title="Top 10 Records" icon={Trophy}>
              <RecordRow label="Total Year Drawers" value={personalRecords.totalTop10Drawers.toString()} icon={Calendar} />
              <RecordRow label="Total Ranked Entries" value={personalRecords.totalRankedEntries.toString()} icon={Star} />
              <RecordRow
                label="Earliest Ranking Year"
                value={personalRecords.earliestRankingYear?.toString() || '—'}
                icon={Calendar}
              />
              <RecordRow
                label="Latest Ranking Year"
                value={personalRecords.latestRankingYear?.toString() || '—'}
                icon={Calendar}
              />
            </RecordGroup>

            {/* Collection Diversity */}
            <RecordGroup title="Collection Diversity" icon={Globe}>
              <RecordRow label="Countries Represented" value={personalRecords.countriesRepresented.toString()} icon={Globe} />
              <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-[#666]" />
                  <span className="text-[#888] text-xs">Most Watched Country</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white text-xs font-semibold">
                    {personalRecords.favoriteCountry ? `${personalRecords.favoriteCountry[0]} (${personalRecords.favoriteCountry[1]})` : '—'}
                  </span>
                  {personalRecords.mostWatchedCountryTied.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setActiveRecordModal('mostWatchedCountry')}
                      className="text-[#E50914] text-[10px] font-semibold hover:underline"
                    >
                      See More
                    </button>
                  )}
                </div>
              </div>
              <RecordRow label="Total Movies" value={personalRecords.totalMovies.toString()} icon={Film} />
              <RecordRow label="Total Series" value={personalRecords.totalSeries.toString()} icon={Tv} />
            </RecordGroup>

            {/* Collection Preferences */}
            <RecordGroup title="Collection Preferences" icon={Heart}>
              <RecordRow label="Most Common Status" value={personalRecords.mostCommonStatus} icon={CheckCircle} />
              <RecordRow label="Preferred Format" value={personalRecords.preferredFormat} icon={Film} />
              <RecordRow label="Preferred Country" value={personalRecords.preferredCountry} icon={Globe} />
              <RecordRow label="Favorite Rating Category" value={personalRecords.favoriteRatingCategory} icon={Star} />
            </RecordGroup>

            {/* Collection Completion */}
            <RecordGroup title="Collection Completion" icon={TrendingUp}>
              <RecordRow label="Completed" value={`${personalRecords.completionRate}%`} icon={CheckCircle} />
              <RecordRow label="Planned" value={`${personalRecords.plannedRate}%`} icon={Calendar} />
              <RecordRow label="Ongoing" value={`${personalRecords.ongoingRate}%`} icon={TrendingUp} />
              <RecordRow label="Dropped" value={`${personalRecords.dropRate}%`} icon={XCircle} />
            </RecordGroup>
          </div>
        </motion.div>

        {/* ===== 7. COLLECTION INSIGHTS ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-gradient-to-br from-[#E50914]/10 to-transparent border border-[#E50914]/20 rounded-2xl p-5"
        >
          <SectionHeader title="Your BL Journey" icon={TrendingUp} />
          <p className="text-[#B3B3B3] text-sm leading-relaxed italic">
            &ldquo;{insights}&rdquo;
          </p>
        </motion.div>

        {/* Bottom Spacing */}
        <div className="h-8" />
      </div>

      {/* ===== PORTALED SUB-MODALS (z-[105] / z-[108] above BLWatcherProfile z-[100]) ===== */}

      {/* Watcher Title Progression Modal */}
      <ProfilePortalModal isOpen={showTitlesModal} zIndexClass="z-[105]">
        <motion.div
          className="fixed inset-0 bg-black flex flex-col"
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        >
          <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.06] flex-shrink-0">
            <Crown className="w-5 h-5 text-[#E50914]" />
            <div className="flex-1">
              <h2 className="text-white font-bold text-lg">Watcher Title Progression</h2>
              <p className="text-[#888] text-xs">{total} titles collected</p>
            </div>
            <button
              type="button"
              onClick={() => setShowTitlesModal(false)}
              className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl w-full mx-auto space-y-3">
            {WATCHER_TITLES.map((title) => {
              const isCurrent = title.name === currentTitle.name;
              const isUnlocked = total >= title.min || (total === 0 && title.min === 1);
              return (
                <div
                  key={title.name}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-[#E50914]/12 border-[#E50914]/40'
                      : isUnlocked
                        ? 'bg-white/[0.06] border-white/[0.1]'
                        : 'bg-white/[0.02] border-white/[0.05] opacity-55'
                  }`}
                >
                  <div className={`text-3xl flex-shrink-0 ${isUnlocked ? '' : 'grayscale'}`}>
                    {title.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-bold text-sm">{title.name}</p>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-[#E50914] text-white text-[10px] font-bold uppercase">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-[#888] text-xs mt-0.5">{title.description}</p>
                    <p className="text-[#666] text-[11px] mt-1">
                      {title.max === Infinity ? `${title.min.toLocaleString()}+ titles` : `${title.min} – ${title.max} titles`}
                    </p>
                  </div>
                  {isUnlocked ? (
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-[#666] flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </ProfilePortalModal>

      {/* All Collection Personalities Modal */}
      <ProfilePortalModal isOpen={showAllPersonalities} zIndexClass="z-[105]">
        <motion.div
          className="fixed inset-0 bg-black flex flex-col"
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        >
          <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.06] flex-shrink-0">
            <Heart className="w-5 h-5 text-[#E50914]" />
            <div className="flex-1">
              <h2 className="text-white font-bold text-lg">Collection Personality</h2>
              <p className="text-[#888] text-xs">
                {personalityTraits.length} / {allPersonalityTraits.length} Traits Unlocked
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAllPersonalities(false)}
              className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl w-full mx-auto space-y-6">
            {personalityTraits.length > 0 && (
              <div>
                <h3 className="text-white font-bold text-xs uppercase tracking-wider mb-3">
                  Unlocked ({personalityTraits.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {personalityTraits.map((trait) => (
                    <button
                      type="button"
                      key={trait.id}
                      onClick={() => setSelectedTrait(trait)}
                      className="text-left bg-white/[0.06] border border-white/[0.1] hover:border-white/[0.2] rounded-xl px-3 py-3 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl flex-shrink-0">{trait.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">{trait.name}</p>
                          <p className="text-[#888] text-[11px] mt-0.5">{trait.description}</p>
                          <p className="text-[#E50914] text-[10px] mt-0.5 font-medium">{trait.shortDesc}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {lockedTraits.length > 0 && (
              <div>
                <h3 className="text-[#888] font-bold text-xs uppercase tracking-wider mb-3">
                  Locked ({lockedTraits.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {lockedTraits.map((trait) => (
                    <button
                      type="button"
                      key={trait.id}
                      onClick={() => setSelectedTrait(trait)}
                      className="text-left bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.12] rounded-xl px-3 py-3 opacity-60 hover:opacity-85 transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl grayscale flex-shrink-0">{trait.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#aaa]">{trait.name}</p>
                          <p className="text-[#777] text-[11px] mt-0.5">{trait.requirement}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </ProfilePortalModal>

      {/* All Achievements Modal */}
      <ProfilePortalModal isOpen={showAllAchievements} zIndexClass="z-[105]">
        <motion.div
          className="fixed inset-0 bg-black flex flex-col"
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        >
          <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.06] flex-shrink-0">
            <Trophy className="w-5 h-5 text-[#E50914]" />
            <div className="flex-1">
              <h2 className="text-white font-bold text-lg">Achievements</h2>
              <p className="text-[#888] text-xs">
                {unlockedAchievementCount} / {achievements.length} Unlocked
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAllAchievements(false)}
              className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl w-full mx-auto">
            {(['Collection', 'Completed', 'Favorites', 'Ratings', 'Ongoing', 'Top 10', 'Countries', 'Journey', 'Hidden'] as const).map((cat) => {
              const catAchievements = achievements.filter((a) => a.category === cat);
              if (catAchievements.length === 0) return null;
              const catUnlocked = catAchievements.filter((a) => a.unlocked).length;
              return (
                <div key={cat} className="mb-6">
                  <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                    {cat === 'Collection' && '📚'}
                    {cat === 'Completed' && '📺'}
                    {cat === 'Favorites' && '❤️'}
                    {cat === 'Ratings' && '⭐'}
                    {cat === 'Ongoing' && '📅'}
                    {cat === 'Top 10' && '🥇'}
                    {cat === 'Countries' && '🌏'}
                    {cat === 'Journey' && '🌱'}
                    {cat === 'Hidden' && '🎁'}
                    {' '}{cat}
                    <span className="text-[#888] text-xs font-normal">
                      ({catUnlocked}/{catAchievements.length})
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {catAchievements.map((ach) => (
                      <button
                        type="button"
                        key={ach.id}
                        onClick={() => setSelectedAchievement(ach)}
                        className={`text-left flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          ach.unlocked
                            ? 'bg-white/[0.06] border-white/[0.1] hover:border-white/[0.22]'
                            : 'bg-white/[0.02] border-white/[0.04] opacity-45 hover:opacity-75'
                        }`}
                      >
                        <span className={`text-2xl flex-shrink-0 ${ach.unlocked ? '' : 'grayscale'}`}>
                          {ach.emoji}
                        </span>
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold ${ach.unlocked ? 'text-white' : 'text-[#888]'}`}>
                            {ach.name}
                          </p>
                          <p className="text-[#888] text-[11px] leading-tight">{ach.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </ProfilePortalModal>

      {/* Personality Trait Detail Modal */}
      <ProfilePortalModal isOpen={!!selectedTrait} zIndexClass="z-[108]">
        {selectedTrait && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedTrait(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-[#141414] border border-white/[0.1] rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setSelectedTrait(null)}
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1]"
              >
                <X className="w-4 h-4 text-[#999]" />
              </button>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4 bg-pink-500/15 text-pink-400 border border-pink-500/30">
                <Sparkles className="w-3 h-3" />
                <span>Collection Personality</span>
              </div>

              <div className={`text-5xl mb-3 ${selectedTrait.unlocked ? '' : 'grayscale opacity-60'}`}>
                {selectedTrait.emoji}
              </div>
              <h3 className="text-white font-extrabold text-lg mb-2">{selectedTrait.name}</h3>
              <p className="text-[#B3B3B3] text-sm mb-4">{selectedTrait.description}</p>

              <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-xs mb-4">
                <p className="text-[#888] uppercase tracking-wider text-[10px] font-semibold mb-1">
                  {selectedTrait.unlocked ? 'Status · Unlocked' : 'How to Unlock'}
                </p>
                <p className="text-white font-medium">
                  {selectedTrait.unlocked ? selectedTrait.shortDesc : selectedTrait.requirement}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTrait(null)}
                className="w-full py-2.5 rounded-xl bg-[#E50914] hover:bg-[#E50914]/90 text-white text-sm font-semibold transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </ProfilePortalModal>

      {/* Achievement Detail Modal */}
      <ProfilePortalModal isOpen={!!selectedAchievement} zIndexClass="z-[108]">
        {selectedAchievement && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedAchievement(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-[#141414] border border-white/[0.1] rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setSelectedAchievement(null)}
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1]"
              >
                <X className="w-4 h-4 text-[#999]" />
              </button>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4 bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <Trophy className="w-3 h-3" />
                <span>{selectedAchievement.category}</span>
              </div>

              <div className={`text-5xl mb-3 ${selectedAchievement.unlocked ? '' : 'grayscale opacity-50'}`}>
                {selectedAchievement.emoji}
              </div>
              <h3 className="text-white font-extrabold text-lg mb-2">{selectedAchievement.name}</h3>
              <p className="text-[#B3B3B3] text-sm mb-4">{selectedAchievement.description}</p>

              <div className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-5 ${
                selectedAchievement.unlocked
                  ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                  : 'bg-white/[0.05] text-[#888] border border-white/[0.08]'
              }`}>
                {selectedAchievement.unlocked ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Achievement Unlocked</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Locked</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedAchievement(null)}
                className="w-full py-2.5 rounded-xl bg-[#E50914] hover:bg-[#E50914]/90 text-white text-sm font-semibold transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </ProfilePortalModal>

      {/* Tied Results Modals */}
      <ProfilePortalModal isOpen={activeRecordModal === 'highestSeries'} zIndexClass="z-[105]">
        <TiedResultsModal
          title="Highest Rated Series"
          icon={Tv}
          items={personalRecords.highestSeriesTied.map((s) => ({
            title: s.title,
            subtitle: `Rating: ${formatRating(s.rating)}`,
            poster: state.entries.find((e) => e.id === s.entryId)?.poster || null,
          }))}
          onClose={() => setActiveRecordModal(null)}
        />
      </ProfilePortalModal>
      <ProfilePortalModal isOpen={activeRecordModal === 'highestMovie'} zIndexClass="z-[105]">
        <TiedResultsModal
          title="Highest Rated Movies"
          icon={Film}
          items={personalRecords.highestMovieTied.map((m) => ({
            title: m.title,
            subtitle: `Rating: ${formatRating(m.rating)}`,
            poster: state.entries.find((e) => e.id === m.entryId)?.poster || null,
          }))}
          onClose={() => setActiveRecordModal(null)}
        />
      </ProfilePortalModal>
      <ProfilePortalModal isOpen={activeRecordModal === 'mostWatchedCountry'} zIndexClass="z-[105]">
        <TiedResultsModal
          title="Most Watched Countries"
          icon={Globe}
          items={personalRecords.mostWatchedCountryTied.map(([country, count]) => ({
            title: country,
            subtitle: `${count} titles`,
            poster: null,
          }))}
          onClose={() => setActiveRecordModal(null)}
        />
      </ProfilePortalModal>
    </motion.div>
  );
}

/* ============================================================
   Record Group Component
   ============================================================ */
function RecordGroup({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-[#E50914]" />
        <span className="text-white font-bold text-xs uppercase tracking-wider">{title}</span>
      </div>
      <div className="space-y-0">
        {children}
      </div>
    </div>
  );
}

/* ============================================================
   Record Row Component
   ============================================================ */
function RecordRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-[#666]" />
        <span className="text-[#888] text-xs">{label}</span>
      </div>
      <span className="text-white text-xs font-semibold text-right">{value}</span>
    </div>
  );
}

/* ============================================================
   Tied Results Modal
   ============================================================ */
function TiedResultsModal({
  title,
  icon: Icon,
  items,
  onClose,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { title: string; subtitle: string; poster: string | null }[];
  onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 bg-black flex flex-col"
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
    >
      {/* Modal Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.06] flex-shrink-0">
        <Icon className="w-5 h-5 text-[#E50914]" />
        <h2 className="text-white font-bold text-lg flex-1">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Modal Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {items.length === 0 ? (
          <p className="text-[#666] text-sm text-center py-8">No data available</p>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]"
              >
                {item.poster !== null && (
                  <div className="w-12 h-16 rounded-lg overflow-hidden bg-[#1a1a1a] flex-shrink-0">
                    {item.poster ? (
                      <img src={item.poster} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-4 h-4 text-[#444]" />
                      </div>
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{item.title}</p>
                  <p className="text-[#888] text-xs mt-0.5">{item.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
