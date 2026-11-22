import { useEffect, useState, useCallback } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { X, Trophy, Star, Heart, Calendar, TrendingUp, Sparkles, Crown, UserRound } from 'lucide-react';

export type MilestoneType =
  | 'COLLECTION_SIZE'
  | 'FAVORITES_MILESTONE'
  | 'PERFECT_RATING'
  | 'TOP10_COMPLETE'
  | 'ANNIVERSARY'
  | 'ACHIEVEMENT'
  | 'PERSONALITY'
  | 'WATCHER_TITLE';

export interface Milestone {
  type: MilestoneType;
  title: string;
  message: string;
  value: number;
  milestoneId?: string;
  badge?: string;
  emoji?: string;
  category?: string;
  profileSection?: 'title' | 'personality' | 'achievements';
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
    case 'ACHIEVEMENT': return Trophy;
    case 'PERSONALITY': return Sparkles;
    case 'WATCHER_TITLE': return Crown;
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
    case 'ACHIEVEMENT': return '#F59E0B';
    case 'PERSONALITY': return '#EC4899';
    case 'WATCHER_TITLE': return '#A855F7';
    default: return '#E50914';
  }
}

function getMilestoneEyebrow(milestone: Milestone): string {
  switch (milestone.type) {
    case 'ACHIEVEMENT':
      return milestone.category
        ? `Achievement Unlocked · ${milestone.category}`
        : 'Achievement Showcase';
    case 'PERSONALITY':
      return 'Collection Personality Unlocked';
    case 'WATCHER_TITLE':
      return 'BL Watcher Title Upgraded';
    case 'COLLECTION_SIZE':
      return 'Collection Milestone';
    case 'FAVORITES_MILESTONE':
      return 'Favorites Milestone';
    case 'PERFECT_RATING':
      return 'Perfect Rating Milestone';
    case 'TOP10_COMPLETE':
      return 'Top 10 Milestone';
    case 'ANNIVERSARY':
      return 'BL Journey Anniversary';
    default:
      return 'Milestone Reached';
  }
}

/* ============================================================
   Milestone Modal Component
   ============================================================ */
interface MilestoneModalProps {
  milestone: Milestone | null;
  isOpen: boolean;
  onClose: () => void;
  queueRemaining?: number;
  onDismissAll?: () => void;
  onViewProfile?: (section?: 'title' | 'personality' | 'achievements') => void;
}

export default function MilestoneModal({
  milestone,
  isOpen,
  onClose,
  queueRemaining = 0,
  onDismissAll,
  onViewProfile,
}: MilestoneModalProps) {
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  const [timeLeft, setTimeLeft] = useState(6);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isOpen && milestone) {
      setConfetti(generateConfetti(50));
      setTimeLeft(6);
      setIsPaused(false);
    }
  }, [isOpen, milestone]);

  // Auto-dismiss countdown (paused while hovering/focusing)
  useEffect(() => {
    if (!isOpen || isPaused) return;
    if (timeLeft <= 0) {
      onClose();
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [isOpen, isPaused, timeLeft, onClose]);

  const handleContinue = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!milestone) return null;

  const Icon = getMilestoneIcon(milestone.type);
  const color = getMilestoneColor(milestone.type);
  const eyebrow = getMilestoneEyebrow(milestone);
  const badgeText = milestone.badge ?? String(milestone.value);

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => { if (!open) handleContinue(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />

        {/* Confetti Layer */}
        <div className="fixed inset-0 z-[121] pointer-events-none overflow-hidden">
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

        <DialogPrimitive.Content
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="fixed left-[50%] top-[50%] z-[122] w-[calc(100%-2rem)] max-w-sm translate-x-[-50%] translate-y-[-50%] pointer-events-auto outline-none"
        >
          <motion.div
            className="relative bg-[#141414] border border-white/[0.1] rounded-3xl p-7 text-center shadow-2xl"
            initial={{ scale: 0.85, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 350 }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={handleContinue}
              aria-label="Close celebration modal"
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.12] transition-colors"
            >
              <X className="w-4 h-4 text-[#999]" />
            </button>

            {/* Category / Eyebrow Pill */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4"
              style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}35` }}
            >
              <Icon className="w-3 h-3" />
              <span>{eyebrow}</span>
            </div>

            {/* Icon / Emoji */}
            <motion.div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${color}20`, border: `2px solid ${color}45` }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.15 }}
            >
              {milestone.emoji ? (
                <span className="text-4xl leading-none" role="img" aria-hidden="true">
                  {milestone.emoji}
                </span>
              ) : (
                <Icon className="w-10 h-10" style={{ color }} />
              )}
            </motion.div>

            {/* Title */}
            <DialogPrimitive.Title asChild>
              <motion.h2
                className="text-white font-extrabold text-xl mb-2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {milestone.title}
              </motion.h2>
            </DialogPrimitive.Title>

            {/* Message */}
            <DialogPrimitive.Description asChild>
              <motion.p
                className="text-[#B3B3B3] text-sm mb-5 leading-relaxed"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                {milestone.message}
              </motion.p>
            </DialogPrimitive.Description>

            {/* Value / Status Badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5"
              style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color }} />
              <span className="text-white font-bold text-xs">{badgeText}</span>
            </motion.div>

            {/* Actions */}
            <div className="space-y-2">
              <motion.button
                type="button"
                onClick={handleContinue}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-colors"
                style={{ backgroundColor: color, color: '#fff' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isPaused ? 'Continue' : `Continue (${timeLeft}s)`}
              </motion.button>

              {onViewProfile && (
                <button
                  type="button"
                  onClick={() => onViewProfile(milestone.profileSection)}
                  className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <UserRound className="w-3.5 h-3.5 text-[#E50914]" />
                  View in BL Watcher Profile
                </button>
              )}

              {queueRemaining > 0 && onDismissAll && (
                <button
                  type="button"
                  onClick={onDismissAll}
                  className="w-full py-1.5 text-[11px] font-medium text-[#888] hover:text-white transition-colors"
                >
                  Dismiss all ({queueRemaining + 1} celebrations)
                </button>
              )}
            </div>
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
