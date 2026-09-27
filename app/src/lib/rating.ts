import type { EpisodeRating, FavoriteEntry } from '@/types';

const MAIN_RATING_DEFAULT = 5;
const MIN_RATING = 1;
const MAX_RATING = 10;
const EVALUATION_DEDUCTION = 0.1;
export const BONUS_CATEGORY_COUNT = 12;

export const CORE_RATING_DESCRIPTIONS = {
  Storyline: 'The narrative focus, plot depth, or content intensity assigned to a story’s plot.',
  Acting: 'Lead performances, technical skill, emotional range, and ability to embody each character.',
  Chemistry: 'The perceived connection, energetic resonance, and mutual responsiveness between two characters.',
  Music: 'How well the music supports the story, builds emotion, and defines the show’s atmosphere.',
  Production: 'The technical, auditory, and visual crafts working together to construct the project.',
} as const;

export const BONUS_RATING_DESCRIPTIONS = {
  Originality: 'Broke away from standard and cliché tropes.',
  'Character Depth': 'Characters had genuine flaws, realistic motives, and meaningful growth by the final episode.',
  'Relationship Dynamics': 'Recurring patterns of behavior, communication, and emotional interaction between two characters.',
  'Outstanding Chemistry': 'An electric, natural connection that elevated every scene shared on or off camera.',
  'Natural Skinship': 'Physical affection felt authentic and emotionally resonant rather than awkward or stiff.',
  'Secondary Couple / Supporting Characters': 'Supporting characters or couples were engaging instead of filler.',
  'Soundtrack (OST)': 'BGM and theme songs enhanced emotional beats and stayed memorable long after watching.',
  Cinematography: 'Color grading, lighting, and camera work made the show feel visually premium.',
  'Emotional Impact': 'How intensely the show moves, saddens, excites, or engages beyond technical quality.',
  Ending: 'The story stuck the landing without rushed time-skips, forced tragedies, or sudden open-ended trauma.',
  'Comfort Aura': 'A stress-free atmosphere that makes the show an elite escape to watch.',
  'Rewatch Value': 'How enjoyable, rewarding, or necessary it is to watch multiple times.',
} as const;

type RatingFields = Pick<
  FavoriteEntry,
  | 'storyline'
  | 'acting'
  | 'music'
  | 'chemistry'
  | 'production'
  | 'cinematography'
  | 'originality'
  | 'characterDepth'
  | 'relationshipDynamics'
  | 'outstandingChemistry'
  | 'naturalSkinship'
  | 'secondaryCouple'
  | 'soundtrack'
  | 'cinematographyBonus'
  | 'emotionalImpact'
  | 'ending'
  | 'comfortAura'
  | 'rewatchValue'
>;

function clampRating(value: number): number {
  return Math.min(MAX_RATING, Math.max(MIN_RATING, Number.isFinite(value) ? value : MAIN_RATING_DEFAULT));
}

export function getBonusCount(rating: Pick<FavoriteEntry, 'originality' | 'characterDepth' | 'relationshipDynamics' | 'outstandingChemistry' | 'naturalSkinship' | 'secondaryCouple' | 'soundtrack' | 'cinematographyBonus' | 'emotionalImpact' | 'ending' | 'comfortAura' | 'rewatchValue'>): number {
  return [
    rating.originality,
    rating.characterDepth,
    rating.relationshipDynamics,
    rating.outstandingChemistry,
    rating.naturalSkinship,
    rating.secondaryCouple,
    rating.soundtrack,
    rating.cinematographyBonus,
    rating.emotionalImpact,
    rating.ending,
    rating.comfortAura,
    rating.rewatchValue,
  ].filter(Boolean).length;
}

export function calculateEvaluationDeduction(rating: Pick<FavoriteEntry, 'originality' | 'characterDepth' | 'relationshipDynamics' | 'outstandingChemistry' | 'naturalSkinship' | 'secondaryCouple' | 'soundtrack' | 'cinematographyBonus' | 'emotionalImpact' | 'ending' | 'comfortAura' | 'rewatchValue'>): number {
  const uncheckedCount = BONUS_CATEGORY_COUNT - getBonusCount(rating);
  return Math.round(uncheckedCount * EVALUATION_DEDUCTION * 100) / 100;
}

export function getRatingTier(overallRating: number, rating: Pick<FavoriteEntry, 'originality' | 'characterDepth' | 'relationshipDynamics' | 'outstandingChemistry' | 'naturalSkinship' | 'secondaryCouple' | 'soundtrack' | 'cinematographyBonus' | 'emotionalImpact' | 'ending' | 'comfortAura' | 'rewatchValue'>): 'Masterpiece' | 'Highly Recommended' | 'Top Rated' | 'Hit' | null {
  const count = getBonusCount(rating);

  if (count === BONUS_CATEGORY_COUNT && overallRating === 10) return 'Masterpiece';
  if (count >= 8 && overallRating >= 9.8 && overallRating <= 9.9) return 'Highly Recommended';
  if (count >= 5 && overallRating >= 9.5 && overallRating <= 9.7) return 'Top Rated';
  if (count >= 3 && overallRating >= 9.3 && overallRating <= 9.6) return 'Hit';
  return null;
}

export function getEpisodeAverage(episodeRatings?: Record<string, EpisodeRating>): number | null {
  if (!episodeRatings) return null;
  const values = Object.values(episodeRatings)
    .map((rating) => rating.yourRating)
    .filter((rating) => Number.isFinite(rating) && rating >= MIN_RATING && rating <= MAX_RATING);
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

export function getEpisodeProgress(episodeRatings?: Record<string, unknown>): number {
  if (!episodeRatings) return 0;
  return Object.keys(episodeRatings)
    .map(Number)
    .filter((episode) => Number.isInteger(episode) && episode > 0)
    .reduce((max, episode) => Math.max(max, episode), 0);
}

export function calculateEvaluationDeductionLegacy(rating: Pick<FavoriteEntry, 'originality' | 'flowAndPacing' | 'characterDepth' | 'relationshipDynamics' | 'emotionalImpact' | 'ending' | 'rewatchValue'>): number {
  const uncheckedCount = [
    rating.originality,
    rating.flowAndPacing,
    rating.characterDepth,
    rating.relationshipDynamics,
    rating.emotionalImpact,
    rating.ending,
    rating.rewatchValue,
  ].filter((checked) => !checked).length;

  return Math.round(uncheckedCount * EVALUATION_DEDUCTION * 100) / 100;
}

export function calculateOverallRating(rating: RatingFields): number {
  const baseRating = (
    clampRating(rating.storyline) +
    clampRating(rating.acting) +
    clampRating(rating.music) +
    clampRating(rating.chemistry) +
    clampRating(rating.production ?? rating.cinematography)
  ) / 5;

  const totalDeduction = calculateEvaluationDeduction(rating);
  return Math.min(Math.round((baseRating - totalDeduction) * 100) / 100, MAX_RATING);
}

export function formatRating(rating: number): string {
  return (Number.isFinite(rating) ? rating : 0).toFixed(2).replace(/\.?0+$/, '');
}

export function normalizeFavoriteEntry(raw: Record<string, unknown>): FavoriteEntry {
  const normalized = {
    entryId: typeof raw.entryId === 'string' ? raw.entryId : '',
    storyline: typeof raw.storyline === 'number' ? clampRating(raw.storyline) : MAIN_RATING_DEFAULT,
    acting: typeof raw.acting === 'number' ? clampRating(raw.acting) : MAIN_RATING_DEFAULT,
    music: typeof raw.music === 'number' ? clampRating(raw.music) : MAIN_RATING_DEFAULT,
    chemistry: typeof raw.chemistry === 'number' ? clampRating(raw.chemistry) : MAIN_RATING_DEFAULT,
    production: typeof raw.production === 'number'
      ? clampRating(raw.production)
      : (typeof raw.cinematography === 'number' ? clampRating(raw.cinematography) : MAIN_RATING_DEFAULT),
    cinematography: typeof raw.cinematography === 'number' ? clampRating(raw.cinematography) : MAIN_RATING_DEFAULT,
    originality: Boolean(raw.originality),
    characterDepth: Boolean(raw.characterDepth),
    relationshipDynamics: Boolean(raw.relationshipDynamics),
    outstandingChemistry: Boolean(raw.outstandingChemistry),
    naturalSkinship: Boolean(raw.naturalSkinship),
    secondaryCouple: Boolean(raw.secondaryCouple),
    soundtrack: Boolean(raw.soundtrack),
    cinematographyBonus: Boolean(raw.cinematographyBonus),
    emotionalImpact: Boolean(raw.emotionalImpact),
    ending: Boolean(raw.ending),
    comfortAura: Boolean(raw.comfortAura),
    rewatchValue: Boolean(raw.rewatchValue),
    gapPenalty: 0,
    overallRating: 0,
  };

  normalized.gapPenalty = calculateEvaluationDeduction(normalized);
  normalized.overallRating = calculateOverallRating(normalized);
  return normalized;
}
