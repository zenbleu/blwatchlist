// ── Monthly BL Wrapped — Type Definitions ────────────────────────────────────

/** "YYYY-MM" string, e.g. "2026-07" */
export type MonthKey = string;

// ── Activity tracking (mutable, lives in IndexedDB) ──────────────────────────

export interface TrackedEntry {
  id: string;
  title: string;
  country: string;
  type: 'Movie' | 'Series';
  rating?: number;
}

export interface MonthlyActivityData {
  month: MonthKey;           // "YYYY-MM"
  createdAt: number;         // when we first started tracking this month
  updatedAt: number;

  // Entry additions by status
  completedTitles: TrackedEntry[];
  droppedTitles:   TrackedEntry[];
  plannedTitles:   TrackedEntry[];
  ongoingStarted:  TrackedEntry[];  // entries added as ONGOING
  totalEntriesAdded: number;

  // Status-change completions (entry existed before, user marked it COMPLETE this month)
  statusCompletions: TrackedEntry[];

  // Favorites
  favoritesAdded:   TrackedEntry[];
  favoritesRemoved: number;

  // Ratings  (UPDATE_FAVORITE or TOGGLE_FAVORITE that sets initial rating)
  ratingsGiven:  number;
  ratingsEdited: number;
  ratingValues:  number[];           // for computing avg / highest / lowest

  // Per-entry latest rating this month (to find highest/lowest)
  ratingByEntry: Record<string, { title: string; rating: number; country: string; type: string }>;

  // Top 10
  top10Updates: number;
  top10DrawersCreated: number;

  // Milestones / achievements this month
  milestonesUnlocked: Array<{ id: string; title: string; type: string; value: number }>;

  // Countries touched (from completed titles)
  countriesWatched: string[];

  // Collection size delta
  netCollectionGrowth: number;     // +add - delete

  // Rank snapshots (captured on each update)
  rankAtLastUpdate: string | null; // watcher title name
  rankEmojiAtLastUpdate: string | null;
}

export function emptyActivityData(month: MonthKey): MonthlyActivityData {
  const now = Date.now();
  return {
    month,
    createdAt: now,
    updatedAt: now,
    completedTitles: [],
    droppedTitles: [],
    plannedTitles: [],
    ongoingStarted: [],
    totalEntriesAdded: 0,
    statusCompletions: [],
    favoritesAdded: [],
    favoritesRemoved: 0,
    ratingsGiven: 0,
    ratingsEdited: 0,
    ratingValues: [],
    ratingByEntry: {},
    top10Updates: 0,
    top10DrawersCreated: 0,
    milestonesUnlocked: [],
    countriesWatched: [],
    netCollectionGrowth: 0,
    rankAtLastUpdate: null,
    rankEmojiAtLastUpdate: null,
  };
}

// ── Wrapped Snapshot (immutable, permanent) ───────────────────────────────────

export interface MonthlyWrappedSnapshot {
  month: MonthKey;
  year: number;
  monthNumber: number;   // 1–12
  generatedAt: number;
  isViewed: boolean;
  data: MonthlyActivityData;
  // State captured at snapshot time
  collectionSizeAtEnd: number;
  rankAtEnd: string | null;
  rankEmojiAtEnd: string | null;
  avgRatingAllTime: string | null;
}

// ── Slide types for the presentation ─────────────────────────────────────────

export type SlideType =
  | 'intro'
  | 'completed'
  | 'ongoing'
  | 'planned'
  | 'dropped'
  | 'favorites'
  | 'ratings'
  | 'highest-rated'
  | 'avg-rating'
  | 'country'
  | 'top10'
  | 'achievement'
  | 'growth'
  | 'rank'
  | 'quiet'
  | 'ending';

export interface WrappedSlide {
  id: string;
  type: SlideType;
  narratorComment?: string;
  // Typed payload per slide type
  payload: SlidePayload;
}

export type SlidePayload =
  | IntroPayload
  | StatPayload
  | HighlightPayload
  | CountryPayload
  | AchievementPayload
  | RankPayload
  | EndingPayload
  | QuietPayload;

export interface IntroPayload   { month: string; year: number; monthName: string }
export interface StatPayload    { count: number; label: string; titles?: string[]; entries?: TrackedEntry[] }
export interface HighlightPayload { title: string; country: string; type: string; rating: number; entryId?: string }
export interface CountryPayload {
  country: string;
  count: number;
  allCountries: [string, number][];
  entries?: TrackedEntry[];
}
export interface AchievementPayload { achievements: Array<{ title: string; type: string }> }
export interface RankPayload    { rank: string; emoji: string; isNew: boolean }
export interface EndingPayload  { monthName: string; year: number; totalCompleted: number }
export interface QuietPayload   { month: string; year: number; monthName: string }

// ── Context value ─────────────────────────────────────────────────────────────

export interface WrappedContextValue {
  snapshots: MonthlyWrappedSnapshot[];
  pendingSnapshot: MonthlyWrappedSnapshot | null;   // first unviewed
  activeSnapshot: MonthlyWrappedSnapshot | null;    // being viewed right now
  historyOpen: boolean;
  isReady: boolean;

  viewSnapshot: (snapshot: MonthlyWrappedSnapshot) => void;
  dismissPresentation: () => void;
  openHistory: () => void;
  closeHistory: () => void;
  replaySnapshot: (month: MonthKey) => void;
}

// ── Annual BL Wrapped ─────────────────────────────────────────────────────────

export interface AnnualTrackedEntry extends TrackedEntry {
  genres?: string[];
}

export interface AnnualRankingEntry extends AnnualTrackedEntry {
  rank: number;
  drawerYear: number;
}

/**
 * Mutable yearly activity. This is deliberately separate from monthly activity:
 * a yearly snapshot must be buildable even when some monthly snapshots are
 * missing or were never viewed.
 */
export interface AnnualActivityData {
  year: number;
  createdAt: number;
  updatedAt: number;
  completedTitles: AnnualTrackedEntry[];
  droppedTitles: AnnualTrackedEntry[];
  plannedTitles: AnnualTrackedEntry[];
  ongoingStarted: AnnualTrackedEntry[];
  ongoingContinued: AnnualTrackedEntry[];
  statusCompletions: AnnualTrackedEntry[];
  totalEntriesAdded: number;
  favoritesAdded: AnnualTrackedEntry[];
  favoritesRemoved: number;
  ratingsGiven: number;
  ratingsEdited: number;
  ratingValues: number[];
  ratingByEntry: Record<string, AnnualTrackedEntry & { rating: number }>;
  top10Updates: number;
  top10DrawersCreated: number;
  top10Rankings: Record<string, AnnualRankingEntry[]>;
  milestonesUnlocked: Array<{ id: string; title: string; type: string; value: number }>;
  countriesWatched: string[];
  genresWatched: string[];
  moviesWatched: number;
  seriesWatched: number;
  netCollectionGrowth: number;
  collectionSizeAtLastUpdate: number | null;
  rankAtLastUpdate: string | null;
  rankEmojiAtLastUpdate: string | null;
}

export function emptyAnnualActivityData(year: number): AnnualActivityData {
  const now = Date.now();
  return {
    year,
    createdAt: now,
    updatedAt: now,
    completedTitles: [],
    droppedTitles: [],
    plannedTitles: [],
    ongoingStarted: [],
    ongoingContinued: [],
    statusCompletions: [],
    totalEntriesAdded: 0,
    favoritesAdded: [],
    favoritesRemoved: 0,
    ratingsGiven: 0,
    ratingsEdited: 0,
    ratingValues: [],
    ratingByEntry: {},
    top10Updates: 0,
    top10DrawersCreated: 0,
    top10Rankings: {},
    milestonesUnlocked: [],
    countriesWatched: [],
    genresWatched: [],
    moviesWatched: 0,
    seriesWatched: 0,
    netCollectionGrowth: 0,
    collectionSizeAtLastUpdate: null,
    rankAtLastUpdate: null,
    rankEmojiAtLastUpdate: null,
  };
}

export interface AnnualWrappedSnapshot {
  year: number;
  generatedAt: number;
  isViewed: boolean;
  data: AnnualActivityData;
  collectionSizeAtEnd: number | null;
  rankAtEnd: string | null;
  rankEmojiAtEnd: string | null;
  version: number;
}

export type AnnualSlideType =
  | 'intro' | 'activity' | 'completed' | 'growth' | 'favorites' | 'ratings'
  | 'highest-rated' | 'countries' | 'genres' | 'ongoing' | 'top10'
  | 'achievement' | 'rank' | 'quiet' | 'ending';

export interface AnnualWrappedSlide {
  id: string;
  type: AnnualSlideType;
  narratorComment?: string;
  payload: AnnualSlidePayload;
}

export type AnnualSlidePayload =
  | { year: number; totalActivity: number }
  | { count: number; label: string; titles?: string[]; entries?: AnnualTrackedEntry[] }
  | { title: string; country: string; type: string; rating: number; entryId?: string }
  | { name: string; count: number; all: [string, number][]; entries?: AnnualTrackedEntry[] }
  | { countryCount: number; topCountry?: string; topCountryCount?: number }
  | { genreCount: number; topGenre?: string; topGenreCount?: number }
  | { achievements: Array<{ title: string; type: string }> }
  | { rank: string; emoji: string }
  | { entries: AnnualRankingEntry[]; drawerYear: number }
  | { year: number };

export interface AnnualWrappedContextValue {
  snapshots: AnnualWrappedSnapshot[];
  pendingSnapshot: AnnualWrappedSnapshot | null;
  activeSnapshot: AnnualWrappedSnapshot | null;
  historyOpen: boolean;
  isReady: boolean;
  viewSnapshot: (snapshot: AnnualWrappedSnapshot) => void;
  dismissPresentation: () => void;
  openHistory: () => void;
  closeHistory: () => void;
  replaySnapshot: (year: number) => void;
}
