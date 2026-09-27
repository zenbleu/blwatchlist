import type { FavoriteEntry } from '@/types';
import { getRatingTier } from '@/lib/rating';

type TierEntry = Pick<
  FavoriteEntry,
  | 'overallRating'
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

const TIER_STYLES = {
  Masterpiece: {
    text: 'text-fuchsia-100',
    border: 'border-fuchsia-300/70',
    background: 'bg-fuchsia-400/15',
    glow: '0 0 8px rgba(232, 121, 249, 0.85), 0 0 22px rgba(217, 70, 239, 0.45)',
  },
  'Highly Recommended': {
    text: 'text-cyan-100',
    border: 'border-cyan-300/70',
    background: 'bg-cyan-400/15',
    glow: '0 0 8px rgba(103, 232, 249, 0.85), 0 0 22px rgba(6, 182, 212, 0.45)',
  },
  'Top Rated': {
    text: 'text-amber-100',
    border: 'border-amber-300/70',
    background: 'bg-amber-400/15',
    glow: '0 0 8px rgba(253, 224, 71, 0.85), 0 0 22px rgba(245, 158, 11, 0.45)',
  },
  Hit: {
    text: 'text-rose-100',
    border: 'border-rose-300/70',
    background: 'bg-rose-400/15',
    glow: '0 0 8px rgba(253, 164, 175, 0.8), 0 0 20px rgba(244, 63, 94, 0.4)',
  },
} as const;

export default function RatingTierBadge({
  rating,
  className = '',
  compact = false,
}: {
  rating?: TierEntry | null;
  className?: string;
  compact?: boolean;
}) {
  if (!rating) return null;

  const tier = getRatingTier(rating.overallRating, rating);
  if (!tier) return null;

  const styles = TIER_STYLES[tier];

  return (
    <span
      role="status"
      aria-label={`Rating tier: ${tier}`}
      title={tier}
      className={`inline-flex shrink-0 items-center rounded-full border font-bold leading-none tracking-wide ${styles.text} ${styles.border} ${styles.background} ${
        compact ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 py-1 text-[9px]'
      } ${className}`}
      style={{ boxShadow: styles.glow }}
    >
      {tier}
    </span>
  );
}