import { useEffect, useMemo, useState } from 'react';
import { Check, MessageSquareText, X } from 'lucide-react';
import type { EpisodeRating } from '@/types';

interface EpisodeRatingGridProps {
  ratings?: Record<string, EpisodeRating>;
  totalEpisodes: number;
  airedEpisode?: number | null;
  editable?: boolean;
  onChange?: (episodeNumber: number, value?: EpisodeRating) => void;
  compact?: boolean;
}

function ratingColor(rating: number): string {
  if (rating <= 4) return 'bg-slate-500/70 border-slate-300/30 text-white';
  if (rating <= 7) return 'bg-yellow-200 border-yellow-100/70 text-slate-900';
  if (rating === 8) return 'bg-yellow-300 border-yellow-100 text-slate-900 shadow-[0_0_10px_rgba(250,204,21,0.25)]';
  return 'bg-yellow-400 border-yellow-100 text-slate-950 shadow-[0_0_13px_rgba(250,204,21,0.48)]';
}

export default function EpisodeRatingGrid({
  ratings = {},
  totalEpisodes,
  airedEpisode = null,
  editable = false,
  onChange,
  compact = false,
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
        <div className={`flex min-w-max items-end ${compact ? 'gap-1.5' : 'gap-2'}`}>
          {episodes.map((episodeNumber) => {
            const episode = ratings[String(episodeNumber)];
            const isAvailable = airedEpisode === null || episodeNumber <= airedEpisode;
            const isSelected = selectedEpisode === episodeNumber;
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
              <p className="text-[10px] text-[#777]">Choose a rating from 1–10</p>
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
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 10 }, (_, index) => index + 1).map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setDraftRating(rating)}
                className={`h-7 rounded-md text-[11px] font-bold transition-colors ${
                  draftRating === rating
                    ? 'bg-[#E50914] text-white'
                    : 'bg-white/[0.07] text-[#aaa] hover:bg-white/[0.14] hover:text-white'
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
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