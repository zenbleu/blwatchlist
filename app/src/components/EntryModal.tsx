import { useState, useEffect } from 'react';
import { Heart, Star } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useApp } from '@/context/AppContext';
import Poster from './Poster';
import type { Entry } from '@/types';
import { formatRating } from '@/lib/rating';

interface EntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry?: Entry | null;
}

export default function EntryModal({ isOpen, onClose, entry }: EntryModalProps) {
  const { dispatch, isFavorited, getRatingByEntryId } = useApp();
  const [imageLoaded, setImageLoaded] = useState(false);

  const favorited = entry ? isFavorited(entry.id) : false;
  const rating = entry ? getRatingByEntryId(entry.id) : null;

  // Reset image loaded state when entry changes
  useEffect(() => {
    setImageLoaded(false);
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
        className="bg-[#0a0a0a] border-white/[0.08] text-white max-w-[320px] sm:max-w-[360px] p-0 overflow-hidden shadow-2xl"
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
        </div>

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
            {/* Skeleton loader */}
            {!imageLoaded && entry.poster && (
              <div
                className="absolute inset-0 w-[220px] sm:w-[260px] h-[310px] sm:h-[370px] rounded-xl bg-[#1a1a1a] animate-pulse"
                style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}
              />
            )}
          </div>
        </div>

        {/* Title with Year */}
        <div className="text-center px-6 pb-3">
          <h2 className="text-white font-bold text-[1.4rem] sm:text-[1.6rem]">
            {entry.title} <span className="text-[#666] font-normal">({entry.year})</span>
          </h2>
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
      </DialogContent>
    </Dialog>
  );
}
