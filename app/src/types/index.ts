import type { Milestone } from '@/components/MilestoneModal';

export type Status = 'COMPLETE' | 'ONGOING' | 'DROPPED' | 'PLANNED';
export type LinkedReleaseMode = 'independent' | 'included';

export interface GenreTag {
  id: string;
  name: string;
  category: string;
  color: string;
  custom?: boolean;
}

export type AirDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export type OngoingTrackingMode = 'recurring' | 'calendar';

export interface EpisodeRating {
  yourRating: number;
  commentary?: string;
}

export interface Entry {
  id: string;
  poster: string | null;
  title: string;
  type: 'Movie' | 'Series';
  /** Optional season metadata. Omitted means this is a standalone entry. */
  season?: number;
  /** Parent title for a separately tracked continuation or special release. */
  parentEntryId?: string;
  /** Included releases are tracked separately but are not independently ranked. */
  linkedReleaseMode?: LinkedReleaseMode;
  /** Genre IDs assigned to this entry; one entry may belong to several genres. */
  genres?: string[];
  year: number;
  country: string;
  status: Status;
  createdAt: number;
  /** Timestamp of the most recent meaningful user update. */
  lastUpdatedAt: number;
  /** Release date entered for a Planned entry; retained as the premiere date after promotion. */
  plannedDate?: string; // ISO date string (YYYY-MM-DD)
  /** Episode ratings keyed by episode number. */
  episodeRatings?: Record<string, EpisodeRating>;
}

export type ActorRole = 'MAIN' | 'SUPPORTING';

export interface ActorCredit {
  entryId: string;
  character: string;
  role: ActorRole;
}

export interface Actor {
  id: string;
  photo: string | null;
  name: string;
  nationality: string;
  birthDate: string;
  filmography: ActorCredit[];
}

export interface SpecialEpisode {
  id: string;
  specialNumber: number;
  title: string;
  releaseDate: string;
  releaseTime?: string;
  watched: boolean;
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
  /** Specials belong to this season but do not count toward totalEpisodes. */
  specialEpisodes?: SpecialEpisode[];
}

export interface FavoriteEntry {
  entryId: string;
  storyline: number;
  acting: number;
  music: number;
  chemistry: number;
  /** Revised core category. Kept alongside cinematography for old backups. */
  production: number;
  /** Legacy core field retained so existing backups and statistics remain readable. */
  cinematography: number;
  originality: boolean;
  characterDepth: boolean;
  relationshipDynamics: boolean;
  outstandingChemistry: boolean;
  naturalSkinship: boolean;
  secondaryCouple: boolean;
  soundtrack: boolean;
  /** Revised bonus category; distinct from the core Production score. */
  cinematographyBonus: boolean;
  emotionalImpact: boolean;
  ending: boolean;
  comfortAura: boolean;
  rewatchValue: boolean;
  /** Legacy bonus field retained for imports created before the revised system. */
  flowAndPacing?: boolean;
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
  genreTags: GenreTag[];
  actors: Actor[];
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
  genreTags: GenreTag[];
  actors: Actor[];
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
  | { type: 'ADD_GENRE_TAG'; payload: GenreTag }
  | { type: 'DELETE_GENRE_TAG'; payload: string }
  | { type: 'DELETE_ENTRY'; payload: string }
  | { type: 'ADD_ACTOR'; payload: Actor }
  | { type: 'UPDATE_ACTOR'; payload: Actor }
  | { type: 'DELETE_ACTOR'; payload: string }
  | { type: 'UPDATE_ACTOR_CREDIT'; payload: { actorId: string; entryId: string; character: string; role: ActorRole } }
  | { type: 'REMOVE_ACTOR_CREDIT'; payload: { actorId: string; entryId: string } }
  | { type: 'BULK_ADD_ACTOR_CREDITS'; payload: { actorIds: string[]; entryIds: string[]; role: ActorRole } }
  | { type: 'TOGGLE_FAVORITE'; payload: string }
  | { type: 'UPDATE_FAVORITE'; payload: FavoriteEntry }
  | { type: 'REMOVE_FAVORITE'; payload: string }
  | { type: 'UPDATE_RATING'; payload: FavoriteEntry }
  | { type: 'REMOVE_RATING'; payload: string }
  | { type: 'UPDATE_ONGOING'; payload: OngoingEntry }
  | { type: 'UPDATE_EPISODE_RATING'; payload: { entryId: string; episodeNumber: number; rating?: EpisodeRating } }
  | { type: 'ADD_TO_TOP10'; payload: { year: number; entryId: string } }
  | { type: 'REMOVE_FROM_TOP10'; payload: { year: number; entryId: string } }
  | { type: 'REORDER_TOP10'; payload: { year: number; entries: Top10Entry[]; updatedEntryId?: string } }
  | { type: 'ADD_DRAWER'; payload: number }
  | { type: 'DELETE_DRAWER'; payload: number }
  | { type: 'IMPORT_DATA'; payload: unknown }
  | { type: 'SET_ONGOING_YEAR'; payload: number }
  | { type: 'SET_WATCHING_SINCE'; payload: number | null }
  | { type: 'SET_IMPORT_MODE'; payload: boolean }
  | { type: 'PROMOTE_PLANNED_ENTRIES' }
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
