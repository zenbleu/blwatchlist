import { useState, useEffect } from 'react';
import { Heart, Star, UserRound, UsersRound } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useApp } from '@/context/AppContext';
import Poster from './Poster';
import type { ActorRole, Entry } from '@/types';
import { formatRating } from '@/lib/rating';
import { getEpisodeAverage } from '@/lib/rating';
import { formatSeasonLabel } from '@/lib/entry';
import { getOngoingSchedule } from '@/lib/episodeSchedule';
import EpisodeRatingGrid from './EpisodeRatingGrid';
import RatingTierBadge from './RatingTierBadge';

interface EntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry?: Entry | null;
}

export default function EntryModal({ isOpen, onClose, entry }: EntryModalProps) {
  const { state, dispatch, isFavorited, getFavoriteByEntryId, getRatingByEntryId, getOngoingByEntryId } = useApp();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [activePage, setActivePage] = useState<'details' | 'episodes' | 'cast'>('details');

  const favorited = entry ? isFavorited(entry.id) : false;
  const rating = entry ? (getRatingByEntryId(entry.id) ?? getFavoriteByEntryId(entry.id)) : null;
  const ongoing = entry ? getOngoingByEntryId(entry.id) : undefined;
  const episodeAverage = getEpisodeAverage(entry?.episodeRatings);
  const episodeCount = entry
    ? Math.max(1, ongoing?.totalEpisodes || 0, ...Object.keys(entry.episodeRatings || {}).map(Number).filter(Number.isFinite))
    : 1;
  const episodeSchedule = ongoing ? getOngoingSchedule(ongoing, new Date()) : null;

  // Reset image loaded state when entry changes
  useEffect(() => {
    setImageLoaded(false);
    setActivePage('details');
  }, [entry?.id]);

  const handleToggleFavorite = () => {
    if (!entry) return;
    dispatch({ type: 'TOGGLE_FAVORITE', payload: entry.id });
  };

  // Status badge colors
  const statusConfig = entry
    ? {
        'COMPLETE': { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'Completed' },
        'ONGOING': { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Ongoing' },
        'DROPPED': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'Dropped' },
        'PLANNED': { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Planned' },
      }[entry.status]
    : null;

  if (!entry) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={true}
        closeButtonClassName="top-4 right-4 z-20"
         className="bg-[#0a0a0a] border-white/[0.08] text-white max-w-[360px] sm:max-w-[440px] p-0 overflow-x-hidden shadow-2xl"
      >
        {/* Top Bar: Heart (top-left) + Rating (top-right, before X button) */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between px-4 pt-4">
          {/* Heart - top left */}
          <button
            onClick={handleToggleFavorite}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              favorited
                ? 'bg-[#E50914]/20 text-[#E50914]'
                : 'bg-white/[0.06] text-[#666] hover:text-[#E50914] hover:bg-white/[0.1]'
            }`}
          >
            <Heart className={`w-4 h-4 ${favorited ? 'fill-current' : ''}`} />
          </button>

          {/* Rating - top right (leaving space for X button at right: 16px) */}
          {rating && rating.overallRating > 0 && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm"
              style={{ marginRight: '32px' }}
            >
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-yellow-400 font-bold text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                 {formatRating(rating.overallRating)}
              </span>
            </div>
          )}
          <div className="absolute left-1/2 top-3 flex -translate-x-1/2 gap-1 rounded-xl bg-black/45 p-1 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setActivePage(activePage === 'episodes' ? 'details' : 'episodes')}
              className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors ${activePage === 'episodes' ? 'bg-white/[0.14] text-white' : 'text-[#aaa] hover:text-white'}`}
            >
              {activePage === 'episodes' ? 'Back' : 'Episode Summary'}
            </button>
            <button
              type="button"
              onClick={() => setActivePage(activePage === 'cast' ? 'details' : 'cast')}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors ${activePage === 'cast' ? 'bg-[#E50914]/70 text-white' : 'text-[#aaa] hover:text-white'}`}
            >
              <UsersRound className="h-3 w-3" /> {activePage === 'cast' ? 'Back' : 'Cast'}
            </button>
          </div>
        </div>

        <div className="episode-page-slide" data-page={activePage === 'details' ? '1' : activePage === 'episodes' ? '2' : '3'}>
          <section className="episode-page" data-page-id="1" aria-hidden={activePage !== 'details'}>
            {/* Poster - centered, large, dominant */}
            <div className="flex justify-center px-6 pt-14 pb-4">
              <div className="relative">
                <div
                  className={`w-[220px] sm:w-[260px] h-[310px] sm:h-[370px] rounded-xl overflow-hidden bg-[#1a1a1a] transition-opacity duration-300 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}
                >
                  {entry.poster ? (
                    <img
                      src={entry.poster}
                      alt={entry.title}
                      className="w-full h-full object-cover"
                      onLoad={() => setImageLoaded(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Poster src={null} title={entry.title} size="lg" />
                    </div>
                  )}
                </div>
                {!imageLoaded && entry.poster && (
                  <div
                    className="absolute inset-0 w-[220px] sm:w-[260px] h-[310px] sm:h-[370px] rounded-xl bg-[#1a1a1a] animate-pulse"
                    style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}
                  />
                )}
              </div>
            </div>

            {/* Title with Year */}
            <div className="px-6 pb-3 text-center">
              <div className="flex flex-col items-center justify-center gap-2">
                <h2 className="text-center text-white font-bold text-[1.4rem] sm:text-[1.6rem]">
                  {entry.title} <span className="text-[#666] font-normal">({entry.year})</span>
                </h2>
                <RatingTierBadge rating={rating} />
              </div>
              {entry.season != null && (
                <p className="mt-1 text-sm text-[#B3B3B3]">{formatSeasonLabel(entry.season)}</p>
              )}
            </div>

            {/* Status Badge - pill shaped */}
            <div className="flex justify-center pb-3">
              {statusConfig && (
                <span
                  className={`inline-flex items-center px-4 py-1.5 rounded-full text-[0.85rem] font-medium border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                >
                  {statusConfig.label}
                </span>
              )}
            </div>

            {/* Type & Country */}
            <div className="flex items-center justify-center gap-3 pb-6 text-sm" style={{ opacity: 0.7, letterSpacing: '0.5px' }}>
              <span className="text-[#B3B3B3]">{entry.type}</span>
              <span className="text-[#444]">|</span>
              <span className="text-[#B3B3B3]">{entry.country}</span>
            </div>
          </section>

          <section className="episode-page max-h-[90vh] overflow-y-auto scrollbar-hide px-4 pb-5 pt-14" data-page-id="2" aria-hidden={activePage !== 'episodes'}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">Episode Summary</p>
                <p className="text-[10px] text-[#777]">
                  {episodeAverage === null ? 'Rate each episode to calculate Storyline.' : `Average Your Rating: ${formatRating(episodeAverage)}`}
                </p>
              </div>
              <span className="text-[10px] text-[#666]">{episodeCount} episodes</span>
            </div>
            <EpisodeRatingGrid
              ratings={entry.episodeRatings}
              totalEpisodes={episodeCount}
              airedEpisode={episodeSchedule?.airedEpisode ?? null}
              poster={entry.poster}
              entryTitle={entry.title}
              editable
              onChange={(episodeNumber, value) => {
                dispatch({
                  type: 'UPDATE_EPISODE_RATING',
                  payload: value
                    ? { entryId: entry.id, episodeNumber, rating: value }
                    : { entryId: entry.id, episodeNumber },
                });
              }}
            />
          </section>

          <section className="episode-page max-h-[90vh] overflow-y-auto scrollbar-hide px-4 pb-5 pt-14" data-page-id="3" aria-hidden={activePage !== 'cast'}>
            <CastPanel entry={entry} actors={state.actors} />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CastPanel({
  entry,
  actors,
}: {
  entry: Entry;
  actors: ReturnType<typeof useApp>['state']['actors'];
}) {
  const credits = actors
    .map((actor) => ({ actor, credit: actor.filmography.find((credit) => credit.entryId === entry.id) }))
    .filter((item): item is { actor: typeof actors[number]; credit: NonNullable<typeof item.credit> } => Boolean(item.credit));
  const groups: { label: string; role: ActorRole }[] = [
    { label: 'Main Role', role: 'MAIN' },
    { label: 'Supporting Role', role: 'SUPPORTING' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-bold text-white">Cast</p>
        <p className="mt-1 text-[10px] text-[#777]">Actors credited in {entry.title}.</p>
      </div>
      {groups.map((group) => {
        const groupCredits = credits.filter(({ credit }) => credit.role === group.role);
        return (
          <section key={group.role}>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#E50914]">{group.label}</h3>
              <span className="text-[10px] text-[#666]">{groupCredits.length}</span>
            </div>
            {groupCredits.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/[0.08] px-3 py-4 text-center text-xs text-[#666]">No actors added</p>
            ) : (
              <div className="space-y-2">
                {groupCredits.map(({ actor, credit }) => (
                  <CastRow key={actor.id} actor={actor} credit={credit} />
                ))}
              </div>
            )}
          </section>
        );
      })}
      {actors.length === 0 && (
        <div className="rounded-xl bg-white/[0.04] p-4 text-center text-xs text-[#777]">
          Add actors in the Actors tab, then link them from their filmography.
        </div>
      )}
    </div>
  );
}

function CastRow({
  actor,
  credit,
}: {
  actor: { id: string; name: string; photo: string | null };
  credit: { entryId: string; character: string; role: ActorRole };
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#141414] p-2.5">
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#222]">
        {actor.photo ? <img src={actor.photo} alt={actor.name} className="h-full w-full object-cover" /> : <UserRound className="mx-auto mt-3 h-5 w-5 text-[#666]" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-white">{actor.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="truncate text-[11px] text-[#999]">as {credit.character || 'Character not set'}</span>
          <span className={`rounded-full px-2 py-1 text-[10px] ${credit.role === 'MAIN' ? 'bg-[#E50914]/15 text-[#ff6970]' : 'bg-white/[0.08] text-[#aaa]'}`}>
            {credit.role === 'MAIN' ? 'Main Role' : 'Supporting Role'}
          </span>
        </div>
      </div>
    </div>
  );
}
