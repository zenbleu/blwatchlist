import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ChevronRight,
  CircleHelp,
  Gamepad2,
  RotateCcw,
  SkipForward,
  Sparkles,
  X,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { Entry } from '@/types';

type GameId = 'thailand' | 'china' | 'japan' | 'south-korea' | 'taiwan' | 'global';

interface QuizGame {
  id: GameId;
  title: string;
  country: string;
  description: string;
  matches: string[];
}

interface QuizQuestion {
  answer: Entry;
  options: Entry[];
  crop: {
    x: number;
    y: number;
    size: number;
  };
}

type QuizResult = 'correct' | 'wrong' | null;

const QUESTIONS_PER_GAME = 20;

const QUIZ_GAMES: QuizGame[] = [
  {
    id: 'thailand',
    title: 'Guess the BL from the Cover Pieces (Thai Edition)',
    country: 'Thailand',
    description: 'Thai BLs',
    matches: ['thailand', 'thai'],
  },
  {
    id: 'china',
    title: 'Guess the BL from the Cover Pieces (C-BL Edition)',
    country: 'China',
    description: 'Chinese BLs',
    matches: ['china', 'chinese'],
  },
  {
    id: 'japan',
    title: 'Guess the BL from the Cover Pieces (J-BL Edition)',
    country: 'Japan',
    description: 'Japanese BLs',
    matches: ['japan', 'japanese'],
  },
  {
    id: 'south-korea',
    title: 'Guess the BL from the Cover Pieces (K-BL Edition)',
    country: 'South Korea',
    description: 'Korean BLs',
    matches: ['south korea', 'south korea', 'korea', 'korean'],
  },
  {
    id: 'taiwan',
    title: 'Guess the BL from the Cover Pieces (Taiwan Edition)',
    country: 'Taiwan',
    description: 'Taiwanese BLs',
    matches: ['taiwan', 'taiwanese'],
  },
  {
    id: 'global',
    title: 'Guess the BL from the Cover Pieces (Global Edition)',
    country: 'Global',
    description: 'BLs from other countries',
    matches: [],
  },
];

function hashString(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededShuffle<T>(values: T[], seedText: string): T[] {
  const result = [...values];
  let seed = hashString(seedText);
  for (let index = result.length - 1; index > 0; index -= 1) {
    seed = Math.imul(seed, 1664525) + 1013904223;
    const swapIndex = Math.abs(seed >>> 0) % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function normalizeCountry(country: string): string {
  return country.trim().toLowerCase().replace(/[^a-z]+/g, ' ');
}

function entryMatchesGame(entry: Entry, game: QuizGame): boolean {
  if (game.id === 'global') {
    return !QUIZ_GAMES
      .filter((candidate) => candidate.id !== 'global')
      .some((candidate) => candidate.matches.some((match) => normalizeCountry(entry.country).includes(match)));
  }
  const normalizedCountry = normalizeCountry(entry.country);
  return game.matches.some((match) => normalizedCountry.includes(match));
}

function getGameEntries(entries: Entry[], game: QuizGame): Entry[] {
  return entries.filter((entry) => Boolean(entry.poster) && entryMatchesGame(entry, game));
}

function buildQuestions(entries: Entry[], game: QuizGame): QuizQuestion[] {
  const playableEntries = getGameEntries(entries, game);
  const fallbackEntries = entries.filter((entry) => Boolean(entry.poster));
  if (playableEntries.length === 0 || fallbackEntries.length < 3) return [];

  const answerOrder = seededShuffle(playableEntries, `${game.id}:answers`);
  return Array.from({ length: QUESTIONS_PER_GAME }, (_, questionIndex) => {
    const answer = answerOrder[questionIndex % answerOrder.length];
    const distractors = seededShuffle(
      fallbackEntries.filter((entry) => entry.id !== answer.id),
      `${game.id}:${answer.id}:${questionIndex}:options`,
    ).slice(0, 2);
    const options = seededShuffle([answer, ...distractors], `${game.id}:${questionIndex}:order`);
    const cropSeed = hashString(`${game.id}:${answer.id}:${questionIndex}:crop`);

    return {
      answer,
      options,
      crop: {
        x: 12 + (cropSeed % 76),
        y: 10 + ((cropSeed >>> 8) % 78),
        size: 170 + ((cropSeed >>> 16) % 55),
      },
    };
  });
}

function PosterPlaceholder({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br from-[#252525] via-[#171717] to-[#0d0d0d] ${className}`}>
      <Sparkles className="h-5 w-5 text-white/25" />
    </div>
  );
}

function StackedPosterCards({
  entries,
  large = false,
}: {
  entries: Entry[];
  large?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const visibleEntries = entries.slice(0, 3);
  const width = large ? 132 : 96;
  const height = width;

  return (
    <motion.div
      className={`relative mx-auto ${large ? 'h-44 w-64' : 'h-36 w-52'}`}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      tabIndex={0}
      aria-label="Three randomized quiz poster previews"
    >
      {[0, 1, 2].map((cardIndex) => {
        const entry = visibleEntries[cardIndex];
        const isCenter = cardIndex === 1;
        const closedX = (cardIndex - 1) * 10;
        const closedRotate = (cardIndex - 1) * 7;
        const openX = (cardIndex - 1) * (large ? 70 : 58);
        const openRotate = (cardIndex - 1) * 10;

        return (
          <motion.div
            key={entry?.id ?? `placeholder-${cardIndex}`}
            className={`absolute left-1/2 top-1/2 overflow-hidden rounded-xl border border-white/20 bg-[#171717] shadow-2xl ${
              isCenter ? 'z-20' : cardIndex === 0 ? 'z-10' : 'z-0'
            }`}
            style={{ width, height, marginLeft: -width / 2, marginTop: -height / 2 }}
            animate={{
              x: isHovered ? openX : closedX,
              y: isHovered && !isCenter ? (cardIndex === 0 ? 4 : -4) : 0,
              rotate: isHovered ? openRotate : closedRotate,
              scale: isCenter ? 1 : isHovered ? 0.98 : 0.96,
            }}
            transition={{ type: 'spring', stiffness: 360, damping: 24 }}
          >
            {entry?.poster ? (
              <img
                src={entry.poster}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <PosterPlaceholder className="h-full w-full" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function QuizGamePreview({
  game,
  entries,
  onStart,
  compact = false,
}: {
  game: QuizGame;
  entries: Entry[];
  onStart: () => void;
  compact?: boolean;
}) {
  const previewEntries = useMemo(() => {
    const gameEntries = getGameEntries(entries, game);
    const source = gameEntries.length >= 3 ? gameEntries : entries.filter((entry) => Boolean(entry.poster));
    return seededShuffle(source, `${game.id}:preview`).slice(0, 3);
  }, [entries, game]);

  const hasPlayableQuestions = getGameEntries(entries, game).length > 0 && entries.filter((entry) => Boolean(entry.poster)).length >= 3;

  return (
    <div className={`group rounded-2xl border border-white/[0.08] bg-white/[0.025] ${compact ? 'p-3' : 'p-4'} transition-colors hover:border-white/[0.16] hover:bg-white/[0.045]`}>
      <StackedPosterCards entries={previewEntries} large={!compact} />
      <div className="mt-1 text-center">
        <p className={`${compact ? 'text-xs' : 'text-sm'} font-semibold leading-snug text-white`}>{game.title}</p>
        <p className="mt-1 text-[10px] text-[#777]">{game.description} · {QUESTIONS_PER_GAME} questions</p>
      </div>
      <button
        type="button"
        onClick={onStart}
        disabled={!hasPlayableQuestions}
        className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#E50914] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#ff1a26] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35 ${compact ? 'py-1.5' : ''}`}
      >
        {hasPlayableQuestions ? 'Start Quiz' : 'Add 3 posters to play'}
        {hasPlayableQuestions && <ChevronRight className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function ScoreRing({ score, total }: { score: number; total: number }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const percentage = total > 0 ? Math.max(0, score) / total : 0;

  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#E50914"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percentage)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-white">{score}</span>
        <span className="text-[10px] uppercase tracking-widest text-[#777]">of {total}</span>
      </div>
    </div>
  );
}

function QuizRound({
  game,
  entries,
  onBack,
}: {
  game: QuizGame;
  entries: Entry[];
  onBack: () => void;
}) {
  const questions = useMemo(() => buildQuestions(entries, game), [entries, game]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResult>(null);
  const [finished, setFinished] = useState(false);

  const question = questions[questionIndex];
  const canPlay = questions.length === QUESTIONS_PER_GAME;

  const chooseAnswer = (entry: Entry) => {
    if (!question || result) return;
    const isCorrect = entry.id === question.answer.id;
    setSelectedId(entry.id);
    setResult(isCorrect ? 'correct' : 'wrong');
    setAnsweredCount((count) => count + 1);
    if (isCorrect) setScore((currentScore) => currentScore + 1);
  };

  const advance = (didSkip: boolean) => {
    if (!question) return;
    if (didSkip) {
      setSkippedCount((count) => count + 1);
      setScore((currentScore) => Math.max(0, currentScore - 1));
    }
    if (questionIndex >= questions.length - 1) {
      setFinished(true);
      return;
    }
    setQuestionIndex((index) => index + 1);
    setSelectedId(null);
    setResult(null);
  };

  const restart = () => {
    setQuestionIndex(0);
    setScore(0);
    setAnsweredCount(0);
    setSkippedCount(0);
    setSelectedId(null);
    setResult(null);
    setFinished(false);
  };

  if (!canPlay) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <CircleHelp className="mb-4 h-10 w-10 text-[#E50914]" />
        <h3 className="text-lg font-bold text-white">Not enough poster data yet</h3>
        <p className="mt-2 max-w-md text-sm text-[#888]">
          Add at least one poster from this edition and three posters overall to generate the 20-question round.
        </p>
        <button type="button" onClick={onBack} className="mt-6 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15">
          Back to games
        </button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#E50914]">Quiz complete</p>
        <h3 className="mt-2 text-2xl font-extrabold text-white">{game.country} Edition</h3>
        <div className="my-7">
          <ScoreRing score={score} total={QUESTIONS_PER_GAME} />
        </div>
        <p className="text-sm text-[#aaa]">
          {answeredCount} answered · {skippedCount} skipped
        </p>
        <div className="mt-6 flex gap-2">
          <button type="button" onClick={onBack} className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15">
            Back to games
          </button>
          <button type="button" onClick={restart} className="flex items-center gap-2 rounded-xl bg-[#E50914] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#ff1a26]">
            <RotateCcw className="h-4 w-4" />
            Play again
          </button>
        </div>
      </div>
    );
  }

  const answerId = question.answer.id;
  const answerChosen = Boolean(result);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3 sm:px-6">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-[#aaa] hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Games
        </button>
        <p className="text-sm font-semibold text-white">Question {questionIndex + 1} of {QUESTIONS_PER_GAME}</p>
        <span className="text-xs font-bold text-yellow-300">Score {score}</span>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-4 py-5 sm:px-6 sm:py-8">
        <div className="relative h-48 w-full max-w-[360px] overflow-hidden rounded-2xl border border-white/[0.1] bg-[#151515] shadow-2xl sm:h-64">
          <AnimatePresence mode="wait">
            {answerChosen ? (
              <motion.img
                key={`full-${question.answer.id}`}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                src={question.answer.poster ?? undefined}
                alt={question.answer.title}
                className="h-full w-full object-contain bg-black"
              />
            ) : (
              <motion.div
                key={`crop-${question.answer.id}-${questionIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full w-full bg-no-repeat"
                style={{
                  backgroundImage: `url(${question.answer.poster})`,
                  backgroundPosition: `${question.crop.x}% ${question.crop.y}%`,
                  backgroundSize: `${question.crop.size}% ${question.crop.size}%`,
                }}
              />
            )}
          </AnimatePresence>
        </div>

        <div className="mt-5 min-h-12 text-center">
          {result ? (
            <p className={`text-base font-bold ${result === 'correct' ? 'text-emerald-300' : 'text-rose-300'}`}>
              {result === 'correct' ? 'Correct! Next Piece' : 'Wrong, next piece.'}
              {result === 'wrong' && <span className="mt-1 block text-xs font-medium text-[#aaa]">Answer: {question.answer.title}</span>}
            </p>
          ) : (
            <p className="text-sm text-[#777]">Which BL is this cover piece from?</p>
          )}
        </div>

        <div className="grid w-full max-w-xl gap-2.5 sm:grid-cols-3">
          {question.options.map((option) => {
            const isAnswer = option.id === answerId;
            const isSelected = option.id === selectedId;
            const optionClass = !result
              ? 'border-white/[0.08] bg-white/[0.04] text-white hover:border-[#E50914]/60 hover:bg-[#E50914]/10'
              : isAnswer
                ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200'
                : isSelected
                  ? 'border-rose-400/50 bg-rose-400/10 text-rose-200'
                  : 'border-white/[0.06] bg-white/[0.02] text-[#666]';

            return (
              <button
                key={option.id}
                type="button"
                disabled={Boolean(result)}
                onClick={() => chooseAnswer(option)}
                className={`min-h-12 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${optionClass}`}
              >
                {option.title}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex w-full max-w-xl items-center gap-2">
          <button
            type="button"
            onClick={() => advance(true)}
            disabled={Boolean(result)}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm font-semibold text-[#bbb] hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SkipForward className="h-4 w-4" />
            Skip
          </button>
          <button
            type="button"
            onClick={() => advance(false)}
            disabled={!result}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#E50914] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#ff1a26] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
          >
            {questionIndex === questions.length - 1 ? 'See Score' : 'Next'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function GameLibrary({
  entries,
  onStart,
}: {
  entries: Entry[];
  onStart: (game: QuizGame) => void;
}) {
  return (
    <div className="h-full overflow-y-auto px-4 py-5 sm:px-8 sm:py-7">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#E50914]">
              <Gamepad2 className="h-4 w-4" />
              BL Games
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">Guess the BL from the Cover Pieces</h2>
            <p className="mt-2 max-w-2xl text-sm text-[#888]">Choose an edition and identify 20 randomized poster pieces from the three title choices.</p>
          </div>
          <div className="hidden rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold text-[#777] sm:block">
            6 editions · 20 questions each
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {QUIZ_GAMES.map((game) => (
            <QuizGamePreview key={game.id} game={game} entries={entries} onStart={() => onStart(game)} compact />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BLGamesPanel({ entries }: { entries: Entry[] }) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [activeGame, setActiveGame] = useState<QuizGame | null>(null);
  const previewEntries = useMemo(
    () => seededShuffle(entries.filter((entry) => Boolean(entry.poster)), 'overview-bl-games').slice(0, 3),
    [entries],
  );

  const closeLibrary = () => {
    setLibraryOpen(false);
    setActiveGame(null);
  };

  return (
    <>
      <section className="min-w-0">
        <div className="mb-3 flex items-center gap-2">
          <Gamepad2 className="h-4 w-4 text-[#E50914]" />
          <h2 className="text-base font-bold text-white">BL Games</h2>
          <span className="text-xs text-[#666]">play a round</span>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#191016] via-[#121212] to-[#111] px-4 py-4 sm:px-5">
          <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[#E50914]/10 blur-3xl" />
          <StackedPosterCards entries={previewEntries} large />
          <div className="relative mt-1 text-center">
            <p className="text-sm font-bold text-white">Guess the BL from the Cover Pieces</p>
            <p className="mt-1 text-xs text-[#888]">6 editions · 20 questions per edition</p>
          </div>
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#E50914] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#ff1a26]"
          >
            Start Quiz
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <Dialog open={libraryOpen} onOpenChange={(open) => !open && closeLibrary()}>
        <DialogContent
          showCloseButton={false}
          className="h-[min(92vh,900px)] max-h-[calc(100vh-1rem)] w-[calc(100%-1rem)] max-w-7xl overflow-hidden border-white/[0.1] bg-[#0a0a0a] p-0 text-white shadow-2xl"
        >
          <DialogTitle className="sr-only">BL Games</DialogTitle>
          <DialogDescription className="sr-only">Choose a cover piece guessing game or play an active quiz.</DialogDescription>
          <div className="relative h-full min-h-0">
            <button
              type="button"
              onClick={closeLibrary}
              aria-label="Close games"
              className="absolute right-4 top-4 z-30 rounded-full bg-black/60 p-2 text-[#aaa] backdrop-blur-sm hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <GameLibrary entries={entries} onStart={setActiveGame} />
            {activeGame && (
              <div className="absolute inset-0 z-20 bg-[#0a0a0a]">
                <QuizRound game={activeGame} entries={entries} onBack={() => setActiveGame(null)} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}