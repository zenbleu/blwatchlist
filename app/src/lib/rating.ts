import type { FavoriteEntry } from '@/types';

const MAIN_RATING_DEFAULT = 5;
const MIN_RATING = 1;
const MAX_RATING = 10;
const EVALUATION_DEDUCTION = 0.1;

type RatingFields = Pick<
  FavoriteEntry,
  | 'storyline'
  | 'acting'
  | 'music'
  | 'chemistry'
  | 'cinematography'
  | 'originality'
  | 'flowAndPacing'
  | 'characterDepth'
  | 'relationshipDynamics'
  | 'emotionalImpact'
  | 'ending'
  | 'rewatchValue'
>;

function clampRating(value: number): number {
  return Math.min(MAX_RATING, Math.max(MIN_RATING, Number.isFinite(value) ? value : MAIN_RATING_DEFAULT));
}

export function calculateEvaluationDeduction(rating: Pick<FavoriteEntry, 'originality' | 'flowAndPacing' | 'characterDepth' | 'relationshipDynamics' | 'emotionalImpact' | 'ending' | 'rewatchValue'>): number {
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
    clampRating(rating.cinematography)
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
    cinematography: typeof raw.cinematography === 'number' ? clampRating(raw.cinematography) : MAIN_RATING_DEFAULT,
    originality: Boolean(raw.originality),
    flowAndPacing: Boolean(raw.flowAndPacing),
    characterDepth: Boolean(raw.characterDepth),
    relationshipDynamics: Boolean(raw.relationshipDynamics),
    emotionalImpact: Boolean(raw.emotionalImpact),
    ending: Boolean(raw.ending),
    rewatchValue: Boolean(raw.rewatchValue),
    gapPenalty: 0,
    overallRating: 0,
  };

  normalized.gapPenalty = calculateEvaluationDeduction(normalized);
  normalized.overallRating = calculateOverallRating(normalized);
  return normalized;
}
