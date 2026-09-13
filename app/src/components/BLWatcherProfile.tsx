import { useMemo, useState, useCallback } from 'react';
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
  BookOpen
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { WatcherTitle, Achievement } from '@/types';
import { formatRating } from '@/lib/rating';

/* ============================================================
   Title Progression Data
   ============================================================ */
const WATCHER_TITLES: WatcherTitle[] = [
  { emoji: '🌱', name: 'Newcomer', min: 1, max: 24, description: 'Every collection begins with a single story.' },
  { emoji: '📺', name: 'Casual Viewer', min: 25, max: 74, description: "You're beginning to explore the world of BL." },
  { emoji: '🍿', name: 'Weekend Binger', min: 75, max: 149, description: 'Watching BL has become part of your routine.' },
  { emoji: '🎭', name: 'Drama Enthusiast', min: 150, max: 299, description: "You've experienced many unforgettable stories." },
  { emoji: '💖', name: 'Romance Connoisseur', min: 300, max: 499, description: 'Your collection reflects passion and appreciation for the genre.' },
  { emoji: '🎬', name: 'BL Archivist', min: 500, max: 749, description: 'Your library has become a remarkable archive of BL.' },
  { emoji: '👑', name: 'BL Curator', min: 750, max: 999, description: "You've built a prestigious and thoughtfully curated collection." },
  { emoji: '🌌', name: 'BL Legend', min: 1000, max: Infinity, description: 'Your lifelong dedication has created an extraordinary BL legacy.' },
];

function getWatcherTitle(total: number): WatcherTitle {
  if (total === 0) return WATCHER_TITLES[0];
  return WATCHER_TITLES.find(t => total >= t.min && total <= t.max) || WATCHER_TITLES[WATCHER_TITLES.length - 1];
}

function getNextTitle(current: WatcherTitle): WatcherTitle | null {
  const idx = WATCHER_TITLES.indexOf(current);
  return idx < WATCHER_TITLES.length - 1 ? WATCHER_TITLES[idx + 1] : null;
}

/* ============================================================
   Achievement Definitions (52 Achievements)
   ============================================================ */
const ACHIEVEMENTS: Achievement[] = [
  /* ---- 📚 Collection (7) ---- */
  { id: 'first-collection', emoji: '🏆', name: 'First Collection', description: 'Add your first BL entry', category: 'Collection', condition: (s) => s.total >= 1 },
  { id: 'growing-library', emoji: '📚', name: 'Growing Library', description: 'Collect 25 BL titles', category: 'Collection', condition: (s) => s.total >= 25 },
  { id: 'bookcase-filled', emoji: '📖', name: 'Bookcase Filled', description: 'Collect 50 BL titles', category: 'Collection', condition: (s) => s.total >= 50 },
  { id: 'archive-builder', emoji: '🎬', name: 'Archive Builder', description: 'Collect 100 BL titles', category: 'Collection', condition: (s) => s.total >= 100 },
  { id: 'master-archive', emoji: '🏛️', name: 'Master Archive', description: 'Collect 200 BL titles', category: 'Collection', condition: (s) => s.total >= 200 },
  { id: 'endless-collection', emoji: '🌌', name: 'Endless Collection', description: 'Collect 300 BL titles', category: 'Collection', condition: (s) => s.total >= 300 },
  { id: 'legendary-collection', emoji: '💎', name: 'Extraordinary Curator', description: 'Collect 500 BL titles', category: 'Collection', condition: (s) => s.total >= 500 },
  { id: 'legendary-collector', emoji: '👑', name: 'Legendary Collector', description: 'Collect 750 BL titles', category: 'Collection', condition: (s) => s.total >= 750 },
  { id: 'infinite-library', emoji: '🌈', name: 'Hall of Legends', description: 'Collect 1,000 BL titles', category: 'Collection', condition: (s) => s.total >= 1000 },

  /* ---- 📺 Completed (5) ---- */
  { id: 'first-finish', emoji: '📺', name: 'First Finish', description: 'Complete your first title', category: 'Completed', condition: (s) => s.completed >= 1 },
  { id: 'marathon-viewer', emoji: '🎉', name: 'Marathon Viewer', description: 'Complete 25 titles', category: 'Completed', condition: (s) => s.completed >= 25 },
  { id: 'dedicated-viewer', emoji: '🔥', name: 'Dedicated Viewer', description: 'Complete 100 titles', category: 'Completed', condition: (s) => s.completed >= 100 },
  { id: 'veteran-viewer', emoji: '🏅', name: 'Veteran Viewer', description: 'Complete 250 titles', category: 'Completed', condition: (s) => s.completed >= 250 },
  { id: 'ultimate-finisher', emoji: '👑', name: 'Ultimate Finisher', description: 'Complete 500 titles', category: 'Completed', condition: (s) => s.completed >= 500 },

  /* ---- ❤️ Favorites (4) ---- */
  { id: 'first-favorite', emoji: '❤️', name: 'First Favorite', description: 'Add your first favorite', category: 'Favorites', condition: (s) => s.favorites >= 1 },
  { id: 'favorite-collector', emoji: '💖', name: 'Favorite Collector', description: 'Add 25 favorites', category: 'Favorites', condition: (s) => s.favorites >= 25 },
  { id: 'heart-collector', emoji: '💞', name: 'Heart Collector', description: 'Add 50 favorites', category: 'Favorites', condition: (s) => s.favorites >= 50 },
  { id: 'romance-archivist', emoji: '💘', name: 'Romance Archivist', description: 'Add 100 favorites', category: 'Favorites', condition: (s) => s.favorites >= 100 },

  /* ---- ⭐ Ratings (4) ---- */
  { id: 'first-review', emoji: '⭐', name: 'First Review', description: 'Rate your first favorite', category: 'Ratings', condition: (s) => s.ratedCount >= 1 },
  { id: 'thoughtful-reviewer', emoji: '🌟', name: 'Thoughtful Reviewer', description: 'Rate 50 favorites', category: 'Ratings', condition: (s) => s.ratedCount >= 50 },
  { id: 'master-critic', emoji: '📝', name: 'Master Critic', description: 'Rate 200 favorites', category: 'Ratings', condition: (s) => s.ratedCount >= 200 },
  { id: 'perfect-taste', emoji: '🏆', name: 'Perfect Taste', description: 'Give 10 perfect 10/10 ratings', category: 'Ratings', condition: (s) => s.perfectRatings >= 10 },

  /* ---- 📅 Ongoing (3) ---- */
  { id: 'airing-companion', emoji: '📅', name: 'Airing Companion', description: 'Track 1 ongoing title', category: 'Ongoing', condition: (s) => s.ongoing >= 1 },
  { id: 'weekly-watcher', emoji: '📡', name: 'Weekly Watcher', description: 'Track 5 ongoing titles', category: 'Ongoing', condition: (s) => s.ongoing >= 5 },
  { id: 'always-updated', emoji: '⏳', name: 'Always Updated', description: 'Track 10 ongoing titles', category: 'Ongoing', condition: (s) => s.ongoing >= 10 },

  /* ---- 🥇 Top 10 (4) ---- */
  { id: 'first-ranking', emoji: '🥇', name: 'First Ranking', description: 'Create your first Top 10 drawer', category: 'Top 10', condition: (s) => s.top10 >= 1 },
  { id: 'annual-curator', emoji: '📅', name: 'Annual Curator', description: 'Create 5 Top 10 drawers', category: 'Top 10', condition: (s) => s.top10 >= 5 },
  { id: 'ranking-master', emoji: '👑', name: 'Ranking Master', description: 'Create 10 Top 10 drawers', category: 'Top 10', condition: (s) => s.top10 >= 10 },
  { id: 'hall-of-fame', emoji: '🏛️', name: 'Hall of Fame', description: 'Every drawer has at least 1 ranked title', category: 'Top 10', condition: (s) => s.top10 > 0 && s.top10FullDrawers === s.top10 },

  /* ---- 🌏 Countries (4) ---- */
  { id: 'first-passport', emoji: '✈️', name: 'First Passport', description: 'Watch BL from 2 countries', category: 'Countries', condition: (s) => s.countryBreakdown.length >= 2 },
  { id: 'asian-explorer', emoji: '🌏', name: 'Asian Explorer', description: 'Watch BL from 4 countries', category: 'Countries', condition: (s) => s.countryBreakdown.length >= 4 },
  { id: 'global-collector', emoji: '🌍', name: 'Global Collector', description: 'Watch BL from 6 countries', category: 'Countries', condition: (s) => s.countryBreakdown.length >= 6 },
  { id: 'world-traveler', emoji: '🌍', name: 'World Traveler', description: 'Collect BL titles from all supported countries (Thailand, Japan, South Korea, Taiwan, China, US)', category: 'Countries', condition: (s) => { const owned = s.countryBreakdown.map(([c]) => c); return ['Thailand', 'Japan', 'South Korea', 'Taiwan', 'China', 'US'].every(c => owned.includes(c)); } },

  /* ---- 🌱 Journey (4) ---- */
  { id: 'first-step', emoji: '🌱', name: 'First Step', description: 'Set your Watching Since year', category: 'Journey', condition: (s) => s.watchingSince !== null },
  { id: 'five-year-journey', emoji: '📅', name: 'Five-Year Journey', description: '5+ years of BL watching', category: 'Journey', condition: (s) => s.watchingSince !== null && s.currentYear - s.watchingSince >= 5 },
  { id: 'decade-devotion', emoji: '🎉', name: 'Decade Devotion', description: '10+ years of BL watching', category: 'Journey', condition: (s) => s.watchingSince !== null && s.currentYear - s.watchingSince >= 10 },
  { id: 'lifetime-fan', emoji: '🏆', name: 'Lifetime Fan', description: '15+ years of BL watching', category: 'Journey', condition: (s) => s.watchingSince !== null && s.currentYear - s.watchingSince >= 15 },

  /* ---- 🎁 Hidden (17) ---- */
  { id: 'nostalgia', emoji: '📼', name: 'Nostalgia', description: 'Collect 10 titles from before 2010', category: 'Hidden', hidden: true, condition: (s) => s.titlesBefore2010 >= 10 },
  { id: 'premiere-watcher', emoji: '🚀', name: 'Premiere Watcher', description: 'Collect 10 titles from the current year', category: 'Hidden', hidden: true, condition: (s) => s.titlesCurrentYear >= 10 },
  { id: 'second-chance', emoji: '🔄', name: 'Second Chance', description: 'A dropped title becomes completed', category: 'Hidden', hidden: true, condition: (s) => s.droppedNowComplete >= 1 },
  { id: 'tough-critic', emoji: '💔', name: 'Tough Critic', description: 'Drop 10 titles', category: 'Hidden', hidden: true, condition: (s) => s.dropped >= 10 },
  { id: 'redemption-arc', emoji: '❤️', name: 'Redemption Arc', description: 'A dropped title becomes a favorite', category: 'Hidden', hidden: true, condition: (s) => s.droppedNowFavorite >= 1 },
  { id: 'impossible-standard', emoji: '⭐', name: 'Impossible Standard', description: 'Average rating >= 9.5 across 100+ rated titles', category: 'Hidden', hidden: true, condition: (s) => s.avgOverallNumeric >= 9.5 && s.ratedCount >= 100 },
  { id: 'daily-explorer', emoji: '📅', name: 'Daily Explorer', description: 'Open the app on 30 different days', category: 'Hidden', hidden: true, condition: (_s) => false },
  { id: 'completionist-spirit', emoji: '📚', name: 'Completionist Spirit', description: 'Rate every title from a single year', category: 'Hidden', hidden: true, condition: (_s) => false },
  { id: 'perfect-top-10', emoji: '🎯', name: 'Perfect Top 10', description: 'Fill all 10 positions in a drawer', category: 'Hidden', hidden: true, condition: (s) => s.top10FullDrawers >= 1 },
  { id: 'early-adopter', emoji: '🌅', name: 'Early Adopter', description: 'Add a title within its release year', category: 'Hidden', hidden: true, condition: (_s) => false },
  { id: 'organized-collector', emoji: '🗂️', name: 'Organized Collector', description: 'Create 10 yearly drawers', category: 'Hidden', hidden: true, condition: (s) => s.yearlyDrawerCount >= 10 },
  { id: 'consistent-reviewer', emoji: '🎖️', name: 'Consistent Reviewer', description: 'Rate 100 consecutive favorites', category: 'Hidden', hidden: true, condition: (s) => s.consecutiveRatedCount >= 100 },
  { id: 'movie-marathon', emoji: '🎞️', name: 'Movie Marathon', description: 'Collect 50 movies', category: 'Hidden', hidden: true, condition: (s) => s.movies >= 50 },
  { id: 'series-marathon', emoji: '📺', name: 'Series Marathon', description: 'Collect 300 series', category: 'Hidden', hidden: true, condition: (s) => s.series >= 300 },
  { id: 'continental-explorer', emoji: '🧭', name: 'Continental Explorer', description: 'Watch BL from every supported region', category: 'Hidden', hidden: true, condition: (s) => s.uniqueRegions >= 5 },
  { id: 'elite-collector', emoji: '🏅', name: 'Elite Collector', description: '90%+ completion rate with 500+ entries', category: 'Hidden', hidden: true, condition: (s) => s.total >= 500 && s.completed / s.total >= 0.9 },
  { id: 'hall-of-legacy', emoji: '🌟', name: 'Hall of Legacy', description: 'Unlock all non-hidden achievements', category: 'Hidden', hidden: true, condition: (_s) => false },
];

/* ============================================================
   Collection Personality Traits
   ============================================================ */
interface PersonalityTrait {
  emoji: string;
  name: string;
  description: string;
  shortDesc: string;
}

function getPersonalityTraits(stats: {
  total: number;
  completed: number;
  dropped: number;
  planned: number;
  favorites: number;
  ratedCount: number;
  avgRating: string;
  ongoing: number;
  countryBreakdown: [string, number][];
  top10: number;
  movies: number;
  series: number;
  perfectRatings: number;
  currentYearCount: number;
  oldTitlesCount: number;
  droppedToComplete: number;
  isStorylineHighest: boolean;
  isActingHighest: boolean;
  isMusicHighest: boolean;
  isCinematographyHighest: boolean;
  isChemistryHighest: boolean;
  emotionalImpactPct: number;
  rewatchValuePct: number;
  mostWatchedCountry: string;
  currentYear: number;
  watchingSince: number | null;
  activeDrawerCount: number;
}): PersonalityTrait[] {
  const traits: PersonalityTrait[] = [];
  const avg = parseFloat(stats.avgRating);
  const rated = stats.ratedCount || 1;
  const completionDenominator = stats.completed + stats.dropped;
  const strictCompletionRate = completionDenominator > 0 ? stats.completed / completionDenominator : 0;
  const droppedRate = stats.total > 0 ? stats.dropped / stats.total : 1;

  // 1. Library Builder — Total Entries >= 100
  if (stats.total >= 100) {
    traits.push({ emoji: '📚', name: 'Library Builder', description: 'Your collection has grown to an impressive size.', shortDesc: `${stats.total} entries collected` });
  }

  // 2. Completionist — Completed / (Completed + Dropped) >= 90%
  if (strictCompletionRate >= 0.9 && stats.completed > 0) {
    traits.push({ emoji: '🎭', name: 'Completionist', description: 'You finish nearly everything you start.', shortDesc: `${(strictCompletionRate * 100).toFixed(0)}% completion rate` });
  }

  // 3. World Explorer — Unique Countries >= 5
  if (stats.countryBreakdown.length >= 5) {
    traits.push({ emoji: '🌏', name: 'World Explorer', description: 'Your collection spans multiple countries and styles.', shortDesc: `${stats.countryBreakdown.length} countries` });
  }

  // 4. Romantic Collector — Favorites >= 50
  if (stats.favorites >= 50) {
    traits.push({ emoji: '❤️', name: 'Romantic Collector', description: 'You have a large curated list of beloved titles.', shortDesc: `${stats.favorites} favorites` });
  }

  // 5. Selective Critic — Perfect ratings <= 10% of rated
  if (stats.perfectRatings / rated <= 0.1 && stats.perfectRatings > 0) {
    traits.push({ emoji: '⭐', name: 'Selective Critic', description: 'You reserve top marks for only the most exceptional.', shortDesc: `${stats.perfectRatings} perfect ratings` });
  }

  // 6. Generous Reviewer — Avg >= 9.0
  if (avg >= 9.0) {
    traits.push({ emoji: '🌟', name: 'Generous Reviewer', description: 'You appreciate the artistry in BL storytelling.', shortDesc: `Avg ${avg}/10` });
  }

  // 7. Curator — Top 10 Drawers >= 3
  if (stats.top10 >= 3) {
    traits.push({ emoji: '🎬', name: 'Curator', description: 'You organize your favorites into yearly rankings.', shortDesc: `${stats.top10} drawers` });
  }

  // 8. Seasonal Watcher — Ongoing >= 10
  if (stats.ongoing >= 10) {
    traits.push({ emoji: '📅', name: 'Seasonal Watcher', description: 'You actively follow many currently airing releases.', shortDesc: `${stats.ongoing} ongoing` });
  }

  // 9. Marathon Viewer — Completed >= 100
  if (stats.completed >= 100) {
    traits.push({ emoji: '🔥', name: 'Marathon Viewer', description: 'You have watched a remarkable number of BL titles.', shortDesc: `${stats.completed} completed` });
  }

  // 10. Fresh Explorer — Titles from (currentYear - 1) or newer >= 30
  if (stats.currentYearCount >= 30) {
    traits.push({ emoji: '🌱', name: 'Fresh Explorer', description: 'You actively discover recent releases.', shortDesc: `${stats.currentYearCount} recent titles` });
  }

  // 11. Classic Enthusiast — Titles from <= 2015 >= 20
  if (stats.oldTitlesCount >= 20) {
    traits.push({ emoji: '🏛️', name: 'Classic Enthusiast', description: 'You appreciate the foundational works of BL.', shortDesc: `${stats.oldTitlesCount} classic titles` });
  }

  // 12. Movie Lover — Movies >= 40% of collection
  if (stats.total > 0 && stats.movies / stats.total >= 0.4) {
    traits.push({ emoji: '🎞️', name: 'Movie Lover', description: 'A significant portion of your collection is films.', shortDesc: `${stats.movies} movies` });
  }

  // 13. Series Specialist — Series >= 70% of collection
  if (stats.total > 0 && stats.series / stats.total >= 0.7) {
    traits.push({ emoji: '📺', name: 'Series Specialist', description: 'You primarily follow BL series.', shortDesc: `${stats.series} series` });
  }

  // 14. Country Fan — Most watched country (dynamic)
  if (stats.mostWatchedCountry) {
    traits.push({ emoji: '🇹🇭', name: `${stats.mostWatchedCountry} Fan`, description: `Most of your collection comes from ${stats.mostWatchedCountry}.`, shortDesc: `Most watched country` });
  }

  // 15. Story Lover — Storyline avg highest
  if (stats.isStorylineHighest && stats.ratedCount > 0) {
    traits.push({ emoji: '🎨', name: 'Story Lover', description: 'Storytelling is what you value most in BL.', shortDesc: 'Highest: Storyline' });
  }

  // 16. Performance Admirer — Acting avg highest
  if (stats.isActingHighest && stats.ratedCount > 0) {
    traits.push({ emoji: '🎭', name: 'Performance Admirer', description: 'Acting performances stand out to you.', shortDesc: 'Highest: Acting' });
  }

  // 17. OST Enthusiast — Music avg highest
  if (stats.isMusicHighest && stats.ratedCount > 0) {
    traits.push({ emoji: '🎼', name: 'OST Enthusiast', description: 'Music and soundtracks elevate your experience.', shortDesc: 'Highest: Music' });
  }

  // 18. Visual Aficionado — Cinematography avg highest
  if (stats.isCinematographyHighest && stats.ratedCount > 0) {
    traits.push({ emoji: '🎥', name: 'Visual Aficionado', description: 'Visual storytelling captivates you.', shortDesc: 'Highest: Cinematography' });
  }

  // 19. Chemistry Seeker — Chemistry avg highest
  if (stats.isChemistryHighest && stats.ratedCount > 0) {
    traits.push({ emoji: '💞', name: 'Chemistry Seeker', description: 'On-screen chemistry is what you cherish most.', shortDesc: 'Highest: Chemistry' });
  }

  // 20. Emotional Viewer — Emotional Impact >= 80%
  if (stats.emotionalImpactPct >= 80) {
    traits.push({ emoji: '😭', name: 'Emotional Viewer', description: 'BL stories deeply move you.', shortDesc: `${stats.emotionalImpactPct.toFixed(0)}% emotional impact` });
  }

  // 21. Rewatch Expert — Rewatch Value >= 80%
  if (stats.rewatchValuePct >= 80) {
    traits.push({ emoji: '🔄', name: 'Rewatch Expert', description: 'You love revisiting your favorite stories.', shortDesc: `${stats.rewatchValuePct.toFixed(0)}% rewatchable` });
  }

  // 22. Active Collector — collection grown in past 30 days
  const hasRecentEntries = stats.activeDrawerCount > 0;
  if (hasRecentEntries) {
    traits.push({ emoji: '📈', name: 'Active Collector', description: 'Your collection is actively growing.', shortDesc: 'Recently active' });
  }

  // 23. Quality Over Quantity — Avg >= 9.2 AND Total < 100
  if (avg >= 9.2 && stats.total > 0 && stats.total < 100) {
    traits.push({ emoji: '🎯', name: 'Quality Over Quantity', description: 'You have a small but highly rated collection.', shortDesc: `Avg ${avg} with ${stats.total} titles` });
  }

  // 24. Balanced Viewer — No country > 50%, no status > 70%, both formats
  const maxCountryPct = stats.countryBreakdown.length > 0
    ? stats.countryBreakdown[0][1] / stats.total
    : 1;
  const hasBothFormats = stats.movies > 0 && stats.series > 0;
  const maxStatusCount = Math.max(stats.completed, stats.dropped, stats.ongoing, stats.planned);
  const maxStatusPct = stats.total > 0 ? maxStatusCount / stats.total : 1;
  if (maxCountryPct <= 0.5 && maxStatusPct <= 0.7 && hasBothFormats && stats.total >= 10) {
    traits.push({ emoji: '🧩', name: 'Balanced Viewer', description: 'You have a well-balanced, diverse collection.', shortDesc: 'Diverse & balanced' });
  }

  // 25. Trend Chaser — Current year releases >= 15
  if (stats.currentYearCount >= 15) {
    traits.push({ emoji: '🚀', name: 'Trend Chaser', description: 'You keep up with the latest BL releases.', shortDesc: `${stats.currentYearCount} new titles` });
  }

  // 26. Loyal Finisher — Dropped <= 5%
  if (droppedRate <= 0.05 && stats.total > 0) {
    traits.push({ emoji: '🛡️', name: 'Loyal Finisher', description: 'You rarely drop a series once started.', shortDesc: `${(droppedRate * 100).toFixed(0)}% drop rate` });
  }

  // 27. Variety Seeker — Unique Countries >= 6
  if (stats.countryBreakdown.length >= 6) {
    traits.push({ emoji: '🎲', name: 'Variety Seeker', description: 'You explore BL from many different countries.', shortDesc: `${stats.countryBreakdown.length} countries` });
  }

  // 28. BL Enthusiast — Has ALL: Completionist, Curator, World Explorer, Romantic Collector, Seasonal Watcher
  const hasCompletionist = strictCompletionRate >= 0.9 && stats.completed > 0;
  const hasCurator = stats.top10 >= 3;
  const hasWorldExplorer = stats.countryBreakdown.length >= 5;
  const hasRomanticCollector = stats.favorites >= 50;
  const hasSeasonalWatcher = stats.ongoing >= 10;
  if (hasCompletionist && hasCurator && hasWorldExplorer && hasRomanticCollector && hasSeasonalWatcher) {
    traits.push({ emoji: '🌈', name: 'BL Enthusiast', description: 'The ultimate BL fan — diverse, dedicated, and devoted.', shortDesc: 'All core traits unlocked' });
  }

  return traits;
}

/* ============================================================
   Section Header Component
   ============================================================ */
function SectionHeader({ title, icon: Icon }: { title: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-[#E50914]" />
      <h3 className="text-white font-bold text-sm uppercase tracking-wider">{title}</h3>
      <div className="flex-1 h-px bg-white/[0.06] ml-2" />
    </div>
  );
}

/* ============================================================
   BL Watcher Profile Component
   ============================================================ */
export default function BLWatcherProfile({ onBack }: { onBack: () => void }) {
  const { state, dispatch } = useApp();
  const [watchingSinceInput, setWatchingSinceInput] = useState(
    state.watchingSince?.toString() || ''
  );
  const [showAllPersonalities, setShowAllPersonalities] = useState(false);
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [activeRecordModal, setActiveRecordModal] = useState<'highestSeries' | 'highestMovie' | 'mostWatchedCountry' | null>(null);

  const currentYear = new Date().getFullYear();

  /* ---- Derived Stats ---- */
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
    watchingSince
  } = useMemo(() => {
    const total = state.entries.filter(e => e.status === 'COMPLETE' || e.status === 'ONGOING').length;
    const completed = state.entries.filter(e => e.status === 'COMPLETE').length;
    const ongoing = state.entries.filter(e => e.status === 'ONGOING').length;
    const dropped = state.entries.filter(e => e.status === 'DROPPED').length;
    const planned = state.entries.filter(e => e.status === 'PLANNED').length;
    const favorites = state.favorites.length;
    const top10 = state.top10Drawers.length;
    const avgRating = state.favorites.length > 0
       ? formatRating(state.favorites.reduce((s, f) => s + f.overallRating, 0) / state.favorites.length)
       : '0.00';

    // Countries breakdown
    const countryMap = new Map<string, number>();
    const knownCountries = ['Thailand', 'Japan', 'Taiwan', 'Korea', 'South Korea', 'China'];
    let othersCount = 0;

    state.entries.forEach(e => {
      if (knownCountries.includes(e.country)) {
        const key = e.country === 'South Korea' ? 'Korea' : e.country;
        countryMap.set(key, (countryMap.get(key) || 0) + 1);
      } else {
        othersCount++;
      }
    });
    if (othersCount > 0) countryMap.set('Others', othersCount);
    const countryBreakdown = Array.from(countryMap.entries()).sort((a, b) => b[1] - a[1]);

    // Highest rated (for achievements)
    const highestRated = state.favorites.map(f => {
      const entry = state.entries.find(e => e.id === f.entryId);
      return {
        title: entry?.title || 'Unknown',
        rating: f.overallRating,
        entryId: f.entryId,
        type: entry?.type || 'Series'
      };
    }).sort((a, b) => b.rating - a.rating);

    return {
      total, completed, ongoing, dropped, planned,
      favorites, top10, avgRating, countryBreakdown,
      highestRated, watchingSince: state.watchingSince
    };
  }, [state]);

  /* ---- Title & Progress ---- */
  const currentTitle = useMemo(() => getWatcherTitle(total), [total]);
  const nextTitle = useMemo(() => getNextTitle(currentTitle), [currentTitle]);
  const experience = watchingSince ? currentYear - watchingSince : 0;

  const progressPercent = useMemo(() => {
    if (!nextTitle) return 100;
    const range = nextTitle.min - currentTitle.min;
    const progress = total - currentTitle.min;
    return Math.min(100, Math.max(0, (progress / range) * 100));
  }, [total, currentTitle, nextTitle]);

  /* ---- Personality Traits ---- */
  const movies = state.entries.filter(e => e.type === 'Movie').length;
  const series = state.entries.filter(e => e.type === 'Series').length;
  const perfectRatings = state.favorites.filter(f => f.overallRating === 10.0).length;
  const currentYearCount = state.entries.filter(e => e.year >= currentYear - 1).length;
  const oldTitlesCount = state.entries.filter(e => e.year <= 2015).length;
  const droppedToComplete = state.entries.filter(e => e.status === 'COMPLETE' && state.favorites.some(f => f.entryId === e.id)).length;
  const ratedCount = state.favorites.length;

  // Category averages
  const categoryAvgs = ratedCount > 0 ? {
    storyline: state.favorites.reduce((s, f) => s + f.storyline, 0) / ratedCount,
    acting: state.favorites.reduce((s, f) => s + f.acting, 0) / ratedCount,
    music: state.favorites.reduce((s, f) => s + f.music, 0) / ratedCount,
    cinematography: state.favorites.reduce((s, f) => s + f.cinematography, 0) / ratedCount,
    chemistry: state.favorites.reduce((s, f) => s + f.chemistry, 0) / ratedCount,
  } : null;
  const maxCategory = categoryAvgs
    ? Object.entries(categoryAvgs).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
    : '';
  const emotionalImpactPct = ratedCount > 0
    ? (state.favorites.filter(f => f.emotionalImpact).length / ratedCount) * 100
    : 0;
  const rewatchValuePct = ratedCount > 0
    ? (state.favorites.filter(f => f.rewatchValue).length / ratedCount) * 100
    : 0;
  const mostWatchedCountry = countryBreakdown[0]?.[0] || '';
  const activeDrawerCount = state.entries.filter(e => e.createdAt > Date.now() - 30 * 24 * 60 * 60 * 1000).length;

  const personalityTraits = useMemo(() => getPersonalityTraits({
    total, completed, dropped, planned, favorites, ratedCount,
    avgRating, ongoing, countryBreakdown, top10,
    movies, series, perfectRatings, currentYearCount, oldTitlesCount,
    droppedToComplete,
    isStorylineHighest: maxCategory === 'storyline',
    isActingHighest: maxCategory === 'acting',
    isMusicHighest: maxCategory === 'music',
    isCinematographyHighest: maxCategory === 'cinematography',
    isChemistryHighest: maxCategory === 'chemistry',
    emotionalImpactPct, rewatchValuePct,
    mostWatchedCountry, currentYear, watchingSince, activeDrawerCount
  }), [total, completed, dropped, planned, favorites, ratedCount,
    avgRating, ongoing, countryBreakdown, top10,
    movies, series, perfectRatings, currentYearCount, oldTitlesCount,
    droppedToComplete, maxCategory,
    emotionalImpactPct, rewatchValuePct,
    mostWatchedCountry, currentYear, watchingSince, activeDrawerCount]);

  /* ---- Achievements ---- */
  const titlesBefore2010 = state.entries.filter(e => e.year < 2010).length;
  const titlesCurrentYear = state.entries.filter(e => e.year === currentYear).length;
  const droppedNowComplete = state.entries.filter(e => {
    if (e.status !== 'COMPLETE') return false;
    // Check if this was ever in a dropped state (we approximate by checking favorites with low ratings)
    return false; // Cannot track state transitions with current data model
  }).length;
  const droppedNowFavorite = state.entries.filter(e => {
    return e.status === 'DROPPED' && state.favorites.some(f => f.entryId === e.id);
  }).length;
  const avgOverallNumeric = state.favorites.length > 0
    ? state.favorites.reduce((s, f) => s + f.overallRating, 0) / state.favorites.length
    : 0;
  const yearlyDrawerCount = state.top10Drawers.length;
  const top10FullDrawers = state.top10Drawers.filter(d => d.entries.length >= 10).length;
  const consecutiveRatedCount = state.favorites.filter(f => f.overallRating > 0).length;
  const uniqueRegions = state.entries.length > 0
    ? new Set(state.entries.map(e => e.country)).size
    : 0;
  const allRegions = [...new Set(state.entries.map(e => e.country))];

  const achievementStats = {
    total, completed, ongoing, dropped, planned, favorites, top10,
    avgRating, countryBreakdown, highestRated, watchingSince,
    currentYear, movies, series, perfectRatings,
    titlesBefore2010, titlesCurrentYear,
    droppedNowComplete, droppedNowFavorite,
    avgOverallNumeric, ratedCount: state.favorites.length,
    yearlyDrawerCount, top10FullDrawers,
    consecutiveRatedCount, uniqueRegions, allRegions
  };
  const achievements = useMemo(() => {
    const base = ACHIEVEMENTS.map(ach => ({
      ...ach,
      unlocked: ach.condition(achievementStats)
    }));
    // Hall of Legacy: all non-hidden achievements unlocked
    const nonHidden = base.filter(a => !a.hidden);
    const allNonHiddenUnlocked = nonHidden.length > 0 && nonHidden.every(a => a.unlocked);
    return base.map(ach =>
      ach.id === 'hall-of-legacy'
        ? { ...ach, unlocked: allNonHiddenUnlocked }
        : ach
    );
  }, [achievementStats]);

  /* ---- Personal Records ---- */
  const personalRecords = useMemo(() => {
    // Highest Rated Series (with ties)
    const seriesRatings = highestRated.filter(h => h.type === 'Series');
    const maxSeriesRating = seriesRatings[0]?.rating || 0;
    const highestSeriesTied = seriesRatings.filter(s => s.rating === maxSeriesRating);
    const highestSeries = seriesRatings[0] || null;

    // Highest Rated Movie (with ties)
    const movieRatings = highestRated.filter(h => h.type === 'Movie');
    const maxMovieRating = movieRatings[0]?.rating || 0;
    const highestMovieTied = movieRatings.filter(m => m.rating === maxMovieRating);
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
      { name: 'Cinematography', avg: ratedFavorites.reduce((s, f) => s + f.cinematography, 0) / ratedFavorites.length },
    ].sort((a, b) => b.avg - a.avg)[0]?.name || '—' : '—';

    // Top 10 stats
    const totalRankedEntries = state.top10Drawers.reduce((sum, d) => sum + d.entries.length, 0);
    const earliestRankingYear = state.top10Drawers.length > 0
      ? Math.min(...state.top10Drawers.map(d => d.year))
      : null;
    const latestRankingYear = state.top10Drawers.length > 0
      ? Math.max(...state.top10Drawers.map(d => d.year))
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

    if (parts[parts.length - 1].endsWith('. ')) {
      // Already ends properly
    } else {
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
            onClick={onBack}
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
          <div className="text-6xl mb-3">{currentTitle.emoji}</div>
          <h2 className="text-2xl font-extrabold text-white mb-2">
            {currentTitle.emoji} {currentTitle.name}
          </h2>
          <p className="text-[#888] text-sm italic max-w-sm mx-auto">
            "A carefully built collection reflecting years of passion for Boys' Love."
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4"
        >
          <SectionHeader title="Collection Progress" icon={TrendingUp} />

          <div className="text-center mb-4">
            <p className="text-[#888] text-xs uppercase tracking-wider">Current Title</p>
            <p className="text-white font-bold text-lg mt-1">{currentTitle.emoji} {currentTitle.name}</p>
          </div>

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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4"
        >
          <SectionHeader title="Collection Personality" icon={Heart} />

          {personalityTraits.length === 0 ? (
            <p className="text-[#666] text-sm text-center py-4">Keep collecting to discover your personality traits</p>
          ) : (
            <>
              {/* Two-column grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {personalityTraits.slice(0, 6).map(trait => (
                  <div
                    key={trait.name}
                    className="bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{trait.emoji}</span>
                      <div>
                        <p className="text-sm font-semibold text-white">{trait.name}</p>
                        <p className="text-[#888] text-[11px]">{trait.shortDesc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* See More link */}
              {personalityTraits.length > 6 && (
                <button
                  onClick={() => setShowAllPersonalities(true)}
                  className="flex items-center gap-1 text-[#E50914] text-xs font-semibold mt-3 hover:underline"
                >
                  See More <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </>
          )}
        </motion.div>

        {/* All Personalities Modal */}
        <AnimatePresence>
          {showAllPersonalities && (
            <motion.div
              className="fixed inset-0 z-[100] bg-black flex flex-col"
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              {/* Modal Header */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.06] flex-shrink-0">
                <Heart className="w-5 h-5 text-[#E50914]" />
                <h2 className="text-white font-bold text-lg flex-1">Collection Personality</h2>
                <button
                  onClick={() => setShowAllPersonalities(false)}
                  className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {personalityTraits.map(trait => (
                    <div
                      key={trait.name}
                      className="bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{trait.emoji}</span>
                        <div>
                          <p className="text-sm font-semibold text-white">{trait.name}</p>
                          <p className="text-[#888] text-[11px] mt-0.5">{trait.description}</p>
                          <p className="text-[#666] text-[10px] mt-0.5">{trait.shortDesc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== 5. ACHIEVEMENT SHOWCASE ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4"
        >
          <SectionHeader title="Achievement Showcase" icon={Trophy} />

          {/* Unlocked Count */}
          <div className="text-center mb-3">
            <span className="text-[#E50914] font-bold text-sm">
              {achievements.filter(a => a.unlocked).length} / {achievements.length} Achievements Unlocked
            </span>
          </div>

          {/* Preview Grid (first 6 unlocked, or first 6 total if none) */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {(achievements.filter(a => a.unlocked).length > 0
              ? achievements.filter(a => a.unlocked).slice(0, 6)
              : achievements.slice(0, 6)
            ).map(ach => (
              <div
                key={ach.id}
                className={`p-2 rounded-xl border text-center transition-all ${
                  ach.unlocked
                    ? 'bg-white/[0.06] border-white/[0.1]'
                    : 'bg-white/[0.02] border-white/[0.04] opacity-30'
                }`}
              >
                <div className={`text-xl mb-0.5 ${ach.unlocked ? '' : 'grayscale'}`}>{ach.emoji}</div>
                <p className={`text-[10px] font-semibold leading-tight ${ach.unlocked ? 'text-white' : 'text-[#666]'}`}>
                  {ach.name}
                </p>
              </div>
            ))}
          </div>

          {/* See More link */}
          <button
            onClick={() => setShowAllAchievements(true)}
            className="flex items-center gap-1 text-[#E50914] text-xs font-semibold mt-3 hover:underline"
          >
            See More <ChevronRight className="w-3 h-3" />
          </button>
        </motion.div>

        {/* All Achievements Modal */}
        <AnimatePresence>
          {showAllAchievements && (
            <motion.div
              className="fixed inset-0 z-[100] bg-black flex flex-col"
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              {/* Modal Header */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.06] flex-shrink-0">
                <Trophy className="w-5 h-5 text-[#E50914]" />
                <div className="flex-1">
                  <h2 className="text-white font-bold text-lg">Achievements</h2>
                  <p className="text-[#888] text-xs">
                    {achievements.filter(a => a.unlocked).length} / {achievements.length} Unlocked
                  </p>
                </div>
                <button
                  onClick={() => setShowAllAchievements(false)}
                  className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto px-4 py-6">
                {/* Group by category */}
                {(['Collection', 'Completed', 'Favorites', 'Ratings', 'Ongoing', 'Top 10', 'Countries', 'Journey', 'Hidden'] as const).map(cat => {
                  const catAchievements = achievements.filter(a => a.category === cat);
                  if (catAchievements.length === 0) return null;
                  const catUnlocked = catAchievements.filter(a => a.unlocked).length;
                  return (
                    <div key={cat} className="mb-6">
                      <h3 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
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
                        {catAchievements.map(ach => (
                          <div
                            key={ach.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                              ach.unlocked
                                ? 'bg-white/[0.06] border-white/[0.1]'
                                : 'bg-white/[0.02] border-white/[0.04] opacity-40'
                            }`}
                          >
                            <span className={`text-2xl flex-shrink-0 ${ach.unlocked ? '' : 'grayscale'}`}>
                              {ach.emoji}
                            </span>
                            <div className="min-w-0">
                              <p className={`text-sm font-semibold ${ach.unlocked ? 'text-white' : 'text-[#666]'}`}>
                                {ach.name}
                              </p>
                              <p className="text-[#888] text-[11px] leading-tight">{ach.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== 6. PERSONAL RECORDS ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4"
        >
          <SectionHeader title="Personal Records" icon={Star} />

          <div className="space-y-4">
            {/* 📚 Collection Records */}
            <RecordGroup title="Collection Records" icon={BookOpen}>
              <RecordRow label="Total Entries" value={total.toString()} icon={BookOpen} />
              <RecordRow label="Completed Titles" value={completed.toString()} icon={CheckCircle} />
              <RecordRow label="Planned Titles" value={planned.toString()} icon={Calendar} />
              <RecordRow label="Ongoing Titles" value={ongoing.toString()} icon={TrendingUp} />
              <RecordRow label="Dropped Titles" value={dropped.toString()} icon={XCircle} />
              <RecordRow label="Favorite Titles" value={favorites.toString()} icon={Heart} />
            </RecordGroup>

            {/* ⭐ Rating Records */}
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

            {/* 🏆 Top 10 Records */}
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

            {/* 🌏 Collection Diversity */}
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

            {/* 🎭 Collection Preferences */}
            <RecordGroup title="Collection Preferences" icon={Heart}>
              <RecordRow label="Most Common Status" value={personalRecords.mostCommonStatus} icon={CheckCircle} />
              <RecordRow label="Preferred Format" value={personalRecords.preferredFormat} icon={Film} />
              <RecordRow label="Preferred Country" value={personalRecords.preferredCountry} icon={Globe} />
              <RecordRow label="Favorite Rating Category" value={personalRecords.favoriteRatingCategory} icon={Star} />
            </RecordGroup>

            {/* 📈 Collection Completion */}
            <RecordGroup title="Collection Completion" icon={TrendingUp}>
              <RecordRow label="Completed" value={`${personalRecords.completionRate}%`} icon={CheckCircle} />
              <RecordRow label="Planned" value={`${personalRecords.plannedRate}%`} icon={Calendar} />
              <RecordRow label="Ongoing" value={`${personalRecords.ongoingRate}%`} icon={TrendingUp} />
              <RecordRow label="Dropped" value={`${personalRecords.dropRate}%`} icon={XCircle} />
            </RecordGroup>
          </div>
        </motion.div>

        {/* Tied Results Modals */}
        <AnimatePresence>
          {activeRecordModal === 'highestSeries' && (
            <TiedResultsModal
              title="Highest Rated Series"
              icon={Tv}
              items={personalRecords.highestSeriesTied.map(s => ({
                title: s.title,
                subtitle: `Rating: ${formatRating(s.rating)}`,
                poster: state.entries.find(e => e.id === s.entryId)?.poster || null
              }))}
              onClose={() => setActiveRecordModal(null)}
            />
          )}
          {activeRecordModal === 'highestMovie' && (
            <TiedResultsModal
              title="Highest Rated Movies"
              icon={Film}
              items={personalRecords.highestMovieTied.map(m => ({
                title: m.title,
                subtitle: `Rating: ${formatRating(m.rating)}`,
                poster: state.entries.find(e => e.id === m.entryId)?.poster || null
              }))}
              onClose={() => setActiveRecordModal(null)}
            />
          )}
          {activeRecordModal === 'mostWatchedCountry' && (
            <TiedResultsModal
              title="Most Watched Countries"
              icon={Globe}
              items={personalRecords.mostWatchedCountryTied.map(([country, count]) => ({
                title: country,
                subtitle: `${count} titles`,
                poster: null
              }))}
              onClose={() => setActiveRecordModal(null)}
            />
          )}
        </AnimatePresence>

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
  icon: Icon
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
  onClose
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { title: string; subtitle: string; poster: string | null }[];
  onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-black flex flex-col"
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
