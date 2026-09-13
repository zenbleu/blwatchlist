import { motion } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Heart, Star, Trophy, Clock } from 'lucide-react';
import Poster from './Poster';
import type { Entry } from '@/types';

interface CompletionCelebrationModalProps {
  entry: Entry | null;
  isFavorited: boolean;
  onClose: () => void;
  onRate: () => void;
  onFavorite: () => void;
  onTop10: () => void;
}

export default function CompletionCelebrationModal({
  entry,
  isFavorited,
  onClose,
  onRate,
  onFavorite,
  onTop10,
}: CompletionCelebrationModalProps) {
  return (
    <Dialog open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton
        className="bg-[#0a0a0a] border-white/[0.08] text-white w-[calc(100vw-1rem)] max-w-[360px] p-0 overflow-hidden"
      >
        {entry && (
          <div className="p-6 text-center">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center"
            >
              <Trophy className="w-7 h-7 text-green-400" />
            </motion.div>
            <h2 className="text-xl font-extrabold">Congratulations!</h2>
            <p className="text-sm text-[#B3B3B3] mt-1">You completed a title.</p>

            <div className="flex items-center gap-4 mt-5 p-3 rounded-xl bg-white/[0.04] text-left min-w-0">
              <Poster src={entry.poster} title={entry.title} size="md" />
              <div className="min-w-0">
                <p className="font-bold truncate min-w-0">{entry.title}</p>
                <p className="text-xs text-[#888] mt-1">{entry.type} · {entry.year}</p>
              </div>
            </div>

            <p className="text-sm text-white/90 mt-5">
              You have completed this {entry.type.toLowerCase()}. What are you gonna do?
            </p>

            <div className="grid grid-cols-2 gap-2 mt-5">
              <button
                type="button"
                onClick={onRate}
                className="flex items-center justify-center gap-2 rounded-xl py-3 bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/25 text-sm font-semibold"
              >
                <Star className="w-4 h-4" /> Rate
              </button>
              <button
                type="button"
                onClick={onFavorite}
                disabled={isFavorited}
                aria-pressed={isFavorited}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold ${
                  isFavorited
                    ? 'bg-[#E50914]/25 text-[#ff6680]'
                    : 'bg-[#E50914]/15 text-[#ff6680] hover:bg-[#E50914]/25'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                {isFavorited ? 'Favorited' : 'Favorite'}
              </button>
              <button
                type="button"
                onClick={onTop10}
                className="flex items-center justify-center gap-2 rounded-xl py-3 bg-white/[0.06] text-white hover:bg-white/[0.1] text-sm font-semibold"
              >
                <Trophy className="w-4 h-4" /> Top 10
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center gap-2 rounded-xl py-3 bg-white/[0.06] text-[#B3B3B3] hover:bg-white/[0.1] text-sm font-semibold"
              >
                <Clock className="w-4 h-4" /> Later
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}