import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { PartyPopper } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AirDay } from "@/types";

interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const DAY_INDEX: Record<AirDay, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const ZERO_COUNTDOWN: CountdownParts = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
};

const CONFETTI_COLORS = ["#E50914", "#F59E0B", "#22C55E", "#38BDF8", "#F472B6"];
const COUNTDOWN_STORAGE_PREFIX = "bl-watchlist:pending-airing:";

function parseAirTime(airTime = "00:00"): { hours: number; minutes: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(airTime);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

function getNextAiringAt(now: Date, airDays: AirDay[], airTime?: string): Date | null {
  const parsedTime = parseAirTime(airTime);
  if (!parsedTime || airDays.length === 0) return null;

  const airingDayIndexes = new Set(airDays.map((day) => DAY_INDEX[day]));
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);

    if (airingDayIndexes.has(candidate.getDay()) && candidate.getTime() >= now.getTime()) {
      return candidate;
    }
  }

  return null;
}

function getScheduleKey(airDays: AirDay[], airTime?: string): string {
  return `${airDays.join(",")}|${airTime || ""}`;
}

function readStoredTarget(entryId: string, scheduleKey: string): Date | null {
  try {
    const raw = window.localStorage.getItem(`${COUNTDOWN_STORAGE_PREFIX}${entryId}`);
    if (!raw) return null;

    const stored = JSON.parse(raw) as { scheduleKey?: string; target?: number };
    if (
      stored.scheduleKey !== scheduleKey ||
      typeof stored.target !== "number" ||
      !Number.isFinite(stored.target)
    ) {
      window.localStorage.removeItem(`${COUNTDOWN_STORAGE_PREFIX}${entryId}`);
      return null;
    }

    const target = new Date(stored.target);
    return Number.isNaN(target.getTime()) ? null : target;
  } catch {
    return null;
  }
}

function storeTarget(entryId: string, scheduleKey: string, target: Date | null): void {
  try {
    const storageKey = `${COUNTDOWN_STORAGE_PREFIX}${entryId}`;
    if (!target) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ scheduleKey, target: target.getTime() }),
    );
  } catch {
    // Countdown behavior should still work when browser storage is unavailable.
  }
}

function getInitialTarget(
  entryId: string,
  now: Date,
  airDays: AirDay[],
  airTime?: string,
): Date | null {
  const scheduleKey = getScheduleKey(airDays, airTime);
  const storedTarget = readStoredTarget(entryId, scheduleKey);
  if (storedTarget) return storedTarget;

  const nextTarget = getNextAiringAt(now, airDays, airTime);
  storeTarget(entryId, scheduleKey, nextTarget);
  return nextTarget;
}

function getCountdownParts(milliseconds: number): CountdownParts {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

function CountdownDisplay({
  parts,
  large = false,
}: {
  parts: CountdownParts;
  large?: boolean;
}) {
  const units = [
    { value: parts.days, label: "days" },
    { value: parts.hours, label: "hours" },
    { value: parts.minutes, label: "minutes" },
    { value: parts.seconds, label: "seconds" },
  ];

  return (
    <div
      className={`flex items-center justify-center rounded-xl border border-white/10 bg-[#171717]/95 ${
        large
          ? "w-full max-w-[410px] px-4 py-5 sm:px-7 sm:py-6"
          : "w-[min(48vw,190px)] min-w-[156px] px-1.5 py-1"
      }`}
    >
      {units.map((unit, index) => (
        <div key={unit.label} className="flex items-center">
          <div className={`flex min-w-0 flex-col items-center ${large ? "px-2 sm:px-3" : "px-0.5"}`}>
            <span
              className={`font-extrabold leading-none tabular-nums text-white ${
                large ? "text-4xl sm:text-5xl" : "text-sm sm:text-base"
              }`}
            >
              {unit.value}
            </span>
            <span className={`mt-1 text-[#888] ${large ? "text-sm" : "text-[7px] sm:text-[8px]"}`}>
              {unit.label}
            </span>
          </div>
          {index < units.length - 1 && (
            <span
              aria-hidden="true"
              className={`font-bold leading-none text-[#555] ${large ? "text-3xl sm:text-4xl" : "text-xs"}`}
            >
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function ConfettiBurst() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-4 top-0 h-52 overflow-hidden">
      {Array.from({ length: 28 }, (_, index) => {
        const style = {
          left: `${(index * 37) % 100}%`,
          backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
          animationDelay: `${(index % 7) * 0.12}s`,
          "--confetti-x": `${((index % 5) - 2) * 34}px`,
        } as CSSProperties;

        return <span key={index} className="countdown-confetti absolute top-0 h-3 w-1.5 rounded-sm" style={style} />;
      })}
    </div>
  );
}

export default function OngoingCountdown({
  entryId,
  airDays,
  airTime,
}: {
  entryId: string;
  airDays: AirDay[];
  airTime?: string;
}) {
  const [now, setNow] = useState(() => new Date());
  const scheduleKey = getScheduleKey(airDays, airTime);
  const [target, setTarget] = useState<Date | null>(() =>
    getInitialTarget(entryId, new Date(), airDays, airTime),
  );
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const isZero = Boolean(target && now.getTime() >= target.getTime());

  const parts = useMemo(() => {
    if (isZero || !target) return ZERO_COUNTDOWN;
    return getCountdownParts(target.getTime() - now.getTime());
  }, [isZero, now, target]);

  const handleCelebrationClick = () => {
    if (!isZero) return;

    const resetNow = new Date();
    const nextTarget = getNextAiringAt(resetNow, airDays, airTime);
    setIsCelebrationOpen(true);
    setNow(resetNow);
    setTarget(nextTarget);
    storeTarget(entryId, scheduleKey, nextTarget);
  };

  if (!target && !isZero) return null;

  return (
    <>
      <motion.button
        type="button"
        aria-label={isZero ? "Open airing celebration" : "View next airing countdown"}
        onClick={handleCelebrationClick}
        className={`rounded-xl text-left ${isZero ? "cursor-pointer tap-active" : "cursor-default"}`}
        whileTap={isZero ? { scale: 0.98 } : undefined}
      >
        <CountdownDisplay parts={parts} />
      </motion.button>

      <Dialog open={isCelebrationOpen} onOpenChange={setIsCelebrationOpen}>
        <DialogContent className="overflow-hidden border-white/10 bg-[#141414] text-white sm:max-w-md">
          <div className="relative flex flex-col items-center gap-4 py-3">
            <ConfettiBurst />
            <DialogHeader className="relative z-10 items-center text-center">
              <PartyPopper className="h-10 w-10 text-[#E50914]" />
              <DialogTitle className="text-2xl font-extrabold">It&apos;s time to watch!</DialogTitle>
              <DialogDescription className="text-[#B3B3B3]">
                The episode is airing now. Happy watching!
              </DialogDescription>
            </DialogHeader>
            <div className="relative z-10 w-full">
              <CountdownDisplay parts={ZERO_COUNTDOWN} large />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}