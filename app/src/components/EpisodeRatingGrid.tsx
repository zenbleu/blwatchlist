import { useEffect, useId, useMemo, useState } from 'react';
import { Check, MessageSquareText, X } from 'lucide-react';
import type { EpisodeRating } from '@/types';
import { EPISODE_RATING_DESCRIPTIONS, getEpisodeOverall, formatRating } from '@/lib/rating';
import Poster from './Poster';

interface EpisodeRatingGridProps {
  ratings?: Record<string, EpisodeRating>;
  totalEpisodes: number;
  airedEpisode?: number | null;
  editable?: boolean;
  onChange?: (episodeNumber: number, value?: EpisodeRating) => void;
  compact?: boolean;
  poster?: string | null;
  entryTitle?: string;
}

const DEFAULT_EPISODE_RATING: EpisodeRating = {
  pacingFlow: 5,
  contentScript: 5,
  performanceChemistry: 5,
  plausibilityLogic: 5,
  yourRating: 5,
};

function ratingColor(rating: number): string {
  if (rating <= 4) return 'bg-slate-500/70 border-slate-300/30 text-white';
  if (rating <= 7) return 'bg-yellow-200 border-yellow-100/70 text-slate-900';
  if (rating === 8) return 'bg-yellow-300 border-yellow-100 text-slate-900 shadow-[0_0_10px_rgba(250,204,21,0.25)]';
  return 'bg-yellow-400 border-yellow-100 text-slate-950 shadow-[0_0_13px_rgba(250,204,21,0.48)]';
}

const STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z';

function HalfStarIcon({
  fill,
  size = 20,
  gradientId,
}: {
  fill: 'empty' | 'half' | 'full';
  size?: number;
  gradientId: string;
}) {
  const fillColor = fill === 'empty' ? '#4B5563' : fill === 'full' ? '#FACC15' : `url(#${gradientId})`;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="50%" stopColor="#FACC15" />
          <stop offset="50%" stopColor="#4B5563" />
        </linearGradient>
      </defs>
      <path
        d={STAR_PATH}
        fill={fillColor}
        stroke={fill === 'empty' ? '#4B5563' : '#FACC15'}
        strokeWidth="0.5"
      />
    </svg>
  );
}

type StarScale = 'whole' | 'half';

function getStarFill(value: number, starIndex: number, scale: StarScale): 'empty' | 'half' | 'full' {
  const fullValue = scale === 'whole' ? starIndex * 2 : starIndex;
  const halfValue = scale === 'whole' ? fullValue - 1 : fullValue - 0.5;
  if (value >= fullValue) return 'full';
  if (value >= halfValue) return 'half';
  return 'empty';
}

function InteractiveRatingStars({
  value,
  onChange,
  starCount,
  scale,
  label,
}: {
  value: number;
  onChange?: (value: number) => void;
  starCount: number;
  scale: StarScale;
  label: string;
}) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const gradientPrefix = useId().replace(/:/g, '');
  const displayValue = hoverValue ?? value;

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHoverValue(null)}
      aria-label={`${label}: ${formatRating(displayValue)} out of 10`}
    >
      {Array.from({ length: starCount }, (_, index) => {
        const starIndex = index + 1;
        const fullValue = scale === 'whole' ? starIndex * 2 : starIndex;
        const leftValue = scale === 'whole' ? fullValue - 1 : fullValue - 0.5;
        const fill = getStarFill(displayValue, starIndex, scale);

        return (
          <div key={starIndex} className="relative flex h-8 w-8 items-center justify-center">
            <HalfStarIcon
              fill={fill}
              size={20}
              gradientId={`${gradientPrefix}-${starIndex}`}
            />
            {onChange && (
              <>
                <button
                  type="button"
                  onMouseEnter={() => setHoverValue(leftValue)}
                  onClick={() => onChange(leftValue)}
                  className="absolute left-0 top-0 h-full w-1/2 cursor-pointer"
                  style={{ background: 'transparent', border: 'none', padding: 0, zIndex: 2 }}
                  aria-label={`${label}: rate ${formatRating(leftValue)}`}
                />
                <button
                  type="button"
                  onMouseEnter={() => setHoverValue(fullValue)}
                  onClick={() => onChange(fullValue)}
                  className="absolute right-0 top-0 h-full w-1/2 cursor-pointer"
                  style={{ background: 'transparent', border: 'none', padding: 0, zIndex: 2 }}
                  aria-label={`${label}: rate ${formatRating(fullValue)}`}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EpisodeRatingRow({
  label,
  description,
  value,
  onChange,
  editable,
  scale = 'whole',
  starCount = 5,
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  editable: boolean;
  scale?: StarScale;
  starCount?: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1 text-xs font-medium text-[#B3B3B3]">
          <span className="truncate">{label}</span>
          {description && (
            <span
              title={description}
              aria-label={`${label}: ${description}`}
              className="cursor-help text-[11px] text-[#777] hover:text-yellow-300"
            >
              ⓘ
            </span>
          )}
        </span>
        <span className="shrink-0 text-[10px] font-bold tabular-nums text-yellow-400">
          {formatRating(value)}
        </span>
      </div>
      <div className="flex justify-end">
        <InteractiveRatingStars
          value={value}
          onChange={editable ? onChange : undefined}
          starCount={starCount}
          scale={scale}
          label={label}
        />
      </div>
    </div>
  );
}

function EpisodeRatingForm({
  episodeNumber,
  value,
  onChange,
  onSave,
  onClear,
  onClose,
}: {
  episodeNumber: number;
  value: EpisodeRating;
  onChange: (value: EpisodeRating) => void;
  onSave: () => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const overall = getEpisodeOverall(value);
  const update = (field: keyof EpisodeRating, nextValue: number) => {
    if (field === 'commentary') return;
    onChange({ ...value, [field]: nextValue });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#171717] p-3 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-white">Episode {episodeNumber}</p>
          <p className="text-[10px] text-[#777]">Rate each category from 1–10</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-[#777] hover:bg-white/[0.08] hover:text-white"
          aria-label="Close episode rating popover"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mb-4 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.06] px-3 py-2 text-center">
        <p className="text-[10px] uppercase tracking-wider text-yellow-300/80">⭐ Overall Rating</p>
        <p className="mt-0.5 text-3xl font-black tabular-nums text-yellow-300">{formatRating(overall)}</p>
      </div>

      <div className="space-y-3">
        <EpisodeRatingRow
          label="Pacing & Flow"
          description={EPISODE_RATING_DESCRIPTIONS.pacingFlow}
          value={value.pacingFlow}
          onChange={(nextValue) => update('pacingFlow', nextValue)}
          editable
        />
        <EpisodeRatingRow
          label="Content & Script"
          description={EPISODE_RATING_DESCRIPTIONS.contentScript}
          value={value.contentScript}
          onChange={(nextValue) => update('contentScript', nextValue)}
          editable
        />
        <EpisodeRatingRow
          label="Performance & Chemistry"
          description={EPISODE_RATING_DESCRIPTIONS.performanceChemistry}
          value={value.performanceChemistry}
          onChange={(nextValue) => update('performanceChemistry', nextValue)}
          editable
        />
        <EpisodeRatingRow
          label="Plausibility & Logic"
          description={EPISODE_RATING_DESCRIPTIONS.plausibilityLogic}
          value={value.plausibilityLogic}
          onChange={(nextValue) => update('plausibilityLogic', nextValue)}
          editable
        />
        <EpisodeRatingRow
          label="Your Rating"
          value={value.yourRating}
          onChange={(nextValue) => update('yourRating', nextValue)}
          editable
          scale="half"
          starCount={10}
        />
      </div>

      <label className="mt-4 block">
        <span className="mb-1 flex items-center gap-1 text-[10px] text-[#888]">
          <MessageSquareText className="h-3 w-3" /> Commentary (optional)
        </span>
        <textarea
          value={value.commentary ?? ''}
          onChange={(event) => onChange({ ...value, commentary: event.target.value })}
          placeholder="What stood out?"
          rows={2}
          className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-2 text-xs text-white outline-none placeholder:text-[#555] focus:border-[#E50914]"
        />
      </label>

      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onClear}
          className="text-[10px] text-[#888] hover:text-red-300"
        >
          Clear rating
        </button>
        <button
          type="button"
          onClick={onSave}
          className="flex items-center gap-1 rounded-lg bg-[#E50914] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#E50914]/90"
        >
          <Check className="h-3 w-3" /> Save
        </button>
      </div>
    </div>
  );
}

export default function EpisodeRatingGrid({
  ratings = {},
  totalEpisodes,
  airedEpisode = null,
  editable = false,
  onChange,
  compact = false,
  poster = null,
  entryTitle = 'Entry',
}: EpisodeRatingGridProps) {
  const episodeCount = Math.max(1, totalEpisodes, ...Object.keys(ratings).map(Number).filter(Number.isFinite));
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const [draftRating, setDraftRating] = useState<EpisodeRating>(DEFAULT_EPISODE_RATING);

  const selectedRating = selectedEpisode ? ratings[String(selectedEpisode)] : undefined;

  useEffect(() => {
    if (selectedEpisode === null) return;
    setDraftRating(selectedRating ? { ...DEFAULT_EPISODE_RATING, ...selectedRating } : DEFAULT_EPISODE_RATING);
  }, [selectedEpisode, selectedRating]);

  const episodes = useMemo(
    () => Array.from({ length: episodeCount }, (_, index) => index + 1),
    [episodeCount],
  );

  const saveRating = () => {
    if (!selectedEpisode || !onChange) return;
    onChange(selectedEpisode, {
      ...draftRating,
      ...(draftRating.commentary?.trim() ? { commentary: draftRating.commentary.trim() } : { commentary: undefined }),
    });
    setSelectedEpisode(null);
  };

  const clearRating = () => {
    if (!selectedEpisode || !onChange) return;
    onChange(selectedEpisode);
    setSelectedEpisode(null);
  };

  return (
    <div className="relative space-y-2">
      <div className="overflow-x-auto pb-1 scrollbar-hide">
        <div className={compact ? 'flex min-w-max items-end gap-1.5' : 'divide-y divide-white/[0.08] overflow-hidden rounded-xl border border-white/[0.08] bg-black/20'}>
          {episodes.map((episodeNumber) => {
            const episode = ratings[String(episodeNumber)];
            const overall = episode ? getEpisodeOverall(episode) : null;
            const isAvailable = airedEpisode === null || episodeNumber <= airedEpisode;
            const isSelected = selectedEpisode === episodeNumber;

            if (!compact) {
              return (
                <div key={episodeNumber} className="p-2.5">
                  <button
                    type="button"
                    disabled={!editable || !isAvailable}
                    onClick={() => setSelectedEpisode(isSelected ? null : episodeNumber)}
                    className={`flex w-full items-start gap-3 text-left transition-colors ${
                      editable && isAvailable ? 'cursor-pointer hover:bg-white/[0.04]' : 'cursor-default'
                    } ${isSelected ? 'rounded-lg bg-white/[0.05] ring-1 ring-[#E50914]/60' : ''}`}
                    aria-label={`${episode ? `Episode ${episodeNumber}, rated ${formatRating(overall ?? 0)}` : `Episode ${episodeNumber}, not rated`}${!isAvailable ? ', not aired yet' : ''}`}
                  >
                    <div className="relative shrink-0">
                      <Poster src={poster} title={`${entryTitle} episode ${episodeNumber}`} size="md" />
                      <span className="absolute left-1 top-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        E{episodeNumber}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {entryTitle} · Episode #{episodeNumber}
                          </p>
                          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[#777]">
                            {isAvailable ? `Episode ${episodeNumber}` : 'Upcoming episode'}
                          </p>
                        </div>
                        {episode ? (
                          <span className="shrink-0 whitespace-nowrap text-xs font-semibold tabular-nums text-yellow-400">
                            ⭐ {formatRating(overall ?? 0)}/10
                          </span>
                        ) : (
                          <span className="shrink-0 whitespace-nowrap text-[10px] text-[#777]">
                            {editable && isAvailable ? 'Rate episode' : 'Not rated'}
                          </span>
                        )}
                      </div>
                      <p className={`mt-2 line-clamp-2 text-xs leading-relaxed ${
                        episode?.commentary ? 'text-[#c8c8c8]' : 'text-[#666]'
                      }`}>
                        {episode?.commentary || (isAvailable ? 'No commentary added yet.' : 'This episode is not available to rate yet.')}
                      </p>
                    </div>
                  </button>
                </div>
              );
            }

            return (
              <div key={episodeNumber} className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-medium text-[#888]">E{episodeNumber}</span>
                <button
                  type="button"
                  disabled={!editable || !isAvailable}
                  onClick={() => setSelectedEpisode(isSelected ? null : episodeNumber)}
                  className={`flex shrink-0 items-center justify-center rounded-md border font-bold tabular-nums transition-all ${
                    compact ? 'h-9 w-9 text-[11px]' : 'h-11 w-11 text-xs'
                  } ${
                    episode
                      ? ratingColor(overall ?? 0)
                      : `border-dotted border-white/30 bg-white/[0.035] text-transparent ${!isAvailable ? 'opacity-45' : ''}`
                  } ${
                    isSelected ? 'ring-2 ring-[#E50914] ring-offset-2 ring-offset-[#0a0a0a]' : ''
                  } ${
                    editable && isAvailable ? 'cursor-pointer hover:brightness-110' : 'cursor-default'
                  }`}
                  aria-label={`${episode ? `Episode ${episodeNumber}, rated ${formatRating(overall ?? 0)}` : `Episode ${episodeNumber}, not rated`}${!isAvailable ? ', not aired yet' : ''}`}
                >
                  {overall !== null ? formatRating(overall) : ''}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {editable && selectedEpisode !== null && (
        <EpisodeRatingForm
          episodeNumber={selectedEpisode}
          value={draftRating}
          onChange={setDraftRating}
          onSave={saveRating}
          onClear={clearRating}
          onClose={() => setSelectedEpisode(null)}
        />
      )}
    </div>
  );
}