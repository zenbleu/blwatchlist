import { useEffect, useId, useMemo, useState } from 'react';
import { Check, MessageSquareText, X } from 'lucide-react';
import type { EpisodeRating } from '@/types';
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

function ratingColor(rating: number): string {
  if (rating <= 4) return 'bg-slate-500/70 border-slate-300/30 text-white';
  if (rating <= 7) return 'bg-yellow-200 border-yellow-100/70 text-slate-900';
  if (rating === 8) return 'bg-yellow-300 border-yellow-100 text-slate-900 shadow-[0_0_10px_rgba(250,204,21,0.25)]';
  return 'bg-yellow-400 border-yellow-100 text-slate-950 shadow-[0_0_13px_rgba(250,204,21,0.48)]';
}

const STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

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

function EpisodeInteractiveStar({
  starIndex,
  value,
  hoverValue,
  onSetValue,
  onHoverValue,
  gradientId,
}: {
  starIndex: number;
  value: number;
  hoverValue: number | null;
  onSetValue: (value: number) => void;
  onHoverValue: (value: number | null) => void;
  gradientId: string;
}) {
  const displayValue = hoverValue ?? value;
  const starValue = starIndex;
  const fill: 'empty' | 'half' | 'full' = displayValue >= starValue
    ? 'full'
    : displayValue >= starValue - 0.5
      ? 'half'
      : 'empty';

  return (
    <div
      className="relative flex h-8 w-8 items-center justify-center"
      onMouseLeave={() => onHoverValue(null)}
    >
      <HalfStarIcon fill={fill} size={20} gradientId={gradientId} />
      <button
        type="button"
        onMouseEnter={() => onHoverValue(starValue - 0.5)}
        onClick={() => onSetValue(starValue - 0.5)}
        className="absolute left-0 top-0 h-full w-1/2 cursor-pointer"
        style={{ background: 'transparent', border: 'none', padding: 0, zIndex: 2 }}
        aria-label={`Rate ${starValue - 0.5}`}
      />
      <button
        type="button"
        onMouseEnter={() => onHoverValue(starValue)}
        onClick={() => onSetValue(starValue)}
        className="absolute right-0 top-0 h-full w-1/2 cursor-pointer"
        style={{ background: 'transparent', border: 'none', padding: 0, zIndex: 2 }}
        aria-label={`Rate ${starValue}`}
      />
    </div>
  );
}

function EpisodeStarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const gradientPrefix = useId().replace(/:/g, '');
  const displayValue = hoverValue ?? value;

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-1">
      <div className="flex min-w-0 items-center gap-0">
        {Array.from({ length: 10 }, (_, index) => (
          <EpisodeInteractiveStar
            key={index + 1}
            starIndex={index + 1}
            value={value}
            hoverValue={hoverValue}
            onSetValue={onChange}
            onHoverValue={setHoverValue}
            gradientId={`${gradientPrefix}-episode-star-${index + 1}`}
          />
        ))}
      </div>
      <span className="shrink-0 text-[10px] font-bold tabular-nums text-yellow-400">
        {displayValue.toFixed(1)}
      </span>
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
  const [draftRating, setDraftRating] = useState(5);
  const [commentary, setCommentary] = useState('');

  const selectedRating = selectedEpisode ? ratings[String(selectedEpisode)] : undefined;

  useEffect(() => {
    if (selectedEpisode === null) return;
    setDraftRating(selectedRating?.rating ?? 5);
    setCommentary(selectedRating?.commentary ?? '');
  }, [selectedEpisode, selectedRating?.rating, selectedRating?.commentary]);

  const episodes = useMemo(
    () => Array.from({ length: episodeCount }, (_, index) => index + 1),
    [episodeCount],
  );

  const saveRating = () => {
    if (!selectedEpisode || !onChange) return;
    onChange(selectedEpisode, {
      rating: draftRating,
      ...(commentary.trim() ? { commentary: commentary.trim() } : {}),
    });
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
                    aria-label={`${episode ? `Episode ${episodeNumber}, rated ${episode.rating}` : `Episode ${episodeNumber}, not rated`}${!isAvailable ? ', not aired yet' : ''}`}
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
                            ★ {episode.rating.toFixed(1)}/10
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
                      ? ratingColor(episode.rating)
                      : `border-dotted border-white/30 bg-white/[0.035] text-transparent ${!isAvailable ? 'opacity-45' : ''}`
                  } ${
                    isSelected ? 'ring-2 ring-[#E50914] ring-offset-2 ring-offset-[#0a0a0a]' : ''
                  } ${
                    editable && isAvailable ? 'cursor-pointer hover:brightness-110' : 'cursor-default'
                  }`}
                  aria-label={`${episode ? `Episode ${episodeNumber}, rated ${episode.rating}` : `Episode ${episodeNumber}, not rated`}${!isAvailable ? ', not aired yet' : ''}`}
                >
                  {episode?.rating ?? ''}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {editable && selectedEpisode !== null && (
        <div className="rounded-xl border border-white/10 bg-[#171717] p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white">Episode {selectedEpisode}</p>
              <p className="text-[10px] text-[#777]">Choose a rating from 0.5–10</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedEpisode(null)}
              className="rounded-full p-1 text-[#777] hover:bg-white/[0.08] hover:text-white"
              aria-label="Close episode rating popover"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <EpisodeStarRating value={draftRating} onChange={setDraftRating} />
          <label className="mt-3 block">
            <span className="mb-1 flex items-center gap-1 text-[10px] text-[#888]">
              <MessageSquareText className="h-3 w-3" /> Commentary (optional)
            </span>
            <textarea
              value={commentary}
              onChange={(event) => setCommentary(event.target.value)}
              placeholder="What stood out?"
              rows={2}
              className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-2 text-xs text-white outline-none placeholder:text-[#555] focus:border-[#E50914]"
            />
          </label>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={clearRating}
              className="text-[10px] text-[#888] hover:text-red-300"
            >
              Clear rating
            </button>
            <button
              type="button"
              onClick={() => { saveRating(); setSelectedEpisode(null); }}
              className="flex items-center gap-1 rounded-lg bg-[#E50914] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#E50914]/90"
            >
              <Check className="h-3 w-3" /> Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}