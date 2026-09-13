import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Star, Heart, Calendar, TrendingUp } from 'lucide-react';

export type MilestoneType =
  | 'COLLECTION_SIZE'
  | 'FAVORITES_MILESTONE'
  | 'PERFECT_RATING'
  | 'TOP10_COMPLETE'
  | 'ANNIVERSARY';

export interface Milestone {
  type: MilestoneType;
  title: string;
  message: string;
  value: number;
}

/* ============================================================
   CSS Confetti Particle
   ============================================================ */
interface ConfettiParticle {
  id: number;
  x: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  rotation: number;
}

function generateConfetti(count: number = 50): ConfettiParticle[] {
  const colors = ['#E50914', '#FF2D7B', '#FF6B35', '#FACC15', '#4ADE80', '#60A5FA', '#A78BFA', '#F472B6'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 2 + Math.random() * 1.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 4 + Math.random() * 8,
    rotation: Math.random() * 720 - 360,
  }));
}

function getMilestoneIcon(type: MilestoneType) {
  switch (type) {
    case 'COLLECTION_SIZE': return Trophy;
    case 'FAVORITES_MILESTONE': return Heart;
    case 'PERFECT_RATING': return Star;
    case 'TOP10_COMPLETE': return TrendingUp;
    case 'ANNIVERSARY': return Calendar;
    default: return Trophy;
  }
}

function getMilestoneColor(type: MilestoneType): string {
  switch (type) {
    case 'COLLECTION_SIZE': return '#E50914';
    case 'FAVORITES_MILESTONE': return '#FF2D7B';
    case 'PERFECT_RATING': return '#FACC15';
    case 'TOP10_COMPLETE': return '#4ADE80';
    case 'ANNIVERSARY': return '#60A5FA';
    default: return '#E50914';
  }
}

/* ============================================================
   Milestone Modal Component
   ============================================================ */
interface MilestoneModalProps {
  milestone: Milestone | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function MilestoneModal({ milestone, isOpen, onClose }: MilestoneModalProps) {
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    if (isOpen && milestone) {
      setConfetti(generateConfetti(50));
      setTimeLeft(5);
    }
  }, [isOpen, milestone]);

  // Auto-dismiss countdown
  useEffect(() => {
    if (!isOpen) return;
    if (timeLeft <= 0) {
      onClose();
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [isOpen, timeLeft, onClose]);

  const handleContinue = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!milestone) return null;

  const Icon = getMilestoneIcon(milestone.type);
  const color = getMilestoneColor(milestone.type);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Dark Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleContinue}
          />

          {/* Confetti Layer */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {confetti.map((p) => (
              <motion.div
                key={p.id}
                className="absolute rounded-sm"
                style={{
                  left: `${p.x}%`,
                  top: -20,
                  width: p.size,
                  height: p.size * 0.6,
                  backgroundColor: p.color,
                }}
                initial={{ y: -20, opacity: 1, rotate: 0 }}
                animate={{
                  y: typeof window !== 'undefined' ? window.innerHeight + 20 : 1000,
                  opacity: [1, 1, 0],
                  rotate: p.rotation,
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  ease: 'easeIn',
                  opacity: { duration: 0.5, delay: p.delay + p.duration - 0.5 },
                }}
              />
            ))}
          </div>

          {/* Modal Content */}
          <motion.div
            className="relative bg-[#141414] border border-white/[0.08] rounded-3xl p-8 max-w-sm w-full mx-4 text-center"
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 24, stiffness: 350, delay: 0.1 }}
          >
            {/* Close button */}
            <button
              onClick={handleContinue}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors"
            >
              <X className="w-4 h-4 text-[#666]" />
            </button>

            {/* Icon */}
            <motion.div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ backgroundColor: `${color}20`, border: `2px solid ${color}40` }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.3 }}
            >
              <Icon className="w-10 h-10" style={{ color }} />
            </motion.div>

            {/* Title */}
            <motion.h2
              className="text-white font-bold text-xl mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {milestone.title}
            </motion.h2>

            {/* Message */}
            <motion.p
              className="text-[#B3B3B3] text-sm mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {milestone.message}
            </motion.p>

            {/* Value Badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
              style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.55 }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
              <span className="text-white font-bold text-sm">{milestone.value}</span>
            </motion.div>

            {/* Continue Button */}
            <motion.button
              onClick={handleContinue}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-colors"
              style={{ backgroundColor: color, color: '#fff' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              Continue ({timeLeft}s)
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
