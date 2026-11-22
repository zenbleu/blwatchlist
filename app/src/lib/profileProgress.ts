import type { Achievement, AppState, CollectionStats, FavoriteEntry, WatcherTitle } from '@/types';
import { formatRating } from '@/lib/rating';

export const WATCHER_TITLES: WatcherTitle[] = [
  { emoji: '🌱', name: 'Newcomer', min: 1, max: 24, description: 'Every collection begins with a single story.' },
  { emoji: '📺', name: 'Casual Viewer', min: 25, max: 74, description: "You're beginning to explore the world of BL." },
  { emoji: '🍿', name: 'Weekend Binger', min: 75, max: 149, description: 'Watching BL has become part of your routine.' },
  { emoji: '🎭', name: 'Drama Enthusiast', min: 150, max: 299, description: "You've experienced many unforgettable stories." },
  { emoji: '💖', name: 'Romance Connoisseur', min: 300, max: 499, description: 'Your collection reflects passion and appreciation for the genre.' },
  { emoji: '🎬', name: 'BL Archivist', min: 500, max: 749, description: 'Your library has become a remarkable archive of BL.' },
  { emoji: '👑', name: 'BL Curator', min: 750, max: 999, description: "You've built a prestigious and thoughtfully curated collection." },
  { emoji: '🌌', name: 'BL Legend', min: 1000, max: Infinity, description: 'Your lifelong dedication has created an extraordinary BL legacy.' },
];

export function getWatcherTitle(total: number): WatcherTitle {
  if (total <= 0) return WATCHER_TITLES[0];
  return WATCHER_TITLES.find((t) => total >= t.min && total <= t.max) || WATCHER_TITLES[WATCHER_TITLES.length - 1];
}

export function getNextTitle(current: WatcherTitle): WatcherTitle | null {
  const idx = WATCHER_TITLES.indexOf(current);
  return idx >= 0 && idx < WATCHER_TITLES.length - 1 ? WATCHER_TITLES[idx + 1] : null;
}

export function getCountryFlag(country: string): string {
  switch (country) {
    case 'Thailand':
      return '🇹🇭';
    case 'Japan':
      return '🇯🇵';
    case 'Korea':
    case 'South Korea':
      return '🇰🇷';
    case 'Taiwan':
      return '🇹🇼';
    case 'China':
      return '🇨🇳';
    case 'Philippines':
      return '🇵🇭';
    case 'US':
    case 'USA':
    case 'United States':
      return '🇺🇸';
    case 'Vietnam':
      return '🇻🇳';
    default:
      return '🌏';
  }
}

function normalizeCountryForTraveler(country: string): string {
  const normalized = country.trim();
  if (normalized === 'Korea' || normalized === 'South Korea') return 'South Korea';
  if (normalized === 'USA' || normalized === 'United States' || normalized === 'U.S.' || normalized === 'U.S.A.') return 'US';
  return normalized;
}

export interface ExtendedCollectionStats extends CollectionStats {
  top10NonEmptyDrawers: number;
  activeDaysCount: number;
  hasFullyRatedYear: boolean;
  hasEarlyAdopterEntry: boolean;
}

export interface AchievementStatus extends Achievement {
  unlocked: boolean;
}

export const ACHIEVEMENTS: (Omit<Achievement, 'condition'> & {
  condition: (stats: ExtendedCollectionStats) => boolean;
})[] = [
  /* ---- Collection (9) ---- */
  { id: 'first-collection', emoji: '🏆', name: 'First Collection', description: 'Add your first BL entry', category: 'Collection', condition: (s) => s.total >= 1 },
  { id: 'growing-library', emoji: '📚', name: 'Growing Library', description: 'Collect 25 BL titles', category: 'Collection', condition: (s) => s.total >= 25 },
  { id: 'bookcase-filled', emoji: '📖', name: 'Bookcase Filled', description: 'Collect 50 BL titles', category: 'Collection', condition: (s) => s.total >= 50 },
  { id: 'archive-builder', emoji: '🎬', name: 'Archive Builder', description: 'Collect 100 BL titles', category: 'Collection', condition: (s) => s.total >= 100 },
  { id: 'master-archive', emoji: '🏛️', name: 'Master Archive', description: 'Collect 200 BL titles', category: 'Collection', condition: (s) => s.total >= 200 },
  { id: 'endless-collection', emoji: '🌌', name: 'Endless Collection', description: 'Collect 300 BL titles', category: 'Collection', condition: (s) => s.total >= 300 },
  { id: 'legendary-collection', emoji: '💎', name: 'Extraordinary Curator', description: 'Collect 500 BL titles', category: 'Collection', condition: (s) => s.total >= 500 },
  { id: 'legendary-collector', emoji: '👑', name: 'Legendary Collector', description: 'Collect 750 BL titles', category: 'Collection', condition: (s) => s.total >= 750 },
  { id: 'infinite-library', emoji: '🌈', name: 'Hall of Legends', description: 'Collect 1,000 BL titles', category: 'Collection', condition: (s) => s.total >= 1000 },

  /* ---- Completed (5) ---- */
  { id: 'first-finish', emoji: '📺', name: 'First Finish', description: 'Complete your first title', category: 'Completed', condition: (s) => s.completed >= 1 },
  { id: 'marathon-viewer', emoji: '🎉', name: 'Marathon Viewer', description: 'Complete 25 titles', category: 'Completed', condition: (s) => s.completed >= 25 },
  { id: 'dedicated-viewer', emoji: '🔥', name: 'Dedicated Viewer', description: 'Complete 100 titles', category: 'Completed', condition: (s) => s.completed >= 100 },
  { id: 'veteran-viewer', emoji: '🏅', name: 'Veteran Viewer', description: 'Complete 250 titles', category: 'Completed', condition: (s) => s.completed >= 250 },
  { id: 'ultimate-finisher', emoji: '👑', name: 'Ultimate Finisher', description: 'Complete 500 titles', category: 'Completed', condition: (s) => s.completed >= 500 },

  /* ---- Favorites (4) ---- */
  { id: 'first-favorite', emoji: '❤️', name: 'First Favorite', description: 'Add your first favorite', category: 'Favorites', condition: (s) => s.favorites >= 1 },
  { id: 'favorite-collector', emoji: '💖', name: 'Favorite Collector', description: 'Add 25 favorites', category: 'Favorites', condition: (s) => s.favorites >= 25 },
  { id: 'heart-collector', emoji: '💞', name: 'Heart Collector', description: 'Add 50 favorites', category: 'Favorites', condition: (s) => s.favorites >= 50 },
  { id: 'romance-archivist', emoji: '💘', name: 'Romance Archivist', description: 'Add 100 favorites', category: 'Favorites', condition: (s) => s.favorites >= 100 },

  /* ---- Ratings (4) ---- */
  { id: 'first-review', emoji: '⭐', name: 'First Review', description: 'Rate your first title', category: 'Ratings', condition: (s) => s.ratedCount >= 1 },
  { id: 'thoughtful-reviewer', emoji: '🌟', name: 'Thoughtful Reviewer', description: 'Rate 50 titles', category: 'Ratings', condition: (s) => s.ratedCount >= 50 },
  { id: 'master-critic', emoji: '📝', name: 'Master Critic', description: 'Rate 200 titles', category: 'Ratings', condition: (s) => s.ratedCount >= 200 },
  { id: 'perfect-taste', emoji: '🏆', name: 'Perfect Taste', description: 'Give 10 perfect 10/10 ratings', category: 'Ratings', condition: (s) => s.perfectRatings >= 10 },

  /* ---- Ongoing (3) ---- */
  { id: 'airing-companion', emoji: '📅', name: 'Airing Companion', description: 'Track 1 ongoing title', category: 'Ongoing', condition: (s) => s.ongoing >= 1 },
  { id: 'weekly-watcher', emoji: '📡', name: 'Weekly Watcher', description: 'Track 5 ongoing titles', category: 'Ongoing', condition: (s) => s.ongoing >= 5 },
  { id: 'always-updated', emoji: '⏳', name: 'Always Updated', description: 'Track 10 ongoing titles', category: 'Ongoing', condition: (s) => s.ongoing >= 10 },

  /* ---- Top 10 (4) ---- */
  { id: 'first-ranking', emoji: '🥇', name: 'First Ranking', description: 'Create your first Top 10 drawer', category: 'Top 10', condition: (s) => s.top10 >= 1 },
  { id: 'annual-curator', emoji: '📅', name: 'Annual Curator', description: 'Create 5 Top 10 drawers', category: 'Top 10', condition: (s) => s.top10 >= 5 },
  { id: 'ranking-master', emoji: '👑', name: 'Ranking Master', description: 'Create 10 Top 10 drawers', category: 'Top 10', condition: (s) => s.top10 >= 10 },
  { id: 'hall-of-fame', emoji: '🏛️', name: 'Hall of Fame', description: 'Every drawer has at least 1 ranked title', category: 'Top 10', condition: (s) => s.top10 > 0 && s.top10NonEmptyDrawers === s.top10 },

  /* ---- Countries (4) ---- */
  { id: 'first-passport', emoji: '✈️', name: 'First Passport', description: 'Watch BL from 2 countries', category: 'Countries', condition: (s) => s.uniqueRegions >= 2 },
  { id: 'asian-explorer', emoji: '🌏', name: 'Asian Explorer', description: 'Watch BL from 4 countries', category: 'Countries', condition: (s) => s.uniqueRegions >= 4 },
  { id: 'global-collector', emoji: '🌍', name: 'Global Collector', description: 'Watch BL from 6 countries', category: 'Countries', condition: (s) => s.uniqueRegions >= 6 },
  {
    id: 'world-traveler',
    emoji: '🌍',
    name: 'World Traveler',
    description: 'Collect BL titles from all supported countries (Thailand, Japan, South Korea, Taiwan, China, US)',
    category: 'Countries',
    condition: (s) => {
      const owned = new Set(s.allRegions.map(normalizeCountryForTraveler));
      return ['Thailand', 'Japan', 'South Korea', 'Taiwan', 'China', 'US'].every((c) => owned.has(c));
    },
  },

  /* ---- Journey (4) ---- */
  { id: 'first-step', emoji: '🌱', name: 'First Step', description: 'Set your Watching Since year', category: 'Journey', condition: (s) => s.watchingSince !== null },
  { id: 'five-year-journey', emoji: '📅', name: 'Five-Year Journey', description: '5+ years of BL watching', category: 'Journey', condition: (s) => s.watchingSince !== null && s.currentYear - s.watchingSince >= 5 },
  { id: 'decade-devotion', emoji: '🎉', name: 'Decade Devotion', description: '10+ years of BL watching', category: 'Journey', condition: (s) => s.watchingSince !== null && s.currentYear - s.watchingSince >= 10 },
  { id: 'lifetime-fan', emoji: '🏆', name: 'Lifetime Fan', description: '15+ years of BL watching', category: 'Journey', condition: (s) => s.watchingSince !== null && s.currentYear - s.watchingSince >= 15 },

  /* ---- Hidden (17) ---- */
  { id: 'nostalgia', emoji: '📼', name: 'Nostalgia', description: 'Collect 10 titles from before 2010', category: 'Hidden', hidden: true, condition: (s) => s.titlesBefore2010 >= 10 },
  { id: 'premiere-watcher', emoji: '🚀', name: 'Premiere Watcher', description: 'Collect 10 titles from the current year', category: 'Hidden', hidden: true, condition: (s) => s.titlesCurrentYear >= 10 },
  { id: 'second-chance', emoji: '🔄', name: 'Second Chance', description: 'A dropped title becomes completed', category: 'Hidden', hidden: true, condition: (s) => s.droppedNowComplete >= 1 },
  { id: 'tough-critic', emoji: '💔', name: 'Tough Critic', description: 'Drop 10 titles', category: 'Hidden', hidden: true, condition: (s) => s.dropped >= 10 },
  { id: 'redemption-arc', emoji: '❤️', name: 'Redemption Arc', description: 'A dropped title becomes a favorite', category: 'Hidden', hidden: true, condition: (s) => s.droppedNowFavorite >= 1 },
  { id: 'impossible-standard', emoji: '⭐', name: 'Impossible Standard', description: 'Average rating >= 9.5 across 100+ rated titles', category: 'Hidden', hidden: true, condition: (s) => s.avgOverallNumeric >= 9.5 && s.ratedCount >= 100 },
  { id: 'daily-explorer', emoji: '📅', name: 'Daily Explorer', description: 'Open the app on 30 different days', category: 'Hidden', hidden: true, condition: (s) => s.activeDaysCount >= 30 },
  { id: 'completionist-spirit', emoji: '📚', name: 'Completionist Spirit', description: 'Rate every title from a single year', category: 'Hidden', hidden: true, condition: (s) => s.hasFullyRatedYear },
  { id: 'perfect-top-10', emoji: '🎯', name: 'Perfect Top 10', description: 'Fill all 10 positions in a drawer', category: 'Hidden', hidden: true, condition: (s) => s.top10FullDrawers >= 1 },
  { id: 'early-adopter', emoji: '🌅', name: 'Early Adopter', description: 'Add a title within its release year', category: 'Hidden', hidden: true, condition: (s) => s.hasEarlyAdopterEntry },
  { id: 'organized-collector', emoji: '🗂️', name: 'Organized Collector', description: 'Create 10 yearly drawers', category: 'Hidden', hidden: true, condition: (s) => s.yearlyDrawerCount >= 10 },
  { id: 'consistent-reviewer', emoji: '🎖️', name: 'Consistent Reviewer', description: 'Rate 100 titles', category: 'Hidden', hidden: true, condition: (s) => s.consecutiveRatedCount >= 100 },
  { id: 'movie-marathon', emoji: '🎞️', name: 'Movie Marathon', description: 'Collect 50 movies', category: 'Hidden', hidden: true, condition: (s) => s.movies >= 50 },
  { id: 'series-marathon', emoji: '📺', name: 'Series Marathon', description: 'Collect 300 series', category: 'Hidden', hidden: true, condition: (s) => s.series >= 300 },
  { id: 'continental-explorer', emoji: '🧭', name: 'Continental Explorer', description: 'Watch BL from 5+ different countries', category: 'Hidden', hidden: true, condition: (s) => s.uniqueRegions >= 5 },
  { id: 'elite-collector', emoji: '🏅', name: 'Elite Collector', description: '90%+ completion rate with 500+ entries', category: 'Hidden', hidden: true, condition: (s) => s.total >= 500 && s.total > 0 && s.completed / s.total >= 0.9 },
  { id: 'hall-of-legacy', emoji: '🌟', name: 'Hall of Legacy', description: 'Unlock all non-hidden achievements', category: 'Hidden', hidden: true, condition: () => false },
];

export interface PersonalityTrait {
  id: string;
  celebrationKey: string;
  emoji: string;
  name: string;
  description: string;
  shortDesc: string;
  requirement: string;
  unlocked: boolean;
}

export interface PersonalityInput {
  total: number;
  allEntriesCount: number;
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
  isStorylineHighest: boolean;
  isActingHighest: boolean;
  isMusicHighest: boolean;
  isCinematographyHighest: boolean;
  isChemistryHighest: boolean;
  emotionalImpactPct: number;
  rewatchValuePct: number;
  mostWatchedCountry: string;
  activeDrawerCount: number;
}

export function evaluatePersonalityTraits(stats: PersonalityInput): {
  unlockedTraits: PersonalityTrait[];
  allTraits: PersonalityTrait[];
} {
  const avg = parseFloat(stats.avgRating) || 0;
  const rated = stats.ratedCount || 1;
  const completionDenominator = stats.completed + stats.dropped;
  const strictCompletionRate = completionDenominator > 0 ? stats.completed / completionDenominator : 0;
  const droppedRate = stats.total > 0 ? stats.dropped / stats.total : 1;

  const hasCompletionist = strictCompletionRate >= 0.9 && stats.completed > 0;
  const hasCurator = stats.top10 >= 3;
  const hasWorldExplorer = stats.countryBreakdown.length >= 5;
  const hasRomanticCollector = stats.favorites >= 50;
  const hasSeasonalWatcher = stats.ongoing >= 10;

  const maxCountryPct = stats.countryBreakdown.length > 0 && stats.allEntriesCount > 0
    ? stats.countryBreakdown[0][1] / stats.allEntriesCount
    : 1;
  const hasBothFormats = stats.movies > 0 && stats.series > 0;
  const maxStatusCount = Math.max(stats.completed, stats.dropped, stats.ongoing, stats.planned);
  const maxStatusPct = stats.allEntriesCount > 0 ? maxStatusCount / stats.allEntriesCount : 1;

  const allTraits: PersonalityTrait[] = [
    {
      id: 'library-builder',
      celebrationKey: 'library-builder',
      emoji: '📚',
      name: 'Library Builder',
      description: 'Your collection has grown to an impressive size.',
      shortDesc: `${stats.total} entries collected`,
      requirement: 'Collect at least 100 BL titles',
      unlocked: stats.total >= 100,
    },
    {
      id: 'completionist',
      celebrationKey: 'completionist',
      emoji: '🎭',
      name: 'Completionist',
      description: 'You finish nearly everything you start.',
      shortDesc: `${(strictCompletionRate * 100).toFixed(0)}% completion rate`,
      requirement: 'Maintain a 90%+ completion rate vs dropped titles',
      unlocked: hasCompletionist,
    },
    {
      id: 'world-explorer',
      celebrationKey: 'world-explorer',
      emoji: '🌏',
      name: 'World Explorer',
      description: 'Your collection spans multiple countries and styles.',
      shortDesc: `${stats.countryBreakdown.length} countries`,
      requirement: 'Watch BL from 5 or more countries',
      unlocked: hasWorldExplorer,
    },
    {
      id: 'romantic-collector',
      celebrationKey: 'romantic-collector',
      emoji: '❤️',
      name: 'Romantic Collector',
      description: 'You have a large curated list of beloved titles.',
      shortDesc: `${stats.favorites} favorites`,
      requirement: 'Add at least 50 titles to Favorites',
      unlocked: hasRomanticCollector,
    },
    {
      id: 'selective-critic',
      celebrationKey: 'selective-critic',
      emoji: '⭐',
      name: 'Selective Critic',
      description: 'You reserve top marks for only the most exceptional.',
      shortDesc: `${stats.perfectRatings} perfect ratings`,
      requirement: 'Keep 10.0 ratings to 10% or less of your rated titles',
      unlocked: stats.ratedCount > 0 && stats.perfectRatings / rated <= 0.1 && stats.perfectRatings > 0,
    },
    {
      id: 'generous-reviewer',
      celebrationKey: 'generous-reviewer',
      emoji: '🌟',
      name: 'Generous Reviewer',
      description: 'You appreciate the artistry in BL storytelling.',
      shortDesc: `Avg ${avg.toFixed(2)}/10`,
      requirement: 'Achieve an average rating of 9.00 or higher',
      unlocked: stats.ratedCount > 0 && avg >= 9.0,
    },
    {
      id: 'curator',
      celebrationKey: 'curator',
      emoji: '🎬',
      name: 'Curator',
      description: 'You organize your favorites into yearly rankings.',
      shortDesc: `${stats.top10} drawers`,
      requirement: 'Create 3 or more Top 10 drawers',
      unlocked: hasCurator,
    },
    {
      id: 'seasonal-watcher',
      celebrationKey: 'seasonal-watcher',
      emoji: '📅',
      name: 'Seasonal Watcher',
      description: 'You actively follow many currently airing releases.',
      shortDesc: `${stats.ongoing} ongoing`,
      requirement: 'Follow 10 or more ongoing titles at once',
      unlocked: hasSeasonalWatcher,
    },
    {
      id: 'marathon-viewer',
      celebrationKey: 'marathon-viewer',
      emoji: '🔥',
      name: 'Marathon Viewer',
      description: 'You have watched a remarkable number of BL titles.',
      shortDesc: `${stats.completed} completed`,
      requirement: 'Complete 100 or more BL titles',
      unlocked: stats.completed >= 100,
    },
    {
      id: 'fresh-explorer',
      celebrationKey: 'fresh-explorer',
      emoji: '🌱',
      name: 'Fresh Explorer',
      description: 'You actively discover recent releases.',
      shortDesc: `${stats.currentYearCount} recent titles`,
      requirement: 'Collect 30+ titles from the current or previous year',
      unlocked: stats.currentYearCount >= 30,
    },
    {
      id: 'classic-enthusiast',
      celebrationKey: 'classic-enthusiast',
      emoji: '🏛️',
      name: 'Classic Enthusiast',
      description: 'You appreciate the foundational works of BL.',
      shortDesc: `${stats.oldTitlesCount} classic titles`,
      requirement: 'Collect 20+ titles released in 2015 or earlier',
      unlocked: stats.oldTitlesCount >= 20,
    },
    {
      id: 'movie-lover',
      celebrationKey: 'movie-lover',
      emoji: '🎞️',
      name: 'Movie Lover',
      description: 'A significant portion of your collection is films.',
      shortDesc: `${stats.movies} movies`,
      requirement: 'Movies make up at least 40% of your entries',
      unlocked: stats.allEntriesCount > 0 && stats.movies / stats.allEntriesCount >= 0.4,
    },
    {
      id: 'series-specialist',
      celebrationKey: 'series-specialist',
      emoji: '📺',
      name: 'Series Specialist',
      description: 'You primarily follow BL series.',
      shortDesc: `${stats.series} series`,
      requirement: 'Series make up at least 70% of your entries',
      unlocked: stats.allEntriesCount > 0 && stats.series / stats.allEntriesCount >= 0.7,
    },
    {
      id: 'country-fan',
      celebrationKey: stats.mostWatchedCountry ? `country-fan-${stats.mostWatchedCountry}` : 'country-fan',
      emoji: getCountryFlag(stats.mostWatchedCountry),
      name: stats.mostWatchedCountry ? `${stats.mostWatchedCountry} Fan` : 'Country Fan',
      description: stats.mostWatchedCountry
        ? `Most of your collection comes from ${stats.mostWatchedCountry}.`
        : 'Add titles to reveal your top country.',
      shortDesc: 'Most watched country',
      requirement: 'Have a top watched country in your collection',
      unlocked: Boolean(stats.mostWatchedCountry),
    },
    {
      id: 'story-lover',
      celebrationKey: 'story-lover',
      emoji: '🎨',
      name: 'Story Lover',
      description: 'Storytelling is what you value most in BL.',
      shortDesc: 'Highest: Storyline',
      requirement: 'Storyline is your highest-rated category',
      unlocked: stats.isStorylineHighest && stats.ratedCount > 0,
    },
    {
      id: 'performance-admirer',
      celebrationKey: 'performance-admirer',
      emoji: '🎭',
      name: 'Performance Admirer',
      description: 'Acting performances stand out to you.',
      shortDesc: 'Highest: Acting',
      requirement: 'Acting is your highest-rated category',
      unlocked: stats.isActingHighest && stats.ratedCount > 0,
    },
    {
      id: 'ost-enthusiast',
      celebrationKey: 'ost-enthusiast',
      emoji: '🎼',
      name: 'OST Enthusiast',
      description: 'Music and soundtracks elevate your experience.',
      shortDesc: 'Highest: Music',
      requirement: 'Music is your highest-rated category',
      unlocked: stats.isMusicHighest && stats.ratedCount > 0,
    },
    {
      id: 'visual-aficionado',
      celebrationKey: 'visual-aficionado',
      emoji: '🎥',
      name: 'Visual Aficionado',
      description: 'Visual storytelling captivates you.',
      shortDesc: 'Highest: Production',
      requirement: 'Production/Cinematography is your highest-rated category',
      unlocked: stats.isCinematographyHighest && stats.ratedCount > 0,
    },
    {
      id: 'chemistry-seeker',
      celebrationKey: 'chemistry-seeker',
      emoji: '💞',
      name: 'Chemistry Seeker',
      description: 'On-screen chemistry is what you cherish most.',
      shortDesc: 'Highest: Chemistry',
      requirement: 'Chemistry is your highest-rated category',
      unlocked: stats.isChemistryHighest && stats.ratedCount > 0,
    },
    {
      id: 'emotional-viewer',
      celebrationKey: 'emotional-viewer',
      emoji: '😭',
      name: 'Emotional Viewer',
      description: 'BL stories deeply move you.',
      shortDesc: `${stats.emotionalImpactPct.toFixed(0)}% emotional impact`,
      requirement: 'Mark Emotional Impact on 80%+ of rated titles',
      unlocked: stats.ratedCount > 0 && stats.emotionalImpactPct >= 80,
    },
    {
      id: 'rewatch-expert',
      celebrationKey: 'rewatch-expert',
      emoji: '🔄',
      name: 'Rewatch Expert',
      description: 'You love revisiting your favorite stories.',
      shortDesc: `${stats.rewatchValuePct.toFixed(0)}% rewatchable`,
      requirement: 'Mark Rewatch Value on 80%+ of rated titles',
      unlocked: stats.ratedCount > 0 && stats.rewatchValuePct >= 80,
    },
    {
      id: 'active-collector',
      celebrationKey: 'active-collector',
      emoji: '📈',
      name: 'Active Collector',
      description: 'Your collection is actively growing.',
      shortDesc: 'Recently active',
      requirement: 'Add at least 1 entry within the last 30 days',
      unlocked: stats.activeDrawerCount > 0,
    },
    {
      id: 'quality-over-quantity',
      celebrationKey: 'quality-over-quantity',
      emoji: '🎯',
      name: 'Quality Over Quantity',
      description: 'You have a small but highly rated collection.',
      shortDesc: `Avg ${avg.toFixed(2)} with ${stats.total} titles`,
      requirement: 'Avg rating 9.2+ with fewer than 100 titles',
      unlocked: stats.ratedCount > 0 && avg >= 9.2 && stats.total > 0 && stats.total < 100,
    },
    {
      id: 'balanced-viewer',
      celebrationKey: 'balanced-viewer',
      emoji: '🧩',
      name: 'Balanced Viewer',
      description: 'You have a well-balanced, diverse collection.',
      shortDesc: 'Diverse & balanced',
      requirement: '10+ titles, both formats, no country >50%, no status >70%',
      unlocked: maxCountryPct <= 0.5 && maxStatusPct <= 0.7 && hasBothFormats && stats.total >= 10,
    },
    {
      id: 'trend-chaser',
      celebrationKey: 'trend-chaser',
      emoji: '🚀',
      name: 'Trend Chaser',
      description: 'You keep up with the latest BL releases.',
      shortDesc: `${stats.currentYearCount} new titles`,
      requirement: 'Collect 15+ titles from the current or previous year',
      unlocked: stats.currentYearCount >= 15,
    },
    {
      id: 'loyal-finisher',
      celebrationKey: 'loyal-finisher',
      emoji: '🛡️',
      name: 'Loyal Finisher',
      description: 'You rarely drop a series once started.',
      shortDesc: `${(droppedRate * 100).toFixed(0)}% drop rate`,
      requirement: 'Keep dropped titles at 5% or less of your collection',
      unlocked: droppedRate <= 0.05 && stats.total > 0,
    },
    {
      id: 'variety-seeker',
      celebrationKey: 'variety-seeker',
      emoji: '🎲',
      name: 'Variety Seeker',
      description: 'You explore BL from many different countries.',
      shortDesc: `${stats.countryBreakdown.length} countries`,
      requirement: 'Watch BL from 6 or more countries',
      unlocked: stats.countryBreakdown.length >= 6,
    },
    {
      id: 'bl-enthusiast',
      celebrationKey: 'bl-enthusiast',
      emoji: '🌈',
      name: 'BL Enthusiast',
      description: 'The ultimate BL fan — diverse, dedicated, and devoted.',
      shortDesc: 'All core traits unlocked',
      requirement: 'Unlock Completionist, Curator, World Explorer, Romantic Collector, and Seasonal Watcher',
      unlocked: hasCompletionist && hasCurator && hasWorldExplorer && hasRomanticCollector && hasSeasonalWatcher,
    },
  ];

  return {
    unlockedTraits: allTraits.filter((t) => t.unlocked),
    allTraits,
  };
}

export function getCombinedEvaluations(state: Pick<AppState, 'favorites' | 'ratings'>): FavoriteEntry[] {
  const byEntryId = new Map<string, FavoriteEntry>();
  for (const r of state.ratings) {
    byEntryId.set(r.entryId, r);
  }
  for (const f of state.favorites) {
    byEntryId.set(f.entryId, f);
  }
  return Array.from(byEntryId.values());
}

export function computeProfileProgress(
  state: AppState & { droppedEntryIds?: string[]; activeDays?: string[] },
  now: Date = new Date(),
) {
  const currentYear = now.getFullYear();

  const total = state.entries.filter((e) => e.status === 'COMPLETE' || e.status === 'ONGOING').length;
  const completed = state.entries.filter((e) => e.status === 'COMPLETE').length;
  const ongoing = state.entries.filter((e) => e.status === 'ONGOING').length;
  const dropped = state.entries.filter((e) => e.status === 'DROPPED').length;
  const planned = state.entries.filter((e) => e.status === 'PLANNED').length;
  const favorites = state.favorites.length;
  const top10 = state.top10Drawers.length;

  const evaluations = getCombinedEvaluations(state);
  const avgRating = evaluations.length > 0
    ? formatRating(evaluations.reduce((s, f) => s + f.overallRating, 0) / evaluations.length)
    : '0.00';

  const countryMap = new Map<string, number>();
  const knownCountries = ['Thailand', 'Japan', 'Taiwan', 'Korea', 'South Korea', 'China'];
  let othersCount = 0;

  state.entries.forEach((e) => {
    if (knownCountries.includes(e.country)) {
      const key = e.country === 'South Korea' ? 'Korea' : e.country;
      countryMap.set(key, (countryMap.get(key) || 0) + 1);
    } else {
      othersCount++;
    }
  });
  if (othersCount > 0) countryMap.set('Others', othersCount);
  const countryBreakdown = Array.from(countryMap.entries()).sort((a, b) => b[1] - a[1]);

  const highestRated = evaluations
    .map((f) => {
      const entry = state.entries.find((e) => e.id === f.entryId);
      return {
        title: entry?.title || 'Unknown',
        rating: f.overallRating,
        entryId: f.entryId,
        type: entry?.type || 'Series',
      };
    })
    .sort((a, b) => b.rating - a.rating);

  const watchingSince = state.watchingSince;
  const currentTitle = getWatcherTitle(total);
  const nextTitle = getNextTitle(currentTitle);
  const experience = watchingSince ? Math.max(0, currentYear - watchingSince) : 0;

  const progressPercent = (() => {
    if (!nextTitle) return 100;
    const range = nextTitle.min - currentTitle.min;
    const progress = total - currentTitle.min;
    return Math.min(100, Math.max(0, (progress / range) * 100));
  })();

  const movies = state.entries.filter((e) => e.type === 'Movie').length;
  const series = state.entries.filter((e) => e.type === 'Series').length;
  const perfectRatings = evaluations.filter((f) => f.overallRating >= 10.0).length;
  const currentYearCount = state.entries.filter((e) => e.year >= currentYear - 1).length;
  const oldTitlesCount = state.entries.filter((e) => e.year <= 2015).length;
  const ratedCount = evaluations.length;

  const categoryAvgs = ratedCount > 0
    ? {
        storyline: evaluations.reduce((s, f) => s + f.storyline, 0) / ratedCount,
        acting: evaluations.reduce((s, f) => s + f.acting, 0) / ratedCount,
        music: evaluations.reduce((s, f) => s + f.music, 0) / ratedCount,
        cinematography: evaluations.reduce((s, f) => s + (f.production ?? f.cinematography ?? 0), 0) / ratedCount,
        chemistry: evaluations.reduce((s, f) => s + f.chemistry, 0) / ratedCount,
      }
    : null;

  const maxCategory = categoryAvgs
    ? Object.entries(categoryAvgs).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
    : '';
  const emotionalImpactPct = ratedCount > 0
    ? (evaluations.filter((f) => f.emotionalImpact).length / ratedCount) * 100
    : 0;
  const rewatchValuePct = ratedCount > 0
    ? (evaluations.filter((f) => f.rewatchValue).length / ratedCount) * 100
    : 0;
  const mostWatchedCountry = countryBreakdown[0]?.[0] || '';
  const activeDrawerCount = state.entries.filter((e) => e.createdAt > now.getTime() - 30 * 24 * 60 * 60 * 1000).length;

  const { unlockedTraits: personalityTraits, allTraits: allPersonalityTraits } = evaluatePersonalityTraits({
    total,
    allEntriesCount: state.entries.length,
    completed,
    dropped,
    planned,
    favorites,
    ratedCount,
    avgRating,
    ongoing,
    countryBreakdown,
    top10,
    movies,
    series,
    perfectRatings,
    currentYearCount,
    oldTitlesCount,
    isStorylineHighest: maxCategory === 'storyline',
    isActingHighest: maxCategory === 'acting',
    isMusicHighest: maxCategory === 'music',
    isCinematographyHighest: maxCategory === 'cinematography',
    isChemistryHighest: maxCategory === 'chemistry',
    emotionalImpactPct,
    rewatchValuePct,
    mostWatchedCountry,
    activeDrawerCount,
  });

  const droppedSet = new Set(state.droppedEntryIds ?? []);
  const favoriteIds = new Set(state.favorites.map((f) => f.entryId));
  const ratedIds = new Set(evaluations.map((e) => e.entryId));

  const titlesBefore2010 = state.entries.filter((e) => e.year < 2010).length;
  const titlesCurrentYear = state.entries.filter((e) => e.year === currentYear).length;
  const droppedNowComplete = state.entries.filter(
    (e) => e.status === 'COMPLETE' && droppedSet.has(e.id),
  ).length;
  const droppedNowFavorite = state.entries.filter(
    (e) => favoriteIds.has(e.id) && (e.status === 'DROPPED' || droppedSet.has(e.id)),
  ).length;
  const avgOverallNumeric = evaluations.length > 0
    ? evaluations.reduce((s, f) => s + f.overallRating, 0) / evaluations.length
    : 0;
  const yearlyDrawerCount = state.top10Drawers.length;
  const top10FullDrawers = state.top10Drawers.filter((d) => d.entries.length >= 10).length;
  const top10NonEmptyDrawers = state.top10Drawers.filter((d) => d.entries.length >= 1).length;
  const consecutiveRatedCount = evaluations.filter((f) => f.overallRating > 0).length;
  const allRegions = [...new Set(state.entries.map((e) => e.country).filter(Boolean))];
  const uniqueRegions = new Set(allRegions.map(normalizeCountryForTraveler)).size;

  const entriesByYear = new Map<number, typeof state.entries>();
  for (const entry of state.entries) {
    const list = entriesByYear.get(entry.year);
    if (list) list.push(entry);
    else entriesByYear.set(entry.year, [entry]);
  }
  const hasFullyRatedYear = Array.from(entriesByYear.values()).some((yearEntries) =>
    yearEntries.length > 0 && yearEntries.every((entry) =>
      ratedIds.has(entry.id)
      || entry.storylineRating !== undefined
      || (entry.episodeRatings !== undefined && Object.keys(entry.episodeRatings).length > 0),
    ),
  );

  const hasEarlyAdopterEntry = state.entries.some((entry) => {
    if (!entry.createdAt) return false;
    return new Date(entry.createdAt).getFullYear() === entry.year;
  });

  const achievementStats: ExtendedCollectionStats = {
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
    movies,
    series,
    perfectRatings,
    titlesBefore2010,
    titlesCurrentYear,
    droppedNowComplete,
    droppedNowFavorite,
    avgOverallNumeric,
    ratedCount,
    yearlyDrawerCount,
    top10FullDrawers,
    top10NonEmptyDrawers,
    consecutiveRatedCount,
    uniqueRegions,
    allRegions,
    activeDaysCount: state.activeDays?.length ?? 1,
    hasFullyRatedYear,
    hasEarlyAdopterEntry,
  };

  const baseAchievements = ACHIEVEMENTS.map((ach) => ({
    ...ach,
    unlocked: ach.condition(achievementStats),
  }));
  const nonHidden = baseAchievements.filter((a) => !a.hidden);
  const allNonHiddenUnlocked = nonHidden.length > 0 && nonHidden.every((a) => a.unlocked);
  const achievements: AchievementStatus[] = baseAchievements.map((ach) =>
    ach.id === 'hall-of-legacy'
      ? { ...ach, unlocked: allNonHiddenUnlocked }
      : ach,
  );

  return {
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
    ratedCount,
    personalityTraits,
    allPersonalityTraits,
    achievements,
  };
}
