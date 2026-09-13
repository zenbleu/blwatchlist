import { useState, useMemo, memo, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { PlayCircle, ArrowUpDown, Filter, Pencil, Check, X, Calendar } from "lucide-react";
import { useApp } from "@/context/AppContext";
import Poster from "../Poster";
import type { AirDay, Entry, OngoingEntry } from "@/types";
import AirDaySelector from "../AirDaySelector";
import { getOngoingSchedule } from "@/lib/episodeSchedule";
import EntryModal from "../EntryModal";
import CalendarSheet from "../CalendarSheet";
import OngoingCountdown from "../OngoingCountdown";

const OngoingCard = memo(function OngoingCard({
  entryId,
  entry,
  ongoingData,
  schedule,
  onEpisodeChange,
  onEntryClick,
  onFinishPrompt,
}: {
  entryId: string;
  entry: { title: string; poster: string | null; country: string };
  ongoingData: OngoingEntry;
  schedule: ReturnType<typeof getOngoingSchedule>;
  onEpisodeChange: (entryId: string, field: "currentEpisode", value: number) => void;
  onEntryClick: (entry: Entry) => void;
  onFinishPrompt: (entryId: string, schedule: ReturnType<typeof getOngoingSchedule>, ongoingData: OngoingEntry) => boolean;
}) {
  const isAiringToday = schedule.isAiringToday;
  const showBadge = isAiringToday || schedule.isFinalEpisodeScheduledToday;
  const progressTotal = schedule.totalEpisodes || ongoingData.totalEpisodes;
  const showCountdown =
    schedule.isConfigured &&
    schedule.airedEpisode !== null &&
    schedule.airedEpisode < schedule.totalEpisodes;
  const progress = progressTotal > 0 ? (ongoingData.currentEpisode / progressTotal) * 100 : 0;
  const [isAskingFinished, setIsAskingFinished] = useState(false);
  const [verificationError, setVerificationError] = useState(false);

  return (
    <motion.div
      key={entryId}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-xl bg-[#141414] relative overflow-hidden ${
        schedule.isFinalEpisodeScheduledToday
          ? "glow-border-amber pulse-glow-amber"
          : isAiringToday
            ? "glow-border-red pulse-glow"
            : ""
      }`}
    >
      {showCountdown && (
        <div className="absolute top-2 right-2 z-10">
          <OngoingCountdown
            key={`${ongoingData.airDays.join(",")}|${ongoingData.airTime || ""}`}
            entryId={entryId}
            airDays={ongoingData.airDays}
            airTime={ongoingData.airTime}
          />
        </div>
      )}

      <div className="flex items-start gap-3">
        <div onClick={() => onEntryClick(entry as Entry)} className="cursor-pointer flex-shrink-0">
          <Poster src={entry.poster} title={entry.title} size="md" />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`flex items-center gap-2 min-w-0 ${showCountdown ? "pr-2 sm:pr-[165px]" : "pr-2"}`}>
            <p className="text-base font-bold truncate">{entry.title}</p>
            {showBadge && (
              <span className={`shrink-0 whitespace-nowrap text-white text-[10px] font-bold px-2 py-0.5 rounded-full ${
                schedule.isFinalEpisodeScheduledToday ? "bg-amber-500" : "bg-[#E50914]"
              }`}>
                {schedule.isFinalEpisodeScheduledToday ? "Final EP" : "Airing Today"}
              </span>
            )}
          </div>
          <p className="text-xs text-[#B3B3B3]">{entry.country}</p>

          {/* Episode Tracker */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#B3B3B3]">Watched</span>
              <input
                type="number"
                value={ongoingData.currentEpisode}
                onChange={(e) => onEpisodeChange(entryId, "currentEpisode", parseInt(e.target.value) || 0)}
                className="w-10 h-7 bg-white/[0.06] border border-white/10 rounded text-center text-sm text-white focus:border-[#E50914] outline-none"
                min={0}
              />
              <span className="text-xs text-[#B3B3B3]">/</span>
              <input
                type="number"
                value={progressTotal}
                readOnly
                disabled
                className="w-10 h-7 bg-white/[0.06] border border-white/10 rounded text-center text-sm text-white focus:border-[#E50914] outline-none"
                min={1}
              />
            </div>

            {schedule.isConfigured ? (
              <p className="text-xs text-[#B3B3B3]">
                Latest aired: <span className="text-white font-medium">
                  Ep {schedule.airedEpisode} / {progressTotal}
                </span>
              </p>
            ) : (
              <p className="text-[11px] text-amber-300/80">
                Add the episode 1 release date to auto-track aired episodes.
              </p>
            )}

            {/* Progress Bar */}
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#E50914] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, progress)}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>

            <div className="pt-1">
              <div className="space-y-1.5">
                <span className="block text-xs text-[#B3B3B3]">Air Days:</span>
                <AirDaySelector
                  value={ongoingData.airDays}
                  onChange={() => undefined}
                  disabled
                />
              </div>
            </div>
          </div>
        </div>

          {schedule.isFinalEpisodeAired && (
            <div className={`text-xs ${schedule.isFinalEpisodeScheduledToday ? "pt-6" : ""}`}>
                {verificationError ? (
                  <p className="text-amber-300/90">
                    This series is currently airing. Please complete all available episodes.
                  </p>
                ) : isAskingFinished ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[#B3B3B3]">Have you finished watching this title?</span>
                    <button
                      onClick={() => {
                        const passed = onFinishPrompt(entryId, schedule, ongoingData);
                        if (!passed) {
                          setVerificationError(true);
                          setIsAskingFinished(false);
                        }
                      }}
                      className="px-2 py-1 rounded-md bg-green-500/20 text-green-300 font-semibold hover:bg-green-500/30"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setIsAskingFinished(false)}
                      className="px-2 py-1 rounded-md bg-white/[0.06] text-[#B3B3B3] font-semibold hover:bg-white/[0.1]"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setVerificationError(false);
                      setIsAskingFinished(true);
                    }}
                    className="text-[#B3B3B3] hover:text-white underline underline-offset-2"
                  >
                    Have you finished watching this title?
                  </button>
                )}
            </div>
          )}
      </div>
    </motion.div>
  );
});

type SortType = "airDay" | "year" | "titleAZ" | "titleZA" | "country";
type FilterType = "all" | "today" | AirDay;

const sortOptions: { value: SortType; label: string }[] = [
  { value: "airDay", label: "Air Day" },
  { value: "year", label: "Year" },
  { value: "titleAZ", label: "Title (A \u2192 Z)" },
  { value: "titleZA", label: "Title (Z \u2192 A)" },
  { value: "country", label: "Country" },
];

const dayFilters: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Airing Today" },
  { value: "Monday", label: "Mon" },
  { value: "Tuesday", label: "Tue" },
  { value: "Wednesday", label: "Wed" },
  { value: "Thursday", label: "Thu" },
  { value: "Friday", label: "Fri" },
  { value: "Saturday", label: "Sat" },
  { value: "Sunday", label: "Sun" },
];

const airDayFromDate = (value: string): AirDay | null => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const days: AirDay[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[date.getDay()];
};

const matchesAirDay = (ongoing: OngoingEntry, day: AirDay): boolean => {
  if (ongoing.trackingMode === 'calendar') {
    return (ongoing.releaseDates || []).some((date) => airDayFromDate(date) === day);
  }
  return ongoing.airDays.includes(day);
};

export default function OngoingTab() {
  const { state, dispatch, getOngoingByEntryId } = useApp();
  const [now, setNow] = useState(() => new Date());
  const [sort, setSort] = useState<SortType>("airDay");
  const [filter, setFilter] = useState<FilterType>("all");
  const [showSort, setShowSort] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // Editable year state
  const [isEditingYear, setIsEditingYear] = useState(false);
  const [yearInput, setYearInput] = useState(state.ongoingYear.toString());

  // Derive ongoing entries from entries with status ONGOING
  const ongoingEntries = useMemo(() => {
    let result = state.entries
      .filter((e) => e.status === "ONGOING")
      .map((entry) => {
        const ongoingData = getOngoingByEntryId(entry.id);
        return {
          entry,
          ongoingData,
          schedule: ongoingData ? getOngoingSchedule(ongoingData, now) : null,
        };
      })
      .filter((item): item is { entry: Entry; ongoingData: NonNullable<typeof item.ongoingData>; schedule: ReturnType<typeof getOngoingSchedule> } =>
        item.ongoingData !== undefined && item.schedule !== null
      );

    // Apply filter
    if (filter === "today") {
      result = result.filter(({ schedule }) =>
        schedule.isAiringToday || schedule.isFinalEpisodeScheduledToday
      );
    } else if (filter !== "all") {
      result = result.filter(({ ongoingData }) => matchesAirDay(ongoingData, filter as AirDay));
    }

    // Apply sort
    result = [...result].sort((a, b) => {
      switch (sort) {
        case "airDay": {
          const aHasToday = a.schedule.isAiringToday || a.schedule.isFinalEpisodeScheduledToday ? 0 : 1;
          const bHasToday = b.schedule.isAiringToday || b.schedule.isFinalEpisodeScheduledToday ? 0 : 1;
          return aHasToday - bHasToday || a.entry.title.localeCompare(b.entry.title);
        }
        case "year": return b.entry.year - a.entry.year;
        case "titleAZ": return a.entry.title.localeCompare(b.entry.title);
        case "titleZA": return b.entry.title.localeCompare(a.entry.title);
        case "country": return a.entry.country.localeCompare(b.entry.country);
        default: return 0;
      }
    });

    return result;
  }, [state.entries, getOngoingByEntryId, filter, sort, now]);

  // Planned entries for calendar (current/future year)
  const plannedEntries = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return state.entries.filter((e) => e.status === "PLANNED" && e.year >= currentYear);
  }, [state.entries]);

  const handleEpisodeChange = useCallback((entryId: string, field: "currentEpisode", value: number) => {
    const existing = state.ongoing.find((o) => o.entryId === entryId);
    if (!existing) return;
    dispatch({
      type: "UPDATE_ONGOING",
      payload: { ...existing, [field]: Math.max(0, value) },
    });
  }, [state.ongoing, dispatch]);

  const handleFinishPrompt = useCallback((
    entryId: string,
    schedule: ReturnType<typeof getOngoingSchedule>,
    ongoingData: OngoingEntry,
  ): boolean => {
    const entry = state.entries.find((item) => item.id === entryId);
    const verificationPassed =
      !!entry &&
      schedule.isFinalEpisodeAired &&
      schedule.isConfigured &&
      schedule.airedEpisode === schedule.totalEpisodes &&
      ongoingData.currentEpisode === schedule.airedEpisode;

    if (verificationPassed && entry) {
      dispatch({
        type: "UPDATE_ENTRY",
        payload: { ...entry, status: "COMPLETE" },
      });
      return true;
    } else {
      return false;
    }
  }, [state.entries, dispatch]);

  const handleYearSave = useCallback(() => {
    const year = parseInt(yearInput);
    if (year && year >= 2000 && year <= 2100) {
      dispatch({ type: 'SET_ONGOING_YEAR', payload: year });
      setIsEditingYear(false);
    }
  }, [yearInput, dispatch]);

  const handleYearCancel = useCallback(() => {
    setYearInput(state.ongoingYear.toString());
    setIsEditingYear(false);
  }, [state.ongoingYear]);

  if (ongoingEntries.length === 0) {
    return (
      <div className="space-y-4 w-full">
        <div>
          {isEditingYear ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold">Ongoing BL (</span>
              <input
                type="number"
                value={yearInput}
                onChange={(e) => setYearInput(e.target.value)}
                className="w-20 h-8 bg-white/[0.06] border border-white/10 rounded text-center text-lg font-extrabold text-white focus:border-[#E50914] outline-none"
                min={2000}
                max={2100}
                autoFocus
              />
              <span className="text-2xl font-extrabold">)</span>
              <button onClick={handleYearSave} className="p-1 rounded-lg bg-green-500/20 text-green-400 tap-active">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={handleYearCancel} className="p-1 rounded-lg bg-red-500/20 text-red-400 tap-active">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold">Ongoing BL ({state.ongoingYear})</h1>
              <button
                onClick={() => {
                  setYearInput(state.ongoingYear.toString());
                  setIsEditingYear(true);
                }}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] tap-active"
                aria-label="Edit year"
              >
                <Pencil className="w-3.5 h-3.5 text-[#666] hover:text-[#B3B3B3]" />
              </button>
            </div>
          )}
          <p className="text-sm text-[#B3B3B3]">0 currently airing</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <PlayCircle className="w-8 h-8 text-[#333] mb-3" />
          <p className="text-[#666] text-sm">No ongoing BLs</p>
          <p className="text-[#555] text-xs mt-1">Mark entries as Ongoing to track them here</p>
        </div>

        {/* Calendar Sheet (still available when empty) */}
        <CalendarSheet
          isOpen={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          ongoingEntries={ongoingEntries}
          plannedEntries={plannedEntries}
          onEntryClick={setSelectedEntry}
        />

        {/* Entry Modal */}
        <EntryModal
          isOpen={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
          entry={selectedEntry}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* Header with Editable Year */}
      <div>
        {isEditingYear ? (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold">Ongoing BL (</span>
            <input
              type="number"
              value={yearInput}
              onChange={(e) => setYearInput(e.target.value)}
              className="w-20 h-8 bg-white/[0.06] border border-white/10 rounded text-center text-lg font-extrabold text-white focus:border-[#E50914] outline-none"
              min={2000}
              max={2100}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleYearSave();
                if (e.key === 'Escape') handleYearCancel();
              }}
            />
            <span className="text-2xl font-extrabold">)</span>
            <button onClick={handleYearSave} className="p-1 rounded-lg bg-green-500/20 text-green-400 tap-active">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={handleYearCancel} className="p-1 rounded-lg bg-red-500/20 text-red-400 tap-active">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold">Ongoing BL ({state.ongoingYear})</h1>
            <button
              onClick={() => {
                setYearInput(state.ongoingYear.toString());
                setIsEditingYear(true);
              }}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] tap-active"
              aria-label="Edit year"
            >
              <Pencil className="w-3.5 h-3.5 text-[#666] hover:text-[#B3B3B3]" />
            </button>
          </div>
        )}
        <p className="text-sm text-[#B3B3B3]">{ongoingEntries.length} currently airing</p>
      </div>

      {/* Sort & Filter Controls + Calendar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => { setShowSort(!showSort); setShowFilter(false); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all tap-active ${
            showSort ? "bg-[#E50914] text-white" : "glass text-[#B3B3B3] hover:bg-white/[0.1]"
          }`}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          Sort
        </button>
        <button
          onClick={() => { setShowFilter(!showFilter); setShowSort(false); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all tap-active ${
            showFilter ? "bg-[#E50914] text-white" : "glass text-[#B3B3B3] hover:bg-white/[0.1]"
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filter
        </button>
        <div className="flex-1" />
        {/* Calendar Button */}
        <button
          onClick={() => setCalendarOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all tap-active glass text-[#B3B3B3] hover:bg-white/[0.1]"
          aria-label="Open release calendar"
        >
          <Calendar className="w-5 h-5 text-white" />
          <span className="hidden sm:inline">Calendar</span>
        </button>
      </div>

      {/* Sort Options */}
      {showSort && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-1.5 overflow-x-auto scrollbar-hide"
        >
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setSort(opt.value); setShowSort(false); }}
              className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-all tap-active ${
                sort === opt.value
                  ? "bg-white/[0.1] text-white"
                  : "bg-transparent text-[#B3B3B3] hover:bg-white/[0.06]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </motion.div>
      )}

      {/* Filter Options */}
      {showFilter && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-1.5 overflow-x-auto scrollbar-hide"
        >
          {dayFilters.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setFilter(opt.value); setShowFilter(false); }}
              className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-all tap-active ${
                filter === opt.value
                  ? "bg-white/[0.1] text-white"
                  : "bg-transparent text-[#B3B3B3] hover:bg-white/[0.06]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </motion.div>
      )}

      {/* Ongoing Cards */}
      <div className="space-y-3 w-full">
        {ongoingEntries.map(({ entry, ongoingData, schedule }) => (
          <OngoingCard
            key={entry.id}
            entryId={entry.id}
            entry={entry}
            ongoingData={ongoingData}
            schedule={schedule}
            onEpisodeChange={handleEpisodeChange}
            onEntryClick={setSelectedEntry}
            onFinishPrompt={handleFinishPrompt}
          />
        ))}
      </div>

      {/* Calendar Sheet */}
      <CalendarSheet
        isOpen={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        ongoingEntries={state.entries
          .filter((e) => e.status === "ONGOING")
          .map((entry) => {
            const ongoingData = getOngoingByEntryId(entry.id);
            return {
              entry,
              ongoingData,
              schedule: ongoingData ? getOngoingSchedule(ongoingData, now) : null,
            };
          })
          .filter((item): item is {
            entry: Entry;
            ongoingData: NonNullable<typeof item.ongoingData>;
            schedule: ReturnType<typeof getOngoingSchedule>;
          } =>
            item.ongoingData !== undefined && item.schedule !== null
          )}
        plannedEntries={plannedEntries}
        onEntryClick={setSelectedEntry}
      />

      {/* Entry Modal */}
      <EntryModal
        isOpen={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        entry={selectedEntry}
      />
    </div>
  );
}
