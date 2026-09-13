import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Pencil, Trash2, Check, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useApp } from '@/context/AppContext';
import type { FavoriteEntry } from '@/types';
import { calculateOverallRating, formatRating } from '@/lib/rating';

/* ============================================================
   Animated Counter Hook
   ============================================================ */
function useAnimatedCounter(target: number, duration: number = 600, isActive: boolean = true) {
  const [value, setValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      setValue(target);
      return;
    }
    startTimeRef.current = null;
    const easeOutQuad = (t: number) => t * (2 - t);
    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuad(progress);
      setValue(eased * target);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, isActive]);

  return value;
}

/* ============================================================
   Star SVG Path (reusable 5-point star)
   ============================================================ */
const STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

/* ============================================================
   HalfStarIcon Component — renders empty / half / full star
   Uses SVG linearGradient for precise half-fill
   ============================================================ */
function HalfStarIcon({
  fill,
  size = 20,
  gradientId,
  className = '',
}: {
  fill: 'empty' | 'half' | 'full';
  size?: number;
  gradientId: string;
  className?: string;
}) {
  const fillColor = fill === 'empty' ? '#4B5563' : fill === 'full' ? '#FACC15' : `url(#${gradientId})`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="50%" stopColor="#FACC15" />
          <stop offset="50%" stopColor="#4B5563" />
        </linearGradient>
      </defs>
      <path d={STAR_PATH} fill={fillColor} stroke={fill === 'empty' ? '#4B5563' : '#FACC15'} strokeWidth="0.5" />
    </svg>
  );
}

/* ============================================================
   Animated Star Fill (Sequential fill on initial load)
   Supports half-filled states
   ============================================================ */
function AnimatedStarFill({
  fill,
  index,
}: {
  fill: 'empty' | 'half' | 'full';
  index: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 50);
    return () => clearTimeout(timer);
  }, [index]);

  const gradientId = `anim-star-grad-${index}`;

  return (
    <div
      style={{
        transform: visible ? 'scale(1)' : 'scale(0)',
        opacity: visible ? 1 : 0,
        transitionDelay: `${index * 50}ms`,
        transitionProperty: 'transform, opacity',
        transitionDuration: '150ms',
        transitionTimingFunction: 'ease-out',
      }}
    >
      <HalfStarIcon fill={fill} size={20} gradientId={gradientId} />
    </div>
  );
}

/* ============================================================
   Overall Rating Display (Top of Modal)
   Shows 5 stars with half-star precision
   ============================================================ */
function OverallRatingDisplay({ rating, isActive }: { rating: number; isActive: boolean }) {
  const animatedValue = useAnimatedCounter(rating, 600, isActive);

  // Convert 1-10 rating to 5-star half-fill states
  const starFills = useMemo(() => {
    const fills: ('empty' | 'half' | 'full')[] = [];
    for (let i = 1; i <= 5; i++) {
      const starValue = i * 2; // 2, 4, 6, 8, 10
      if (rating >= starValue) {
        fills.push('full');
      } else if (rating >= starValue - 1) {
        fills.push('half');
      } else {
        fills.push('empty');
      }
    }
    return fills;
  }, [rating]);

  return (
    <div className="flex flex-col items-center gap-2 py-3">
      {/* Large Number */}
      <span className="text-5xl font-black text-white tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatRating(animatedValue)}
      </span>
      {/* 5 Stars with half-fill support */}
      <div className="flex items-center gap-1">
        {starFills.map((fill, i) => (
          <AnimatedStarFill key={i} fill={fill} index={i} />
        ))}
      </div>
      <span className="text-[11px] text-[#888] uppercase tracking-wider">Overall Rating</span>
    </div>
  );
}

/* ============================================================
   Interactive Half-Star (Edit Mode)
   Detects left-half vs right-half hover/click
   ============================================================ */
function InteractiveHalfStar({
  starIndex,
  fill,
  hoverValue,
  onSetValue,
  onHoverValue,
  animating,
}: {
  starIndex: number;
  fill: 'empty' | 'half' | 'full';
  hoverValue: number | null;
  onSetValue: (val: number) => void;
  onHoverValue: (val: number | null) => void;
  animating: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const gradientId = `interactive-star-grad-${starIndex}`;

  // Left half hover/click -> odd value
  const handleLeftEnter = () => {
    setIsHovered(true);
    onHoverValue(starIndex * 2 - 1);
  };

  // Right half hover/click -> even value
  const handleRightEnter = () => {
    setIsHovered(true);
    onHoverValue(starIndex * 2);
  };

  const handleLeave = () => {
    setIsHovered(false);
    onHoverValue(null);
  };

  const handleLeftClick = () => {
    onSetValue(starIndex * 2 - 1);
  };

  const handleRightClick = () => {
    onSetValue(starIndex * 2);
  };

  // Determine display fill based on hover state
  const displayFill = hoverValue !== null
    ? hoverValue >= starIndex * 2
      ? 'full'
      : hoverValue >= starIndex * 2 - 1
        ? 'half'
        : 'empty'
    : fill;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: 32,
        height: 32,
        transform: animating ? 'scale(1.3)' : 'scale(1)',
        transition: animating ? 'transform 0.2s ease-out' : 'transform 0.15s ease-out',
      }}
      onMouseLeave={handleLeave}
    >
      {/* Star icon */}
      <HalfStarIcon
        fill={displayFill}
        size={20}
        gradientId={gradientId}
        className={isHovered ? 'brightness-110' : ''}
      />

      {/* Invisible left-half touch target */}
      <button
        type="button"
        onMouseEnter={handleLeftEnter}
        onClick={handleLeftClick}
        className="absolute left-0 top-0 w-1/2 h-full cursor-pointer"
        style={{ background: 'transparent', border: 'none', padding: 0, zIndex: 2 }}
        aria-label={`Rate ${starIndex * 2 - 1}`}
      />

      {/* Invisible right-half touch target */}
      <button
        type="button"
        onMouseEnter={handleRightEnter}
        onClick={handleRightClick}
        className="absolute right-0 top-0 w-1/2 h-full cursor-pointer"
        style={{ background: 'transparent', border: 'none', padding: 0, zIndex: 2 }}
        aria-label={`Rate ${starIndex * 2}`}
      />
    </div>
  );
}

/* ============================================================
   Category Star Rating Row — Half-Star Edition
   Supports 1-10 scale via 5 stars with half-fill
   ============================================================ */
function CategoryStarRating({
  label,
  value,
  onChange,
  editable,
}: {
  label: string;
  value: number;
  onChange?: (val: number) => void;
  editable: boolean;
}) {
  const [hoverVal, setHoverVal] = useState<number | null>(null);
  const [lastClicked, setLastClicked] = useState<number | null>(null);
  const [showHoverNumber, setShowHoverNumber] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayValue = hoverVal !== null ? hoverVal : value;

  // Convert 1-10 value to 5-star fill states
  const starFills = useMemo((): ('empty' | 'half' | 'full')[] => {
    const fills: ('empty' | 'half' | 'full')[] = [];
    for (let i = 1; i <= 5; i++) {
      const starMax = i * 2;
      if (displayValue >= starMax) {
        fills.push('full');
      } else if (displayValue >= starMax - 1) {
        fills.push('half');
      } else {
        fills.push('empty');
      }
    }
    return fills;
  }, [displayValue]);

  const handleSetValue = useCallback(
    (val: number) => {
      setLastClicked(Math.ceil(val / 2));
      onChange?.(val);
      setTimeout(() => setLastClicked(null), 200);
    },
    [onChange]
  );

  const handleHoverValue = useCallback((val: number | null) => {
    setHoverVal(val);
    setShowHoverNumber(val !== null);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (val === null) {
      hoverTimeoutRef.current = setTimeout(() => setShowHoverNumber(false), 150);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#B3B3B3] font-medium">{label}</span>
        {/* Stars */}
        <div className="flex items-center gap-0.5 relative">
          {[1, 2, 3, 4, 5].map((starIndex) => {
            if (editable) {
              return (
                <InteractiveHalfStar
                  key={starIndex}
                  starIndex={starIndex}
                  fill={starFills[starIndex - 1]}
                  hoverValue={hoverVal}
                  onSetValue={handleSetValue}
                  onHoverValue={handleHoverValue}
                  animating={lastClicked === starIndex}
                />
              );
            }
            return (
              <HalfStarIcon
                key={starIndex}
                fill={starFills[starIndex - 1]}
                size={16}
                gradientId={`view-star-${label}-${starIndex}`}
              />
            );
          })}

          {/* Hover number tooltip — appears below star row */}
          <AnimatePresence>
            {editable && showHoverNumber && hoverVal !== null && (
              <motion.span
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.1 }}
                className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-yellow-400 tabular-nums pointer-events-none"
              >
                {hoverVal}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Spacer for hover number in edit mode */}
      {editable && <div className="h-4" />}
    </div>
  );
}

/* ============================================================
   Evaluation Checkbox Item
   ============================================================ */
function EvalCheckbox({
  label,
  checked,
  onChange,
  editable,
}: {
  label: string;
  checked: boolean;
  onChange?: (val: boolean) => void;
  editable: boolean;
}) {
  if (editable) {
    return (
      <button
        onClick={() => onChange?.(!checked)}
        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all min-h-[44px] w-full ${
          checked
            ? 'bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/30'
            : 'bg-white/[0.04] text-[#888] border border-white/[0.06] hover:bg-white/[0.06]'
        }`}
      >
        <div className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
          checked ? 'bg-[#E50914]' : 'bg-white/[0.1] border border-white/20'
        }`}>
          {checked && <Check className="w-3 h-3 text-white" />}
        </div>
        {label}
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium min-h-[44px] ${
      checked ? 'text-[#E50914]' : 'text-[#555]'
    }`}>
      {checked ? (
        <Check className="w-3.5 h-3.5 text-[#E50914]" />
      ) : (
        <div className="w-3.5 h-3.5 rounded border border-[#444]" />
      )}
      {label}
    </div>
  );
}

/* ============================================================
   Remove Confirmation Dialog
   ============================================================ */
function RemoveConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#141414] border border-white/10 rounded-2xl p-6 max-w-[300px] w-full mx-4"
          >
            <h3 className="text-white font-bold text-lg mb-2">Remove from Favorites?</h3>
            <p className="text-[#B3B3B3] text-sm mb-6">
              This will remove the entry and all its evaluation data from Favorites.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-white/[0.06] text-[#B3B3B3] hover:bg-white/[0.1] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-[#E50914] text-white hover:bg-[#E50914]/90 transition-colors"
              >
                Remove
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============================================================
   Main FavoriteEvaluation Modal
   ============================================================ */
interface FavoriteEvaluationProps {
  isOpen: boolean;
  onClose: () => void;
  entryId: string | null;
  initialMode?: 'view' | 'edit';
  evaluationType?: 'favorite' | 'rating';
}

export default function FavoriteEvaluation({
  isOpen,
  onClose,
  entryId,
  initialMode = 'view',
  evaluationType = 'favorite',
}: FavoriteEvaluationProps) {
  const {
    dispatch,
    getEntryById,
    getFavoriteByEntryId,
    getRatingByEntryId,
    isFavorited,
    checkMilestones,
    state,
  } = useApp();
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isFirstOpen, setIsFirstOpen] = useState(true);

  // Form state for editing
  const [storyline, setStoryline] = useState(5);
  const [acting, setActing] = useState(5);
  const [music, setMusic] = useState(5);
  const [chemistry, setChemistry] = useState(5);
  const [cinematography, setCinematography] = useState(5);
  const [originality, setOriginality] = useState(false);
  const [flowAndPacing, setFlowAndPacing] = useState(false);
  const [characterDepth, setCharacterDepth] = useState(false);
  const [relationshipDynamics, setRelationshipDynamics] = useState(false);
  const [emotionalImpact, setEmotionalImpact] = useState(false);
  const [ending, setEnding] = useState(false);
  const [rewatchValue, setRewatchValue] = useState(false);

  const entry = entryId ? getEntryById(entryId) : null;
  const existingFavorite = entryId
    ? evaluationType === 'rating'
      ? getRatingByEntryId(entryId)
      : getFavoriteByEntryId(entryId)
    : null;
  const favorited = entryId ? isFavorited(entryId) : false;

  // Reset mode when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setIsFirstOpen(true);
    }
  }, [isOpen, initialMode]);

  // After animation completes, set isFirstOpen to false
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsFirstOpen(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Load existing favorite data when opening
  useEffect(() => {
    if (isOpen && existingFavorite) {
      setStoryline(existingFavorite.storyline);
      setActing(existingFavorite.acting);
      setMusic(existingFavorite.music);
      setChemistry(existingFavorite.chemistry);
      setCinematography(existingFavorite.cinematography);
      setOriginality(existingFavorite.originality);
      setFlowAndPacing(existingFavorite.flowAndPacing);
      setCharacterDepth(existingFavorite.characterDepth);
      setRelationshipDynamics(existingFavorite.relationshipDynamics);
      setEmotionalImpact(existingFavorite.emotionalImpact);
      setEnding(existingFavorite.ending);
      setRewatchValue(existingFavorite.rewatchValue);
    } else if (isOpen && !existingFavorite) {
      setStoryline(5);
      setActing(5);
      setMusic(5);
      setChemistry(5);
      setCinematography(5);
      setOriginality(false);
      setFlowAndPacing(false);
      setCharacterDepth(false);
      setRelationshipDynamics(false);
      setEmotionalImpact(false);
      setEnding(false);
      setRewatchValue(false);
    }
  }, [isOpen, existingFavorite]);

  // Calculate overall rating using the exact formula
  const overallRating = useMemo(() => calculateOverallRating({
    storyline,
    acting,
    music,
    chemistry,
    cinematography,
    originality,
    flowAndPacing,
    characterDepth,
    relationshipDynamics,
    emotionalImpact,
    ending,
    rewatchValue,
  }), [storyline, acting, music, chemistry, cinematography, originality, flowAndPacing, characterDepth, relationshipDynamics, emotionalImpact, ending, rewatchValue]);

  const handleSave = useCallback(() => {
    if (!entryId) return;

    const favoriteData: FavoriteEntry = {
      entryId,
      storyline,
      acting,
      music,
      chemistry,
      cinematography,
      originality,
      flowAndPacing,
      characterDepth,
      relationshipDynamics,
      emotionalImpact,
      ending,
      rewatchValue,
      gapPenalty: 0,
      overallRating,
    };

    if (evaluationType === 'rating') {
      dispatch({ type: 'UPDATE_RATING', payload: favoriteData });
    } else if (favorited && existingFavorite) {
      dispatch({ type: 'UPDATE_FAVORITE', payload: favoriteData });
    } else {
      dispatch({ type: 'TOGGLE_FAVORITE', payload: entryId });
      dispatch({ type: 'UPDATE_FAVORITE', payload: favoriteData });
    }

    // Trigger milestone checks
    // Check for perfect rating (10.0)
    if (overallRating >= 10.0) {
      checkMilestones('PERFECT_RATING', overallRating);
    }

    if (evaluationType === 'favorite') {
      // Check for favorites milestone
      const favoritesCount = state.favorites.length + (existingFavorite ? 0 : 1);
      checkMilestones('FAVORITES_MILESTONE', favoritesCount);
    }

    setMode('view');
  }, [entryId, storyline, acting, music, chemistry, cinematography, originality, flowAndPacing, characterDepth, relationshipDynamics, emotionalImpact, ending, rewatchValue, overallRating, favorited, existingFavorite, evaluationType, dispatch, checkMilestones, state.favorites.length]);

  const handleRemove = useCallback(() => {
    if (!entryId) return;
    dispatch({ type: 'REMOVE_FAVORITE', payload: entryId });
    setShowRemoveConfirm(false);
    onClose();
  }, [entryId, dispatch, onClose]);

  // If no entry, don't render
  if (!entry) return null;

  const isEditable = mode === 'edit';

  // Use existing favorite values for view mode display
  const displayStoryline = isEditable ? storyline : (existingFavorite?.storyline ?? 5);
  const displayActing = isEditable ? acting : (existingFavorite?.acting ?? 5);
  const displayMusic = isEditable ? music : (existingFavorite?.music ?? 5);
  const displayChemistry = isEditable ? chemistry : (existingFavorite?.chemistry ?? 5);
  const displayCinematography = isEditable ? cinematography : (existingFavorite?.cinematography ?? 5);
  const displayOriginality = isEditable ? originality : (existingFavorite?.originality ?? false);
  const displayFlowAndPacing = isEditable ? flowAndPacing : (existingFavorite?.flowAndPacing ?? false);
  const displayCharacterDepth = isEditable ? characterDepth : (existingFavorite?.characterDepth ?? false);
  const displayRelationshipDynamics = isEditable ? relationshipDynamics : (existingFavorite?.relationshipDynamics ?? false);
  const displayEmotionalImpact = isEditable ? emotionalImpact : (existingFavorite?.emotionalImpact ?? false);
  const displayEnding = isEditable ? ending : (existingFavorite?.ending ?? false);
  const displayRewatchValue = isEditable ? rewatchValue : (existingFavorite?.rewatchValue ?? false);

  // Calculate display overall
  const displayOverall = isEditable
    ? overallRating
    : (existingFavorite?.overallRating ?? 0);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          showCloseButton={true}
          className="bg-[#0a0a0a] border-white/[0.08] text-white w-[calc(100vw-1rem)] max-w-[380px] p-0 overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-sm px-5 pt-5 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {evaluationType === 'rating' ? (
                  <span className="text-yellow-400 text-sm">★</span>
                ) : (
                  <Heart className="w-4 h-4 text-[#E50914] flex-shrink-0" />
                )}
                <h2 className="text-sm font-bold text-white truncate">
                  {entry.title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors flex-shrink-0 ml-2"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5 text-[#B3B3B3]" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 py-4 space-y-5">
            {/* Overall Rating Display */}
            <OverallRatingDisplay rating={displayOverall} isActive={isOpen && isFirstOpen} />

            {/* Divider */}
            <div className="h-px bg-white/[0.06]" />

            {/* Rating Categories with Stars */}
            <div className="space-y-3">
              <p className="text-[11px] uppercase text-[#888] tracking-wider font-medium">Rating Categories</p>
              <div className="space-y-3">
                <CategoryStarRating
                  label="Storyline"
                  value={displayStoryline}
                  onChange={setStoryline}
                  editable={isEditable}
                />
                <CategoryStarRating
                  label="Acting"
                  value={displayActing}
                  onChange={setActing}
                  editable={isEditable}
                />
                <CategoryStarRating
                  label="Music"
                  value={displayMusic}
                  onChange={setMusic}
                  editable={isEditable}
                />
                <CategoryStarRating
                  label="Chemistry"
                  value={displayChemistry}
                  onChange={setChemistry}
                  editable={isEditable}
                />
                <CategoryStarRating
                  label="Cinematography"
                  value={displayCinematography}
                  onChange={setCinematography}
                  editable={isEditable}
                />
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/[0.06]" />

            {/* Evaluation Checkboxes */}
            <div className="space-y-3">
              <p className="text-[11px] uppercase text-[#888] tracking-wider font-medium">Bonus Evaluation</p>
              <div className="grid grid-cols-1 gap-1.5">
                <EvalCheckbox label="Originality" checked={displayOriginality} onChange={setOriginality} editable={isEditable} />
                <EvalCheckbox label="Flow &amp; Pacing" checked={displayFlowAndPacing} onChange={setFlowAndPacing} editable={isEditable} />
                <EvalCheckbox label="Character Depth" checked={displayCharacterDepth} onChange={setCharacterDepth} editable={isEditable} />
                <EvalCheckbox label="Relationship Dynamics" checked={displayRelationshipDynamics} onChange={setRelationshipDynamics} editable={isEditable} />
                <EvalCheckbox label="Emotional Impact" checked={displayEmotionalImpact} onChange={setEmotionalImpact} editable={isEditable} />
                <EvalCheckbox label="Ending" checked={displayEnding} onChange={setEnding} editable={isEditable} />
                <EvalCheckbox label="Rewatch Value" checked={displayRewatchValue} onChange={setRewatchValue} editable={isEditable} />
              </div>
              {isEditable && (
                <p className="text-[10px] text-[#666] text-center">
                  Each checked criterion adds +0.10 to overall rating (max 10.00)
                </p>
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="sticky bottom-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-sm px-5 py-4 border-t border-white/[0.06]">
            {mode === 'view' ? (
              /* VIEW MODE: Edit button centered */
              <div className="flex justify-center">
                <button
                  onClick={() => setMode('edit')}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#E50914] text-white text-sm font-semibold hover:bg-[#E50914]/90 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
              </div>
            ) : (
              /* EDIT MODE: Remove (left) + Cancel + Save (right) */
              <div className="flex items-center gap-3">
                {evaluationType === 'favorite' && favorited && (
                  <button
                    onClick={() => setShowRemoveConfirm(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.06] text-[#B3B3B3] text-sm font-medium hover:bg-red-500/15 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                )}
                <div className="flex-1" />
                <button
                  onClick={() => {
                    // Reset to existing values and go back to view mode
                    if (existingFavorite) {
                      setStoryline(existingFavorite.storyline);
                      setActing(existingFavorite.acting);
                      setMusic(existingFavorite.music);
                      setChemistry(existingFavorite.chemistry);
                      setCinematography(existingFavorite.cinematography);
                      setOriginality(existingFavorite.originality);
                      setFlowAndPacing(existingFavorite.flowAndPacing);
                      setCharacterDepth(existingFavorite.characterDepth);
                      setRelationshipDynamics(existingFavorite.relationshipDynamics);
                      setEmotionalImpact(existingFavorite.emotionalImpact);
                      setEnding(existingFavorite.ending);
                      setRewatchValue(existingFavorite.rewatchValue);
                    }
                    setMode('view');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.06] text-[#B3B3B3] text-sm font-medium hover:bg-white/[0.1] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#E50914] text-white text-sm font-semibold hover:bg-[#E50914]/90 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Save
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Overlay */}
      <RemoveConfirmDialog
        isOpen={showRemoveConfirm}
        onClose={() => setShowRemoveConfirm(false)}
        onConfirm={handleRemove}
      />
    </>
  );
}
