import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X } from 'lucide-react';

interface MilestoneToastProps {
  achievementName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function MilestoneToast({ achievementName, isOpen, onClose }: MilestoneToastProps) {
  const [progress, setProgress] = useState(100);

  // Auto-dismiss after 3s with progress bar
  useEffect(() => {
    if (!isOpen) {
      setProgress(100);
      return;
    }

    setProgress(100);
    const startTime = Date.now();
    const duration = 3000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (elapsed >= duration) {
        clearInterval(interval);
        onClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed bottom-6 left-0 right-0 z-[110] flex justify-center px-4"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 24, stiffness: 350 }}
        >
          <div className="relative bg-[#141414] border border-white/[0.08] rounded-2xl px-5 py-3.5 shadow-2xl flex items-center gap-3 max-w-sm w-full overflow-hidden">
            {/* Progress bar at bottom */}
            <div
              className="absolute bottom-0 left-0 h-0.5 bg-[#E50914] transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />

            {/* Icon */}
            <div className="w-9 h-9 rounded-full bg-[#E50914]/15 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-4 h-4 text-[#E50914]" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">Achievement Unlocked</p>
              <p className="text-[#B3B3B3] text-[11px] truncate">{achievementName}</p>
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors flex-shrink-0"
            >
              <X className="w-3 h-3 text-[#666]" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
