import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Pencil, Star } from 'lucide-react';
import type { EpisodeRating } from '@/types';
import { formatRating } from '@/lib/rating';
import { formatSeasonLabel } from '@/lib/entry';
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
  season?: number | null;
}

const DEFAULT_EPISODE_RATING: EpisodeRating = {
  yourRating: 5,
};

const FLOW_COLUMN_WIDTH = 50;
const FLOW_COLUMN_GAP = 7;
const FLOW_BASELINE = 70;
const FLOW_MAX_BAR_HEIGHT = 58;

function buildFlowPath(values: Array<number | null>): string {
  return values.reduce((path, rating, index) => {
    if (rating === null) return path;
    const x = FLOW_COLUMN_WIDTH / 2 + index * (FLOW_COLUMN_WIDTH + FLOW_COLUMN_GAP);
    const y = FLOW_BASELINE - (rating / 10) * FLOW_MAX_BAR_HEIGHT;
    const previousRating = index > 0 ? values[index - 1] : null;
    return `${path}${previousRating === null ? 'M' : 'L'} ${x} ${y} `;
  }, '');
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
  compact = false,
}: {
  value: number;
  onChange?: (value: number) => void;
  starCount: number;
  scale: StarScale;
  label: string;
  compact?: boolean;
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
          <div
            key={starIndex}
            className={`relative flex items-center justify-center ${compact ? 'h-6 w-5' : 'h-8 w-8'}`}
          >
            <HalfStarIcon
              fill={fill}
              size={compact ? 15 : 20}
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
  valueLabel,
  onChange,
  editable,
  scale = 'whole',
  starCount = 5,
  compact = false,
}: {
  label: string;
  description?: string;
  value: number;
  valueLabel?: string;
  onChange: (value: number) => void;
  editable: boolean;
  scale?: StarScale;
  starCount?: number;
  compact?: boolean;
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
      </div>
      <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-hide">
        <InteractiveRatingStars
          value={value}
          onChange={editable ? onChange : undefined}
          starCount={starCount}
          scale={scale}
          label={label}
          compact={compact}
        />
        <span className="shrink-0 text-[10px] font-bold tabular-nums text-yellow-400">
          {valueLabel ?? formatRating(value)}
        </span>
      </div>
    </div>
  );
}

function EpisodeRatingFlow({
  episodes,
  ratings,
  selectedEpisode,
  onSelectEpisode,
}: {
  episodes: number[];
  ratings: Record<string, EpisodeRating>;
  selectedEpisode: number;
  onSelectEpisode: (episodeNumber: number) => void;
}) {
  const values = episodes.map((episodeNumber) => ratings[String(episodeNumber)]?.yourRating ?? null);
  const chartWidth = Math.max(
    FLOW_COLUMN_WIDTH,
    episodes.length * FLOW_COLUMN_WIDTH + Math.max(0, episodes.length - 1) * FLOW_COLUMN_GAP,
  );
  const trendPath = buildFlowPath(values);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#bdbdbd]">Episode Rating Flow</p>
        <span className="shrink-0 text-[10px] text-[#777]">Your Rating · 1–10</span>
      </div>

      <div
        className="overflow-x-auto pb-0.5 scrollbar-hide"
        role="group"
        aria-label="Episode rating flow"
      >
        <div className="relative h-[96px]" style={{ width: chartWidth }}>
          <div className="absolute inset-x-0 top-[10px] border-t border-dashed border-white/30" />
          <div className="absolute inset-x-0 bottom-[25px] border-t border-white/10" />
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0"
            width={chartWidth}
            height={72}
            viewBox={`0 0 ${chartWidth} 72`}
          >
            <path
              d={trendPath}
              fill="none"
              stroke="#9ca3af"
              strokeDasharray="4 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              opacity="0.8"
            />
          </svg>

          <div className="absolute left-0 top-0 flex h-[96px]" style={{ gap: FLOW_COLUMN_GAP }}>
            {episodes.map((episodeNumber, index) => {
              const rating = values[index];
              const isSelected = selectedEpisode === episodeNumber;
              const barHeight = rating === null
                ? 14
                : Math.max(18, (rating / 10) * FLOW_MAX_BAR_HEIGHT);

              return (
                <div key={episodeNumber} className="relative h-[96px] shrink-0" style={{ width: FLOW_COLUMN_WIDTH }}>
                  <button
                    type="button"
                    data-episode={episodeNumber}
                    onClick={() => onSelectEpisode(episodeNumber)}
                    aria-pressed={isSelected}
                    aria-label={`EP${episodeNumber}${rating === null ? ', not rated' : `, rating ${formatRating(rating)}`}`}
                    className={`absolute bottom-[25px] left-1/2 flex -translate-x-1/2 items-start justify-center overflow-hidden rounded-md border px-0.5 pt-1 text-[10px] font-semibold tabular-nums transition-colors ${
                      isSelected
                        ? 'border-yellow-300 bg-yellow-400 text-[#181818] shadow-[0_0_12px_rgba(250,204,21,0.25)]'
                        : rating === null
                          ? 'border-dashed border-white/35 bg-white/[0.035] text-[#8b8b8b] hover:border-white/60'
                          : 'border-[#b7b7b7] bg-[#e7e7e7] text-[#363636] hover:bg-white'
                    }`}
                    style={{ height: barHeight, width: 44 }}
                  >
                    {rating === null ? '—' : formatRating(rating)}
                  </button>
                  <span className={`absolute bottom-0 left-0 w-full text-center text-[10px] font-semibold ${
                    isSelected ? 'text-yellow-300' : 'text-[#bdbdbd]'
                  }`}>
                    EP{episodeNumber}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function EpisodeSummaryPanel({
  episodeNumber,
  episodeCount,
  value,
  savedRating,
  topRated,
  isAvailable,
  isEditing,
  editable,
  compact,
  poster,
  entryTitle,
  season,
  onChange,
  onSave,
  onClear,
  onEdit,
  onNavigate,
}: {
  episodeNumber: number;
  episodeCount: number;
  value: EpisodeRating;
  savedRating: number | null;
  topRated: boolean;
  isAvailable: boolean;
  isEditing: boolean;
  editable: boolean;
  compact: boolean;
  poster: string | null;
  entryTitle: string;
  season?: number | null;
  onChange: (value: EpisodeRating) => void;
  onSave: () => void;
  onClear: () => void;
  onEdit: () => void;
  onNavigate: (episodeNumber: number) => void;
}) {
  const touchStartX = useRef<number | null>(null);
  const seasonLabel = season == null ? null : formatSeasonLabel(season);
  const displayRating = isEditing ? value.yourRating : savedRating ?? 0;

  const navigate = (direction: -1 | 1) => {
    onNavigate(Math.min(episodeCount, Math.max(1, episodeNumber + direction)));
  };

  return (
    <section
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' && episodeNumber > 1) navigate(-1);
        if (event.key === 'ArrowRight' && episodeNumber < episodeCount) navigate(1);
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const startX = touchStartX.current;
        const endX = event.changedTouches[0]?.clientX;
        touchStartX.current = null;
        if (startX === null || endX === undefined) return;
        const movement = endX - startX;
        if (movement > 45 && episodeNumber > 1) navigate(-1);
        if (movement < -45 && episodeNumber < episodeCount) navigate(1);
      }}
      className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1d1d1d] to-[#101010] outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70"
      aria-label={`Episode ${episodeNumber} rating details`}
    >
      <div className="flex min-h-11 items-center justify-between gap-2 border-b border-white/[0.08] bg-black/20 px-2.5 py-1.5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          disabled={episodeNumber <= 1}
          className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Previous episode"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 items-center justify-center gap-2">
          <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-bold tracking-wide text-white">
            EP{episodeNumber}
          </span>
          <span className="text-[10px] tabular-nums text-[#888]">{episodeNumber} / {episodeCount}</span>
          {seasonLabel && <span className="hidden text-[10px] text-[#9a9a9a] sm:inline">{seasonLabel}</span>}
          {topRated && (
            <span className="inline-flex items-center gap-1 rounded-full border border-yellow-400/35 bg-yellow-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-yellow-300">
              <Star className="h-3 w-3 fill-current" /> Top-Rated
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigate(1)}
          disabled={episodeNumber >= episodeCount}
          className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Next episode"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className={`grid gap-3 p-3 ${compact ? 'grid-cols-1' : 'grid-cols-[88px_minmax(0,1fr)] sm:grid-cols-[112px_minmax(0,1fr)]'}`}>
        {!compact && (
          <div className="flex items-start justify-center">
            <div className="h-[124px] w-[88px] overflow-hidden rounded-xl border border-white/10 bg-black/30 sm:h-[148px] sm:w-[112px]">
              <Poster
                src={poster}
                title={`${entryTitle} episode ${episodeNumber}`}
                size="lg"
                className="!h-full !w-full !rounded-none"
              />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-col justify-between gap-3">
          <div>
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-white sm:text-base">
                  {entryTitle} · Episode {episodeNumber}
                </h3>
                <p className="mt-0.5 text-[10px] text-[#888]">
                  {isAvailable ? 'Your episode rating' : 'This episode has not aired yet'}
                  {seasonLabel ? ` · ${seasonLabel}` : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-2.5">
            <EpisodeRatingRow
              label="Your Rating"
              value={displayRating}
              valueLabel={!isEditing && savedRating === null ? 'Not rated' : `${formatRating(displayRating)} / 10`}
              onChange={(nextValue) => onChange({ yourRating: nextValue })}
              editable={editable && isEditing && isAvailable}
              scale="half"
              starCount={10}
              compact
            />
            {editable && !isAvailable && (
              <p className="mt-1 text-[10px] text-[#777]">Rating becomes available after the episode airs.</p>
            )}
          </div>

          {editable && (
            <div className="flex items-center justify-end gap-2">
              {isEditing ? (
                <>
                  {savedRating !== null && (
                    <button
                      type="button"
                      onClick={onClear}
                      className="mr-auto text-[10px] text-[#999] hover:text-red-300"
                    >
                      Clear rating
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onSave}
                    disabled={!isAvailable}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#E50914] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#E50914]/90 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Done
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onEdit}
                  disabled={!isAvailable}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit rating
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
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
  season = null,
}: EpisodeRatingGridProps) {
  const episodeCount = Math.max(1, totalEpisodes, ...Object.keys(ratings).map(Number).filter(Number.isFinite));
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [draftRating, setDraftRating] = useState<EpisodeRating>(DEFAULT_EPISODE_RATING);
  const flowContainerRef = useRef<HTMLDivElement>(null);

  const selectedRating = ratings[String(selectedEpisode)]?.yourRating ?? null;
  const maxRating = Math.max(
    0,
    ...Object.values(ratings)
      .map((rating) => rating.yourRating)
      .filter(Number.isFinite),
  );
  const isTopRated = selectedRating !== null && selectedRating === maxRating;
  const isAvailable = airedEpisode === null || selectedEpisode <= airedEpisode;

  useEffect(() => {
    setSelectedEpisode((current) => Math.min(current, episodeCount));
  }, [episodeCount]);

  useEffect(() => {
    if (!isEditing) {
      setDraftRating({ yourRating: selectedRating ?? DEFAULT_EPISODE_RATING.yourRating });
    }
  }, [selectedEpisode, selectedRating, isEditing]);

  useEffect(() => {
    flowContainerRef.current
      ?.querySelector<HTMLButtonElement>(`[data-episode="${selectedEpisode}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedEpisode]);

  const episodes = useMemo(
    () => Array.from({ length: episodeCount }, (_, index) => index + 1),
    [episodeCount],
  );

  const selectEpisode = (episodeNumber: number) => {
    setSelectedEpisode(Math.max(1, Math.min(episodeCount, episodeNumber)));
    setIsEditing(false);
  };

  const startEditing = () => {
    if (!editable || !isAvailable) return;
    setDraftRating({ yourRating: selectedRating ?? DEFAULT_EPISODE_RATING.yourRating });
    setIsEditing(true);
  };

  const saveRating = () => {
    if (!editable || !isAvailable || !onChange) return;
    onChange(selectedEpisode, { yourRating: draftRating.yourRating });
    setIsEditing(false);
  };

  const clearRating = () => {
    if (!editable || !onChange) return;
    onChange(selectedEpisode);
    setIsEditing(false);
  };

  return (
    <div className="relative min-w-0 space-y-3">
      <div ref={flowContainerRef}>
        <EpisodeRatingFlow
          episodes={episodes}
          ratings={ratings}
          selectedEpisode={selectedEpisode}
          onSelectEpisode={selectEpisode}
        />
      </div>
      <EpisodeSummaryPanel
        episodeNumber={selectedEpisode}
        episodeCount={episodeCount}
        value={draftRating}
        savedRating={selectedRating}
        topRated={isTopRated}
        isAvailable={isAvailable}
        isEditing={isEditing}
        editable={editable}
        compact={compact}
        poster={poster}
        entryTitle={entryTitle}
        season={season}
        onChange={setDraftRating}
        onSave={saveRating}
        onClear={clearRating}
        onEdit={startEditing}
        onNavigate={selectEpisode}
      />
    </div>
  );
}