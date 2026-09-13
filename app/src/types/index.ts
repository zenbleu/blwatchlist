import type { Milestone } from '@/components/MilestoneModal';

export type Status = 'COMPLETE' | 'ONGOING' | 'DROPPED' | 'PLANNED';

export type AirDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export type OngoingTrackingMode = 'recurring' | 'calendar';

export interface Entry {
  id: string;
  poster: string | null;
  title: string;
  type: 'Movie' | 'Series';
  year: number;
  country: string;
  status: Status;
  createdAt: number;
  /** Timestamp of the most recent meaningful user update. */
  lastUpdatedAt: number;
  plannedDate?: string; // ISO date string (YYYY-MM-DD), only for PLANNED status
}

export interface OngoingEntry {
  entryId: string;
  currentEpisode: number;
  totalEpisodes: number;
  airDays: AirDay[];
  /** Date on which episode 1 was released, stored as YYYY-MM-DD. */
  firstAirDate?: string;
  /** Local time at which an episode is released, stored as HH:mm. */
  airTime?: string;
  /** Number of episodes released on the premiere date. Defaults to 1. */
  premiereEpisodeCount?: number;
  /** Use exact release dates instead of a recurring weekday schedule. */
  trackingMode?: OngoingTrackingMode;
  /** Dates on which one episode is scheduled to release, stored as YYYY-MM-DD. */
  releaseDates?: string[];
}

export interface FavoriteEntry {
  entryId: string;
  storyline: number;
  acting: number;
  music: number;
  chemistry: number;
  cinematography: number;
  originality: boolean;
  flowAndPacing: boolean;
  characterDepth: boolean;
  relationshipDynamics: boolean;
  emotionalImpact: boolean;
  ending: boolean;
  rewatchValue: boolean;
  gapPenalty: number;
  overallRating: number;
}

export interface Top10Entry {
  entryId: string;
  rank: number;
}

export interface Top10Drawer {
  year: number;
  entries: Top10Entry[];
}

export interface WatcherTitle {
  emoji: string;
  name: string;
  min: number;
  max: number;
  description: string;
}

export type AchievementCategory =
  | 'Collection'
  | 'Completed'
  | 'Favorites'
  | 'Ratings'
  | 'Ongoing'
  | 'Top 10'
  | 'Countries'
  | 'Journey'
  | 'Hidden';

export interface Achievement {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: AchievementCategory;
  hidden?: boolean;
  condition: (stats: CollectionStats) => boolean;
}

export interface CollectionStats {
  total: number;
  completed: number;
  ongoing: number;
  dropped: number;
  planned: number;
  favorites: number;
  top10: number;
  avgRating: string;
  countryBreakdown: [string, number][];
  highestRated: { title: string; rating: number; entryId: string; type: string }[];
  watchingSince: number | null;
  // Extended stats for 52 achievements
  currentYear: number;
  movies: number;
  series: number;
  perfectRatings: number;
  titlesBefore2010: number;
  titlesCurrentYear: number;
  droppedNowComplete: number;
  droppedNowFavorite: number;
  avgOverallNumeric: number;
  ratedCount: number;
  yearlyDrawerCount: number;
  top10FullDrawers: number;
  consecutiveRatedCount: number;
  uniqueRegions: number;
  allRegions: string[];
}

export interface AppState {
  entries: Entry[];
  ongoing: OngoingEntry[];
  favorites: FavoriteEntry[];
  ratings: FavoriteEntry[];
  top10Drawers: Top10Drawer[];
  ongoingYear: number;
  watchingSince: number | null;
}

export interface BackupMetadata {
  backupVersion: string;
  exportDate: string;
  appVersion: string;
}

export interface FullBackup {
  metadata: BackupMetadata;
  entries: Entry[];
  ongoing: OngoingEntry[];
  favorites: FavoriteEntry[];
  ratings: FavoriteEntry[];
  top10Drawers: Top10Drawer[];
  ongoingYear: number;
  watchingSince: number | null;
}

export interface LegacyBackupData {
  entries: Entry[];
}

export type AppAction =
  | { type: 'SET_STATE'; payload: AppState }
  | { type: 'ADD_ENTRY'; payload: Entry }
  | { type: 'UPDATE_ENTRY'; payload: Entry }
  | { type: 'DELETE_ENTRY'; payload: string }
  | { type: 'TOGGLE_FAVORITE'; payload: string }
  | { type: 'UPDATE_FAVORITE'; payload: FavoriteEntry }
  | { type: 'REMOVE_FAVORITE'; payload: string }
  | { type: 'UPDATE_RATING'; payload: FavoriteEntry }
  | { type: 'REMOVE_RATING'; payload: string }
  | { type: 'UPDATE_ONGOING'; payload: OngoingEntry }
  | { type: 'ADD_TO_TOP10'; payload: { year: number; entryId: string } }
  | { type: 'REMOVE_FROM_TOP10'; payload: { year: number; entryId: string } }
  | { type: 'REORDER_TOP10'; payload: { year: number; entries: Top10Entry[]; updatedEntryId?: string } }
  | { type: 'ADD_DRAWER'; payload: number }
  | { type: 'DELETE_DRAWER'; payload: number }
  | { type: 'IMPORT_DATA'; payload: unknown }
  | { type: 'SET_ONGOING_YEAR'; payload: number }
  | { type: 'SET_WATCHING_SINCE'; payload: number | null }
  | { type: 'SET_IMPORT_MODE'; payload: boolean }
  | { type: 'PUSH_MILESTONE'; payload: Milestone }
  | { type: 'POP_MILESTONE' }
  | { type: 'CLEAR_MILESTONE_QUEUE' }
  | { type: 'CELEBRATE_MILESTONE'; payload: string };

export interface StorageResult {
  success: boolean;
  message: string;
  details?: string;
  error?: string;
}
