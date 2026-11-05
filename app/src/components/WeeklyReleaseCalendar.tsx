import { useState, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Clock,
  Check,
  Calendar,
  LayoutGrid,
  List,
} from "lucide-react";
import type { Entry, OngoingEntry, AirDay, SpecialEpisode } from "@/types";
import { useApp } from "@/context/AppContext";
import Poster from "./Poster";
import { getDateOnly } from "@/lib/episodeSchedule";
import { formatEntryTitle } from "@/lib/entry";

const WEEK_DAYS: AirDay[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DAY_LABELS: Record<AirDay, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

export interface CalendarReleaseItem {
  id: string;
  entry: Entry;
  ongoingData?: OngoingEntry;
  type: "episode" | "special" | "planned_premiere";
  episodeNumber?: number;
  totalEpisodes?: number;
  isPremiere?: boolean;
  isFinale?: boolean;
  airTime?: string;
  isWatched: boolean;
  specialEpisode?: SpecialEpisode;
  releaseDateStr: string;
}

export interface DaySchedule {
  date: Date;
  dateKey: string;
  airDay: AirDay;
  isToday: boolean;
  dayShort: string;
  dayFull: string;
  formattedDate: string;
  releases: CalendarReleaseItem[];
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 is Sun, 1 is Mon ... 6 is Sat
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getFullYear() === Number(match[1]) &&
    date.getMonth() === Number(match[2]) - 1 &&
    date.getDate() === Number(match[3])
    ? date
    : null;
}

const AIR_DAYS_BY_INDEX: Record<number, AirDay> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

function countReleasedEpisodes(
  firstAirDate: Date,
  throughDate: Date,
  airDays: Set<AirDay>,
  premiereEpisodeCount: number,
): number {
  if (throughDate < firstAirDate) return 0;
  const cursor = new Date(firstAirDate);
  let count = premiereEpisodeCount;
  cursor.setDate(cursor.getDate() + 1);
  while (cursor <= throughDate) {
    if (airDays.has(AIR_DAYS_BY_INDEX[cursor.getDay()])) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

interface WeeklyReleaseCalendarProps {
  onEntryClick?: (entry: Entry) => void;
  isModal?: boolean;
}

type CalendarFilter = "all" | "today" | "unwatched" | "specials" | "planned";
type CalendarViewStyle = "grid" | "agenda";

export default function WeeklyReleaseCalendar({
  onEntryClick,
  isModal = false,
}: WeeklyReleaseCalendarProps) {
  const { state, dispatch, getOngoingByEntryId } = useApp();
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [viewStyle, setViewStyle] = useState<CalendarViewStyle>("grid");
  const [selectedMobileDay, setSelectedMobileDay] = useState<AirDay>(() => {
    const todayIndex = new Date().getDay();
    return AIR_DAYS_BY_INDEX[todayIndex] || "Monday";
  });

  const todayStr = useMemo(() => getDateOnly(new Date()), []);

  // Compute Monday of active week
  const monday = useMemo(() => getStartOfWeek(referenceDate), [referenceDate]);

  // Is active week current week?
  const isCurrentWeek = useMemo(() => {
    const currentMonday = getStartOfWeek(new Date());
    return monday.toDateString() === currentMonday.toDateString();
  }, [monday]);

  // 7 Days of the Week
  const weekDays = useMemo(() => {
    const days: {
      date: Date;
      dateKey: string;
      airDay: AirDay;
      isToday: boolean;
      dayShort: string;
      dayFull: string;
      formattedDate: string;
    }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateKey = getDateOnly(d);
      const airDay = WEEK_DAYS[i];
      const isToday = dateKey === todayStr;

      days.push({
        date: d,
        dateKey,
        airDay,
        isToday,
        dayShort: DAY_LABELS[airDay],
        dayFull: airDay,
        formattedDate: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      });
    }

    return days;
  }, [monday, todayStr]);

  // Week range label (e.g., "Nov 2 – Nov 8, 2026")
  const weekRangeLabel = useMemo(() => {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const startMonth = monday.toLocaleDateString("en-US", { month: "short" });
    const endMonth = sunday.toLocaleDateString("en-US", { month: "short" });
    const startDay = monday.getDate();
    const endDay = sunday.getDate();
    const year = sunday.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} – ${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
  }, [monday]);

  // Build release events per day
  const scheduleByDay: DaySchedule[] = useMemo(() => {
    const ongoingEntries = state.entries
      .filter((e) => e.status === "ONGOING")
      .map((entry) => ({
        entry,
        ongoingData: getOngoingByEntryId(entry.id),
      }))
      .filter(
        (item): item is { entry: Entry; ongoingData: OngoingEntry } =>
          item.ongoingData !== undefined,
      );

    const plannedEntries = state.entries.filter((e) => e.status === "PLANNED");

    return weekDays.map((day) => {
      const items: CalendarReleaseItem[] = [];

      // 1. Check Ongoing entries
      for (const { entry, ongoingData } of ongoingEntries) {
        if (ongoingData.trackingMode === "calendar") {
          const dates = ongoingData.releaseDates || [];
          for (let i = 0; i < dates.length; i++) {
            if (dates[i] === day.dateKey) {
              const epNum = i + 1;
              const isWatched = (ongoingData.currentEpisode || 0) >= epNum;
              items.push({
                id: `${entry.id}:ep:${epNum}:${day.dateKey}`,
                entry,
                ongoingData,
                type: "episode",
                episodeNumber: epNum,
                totalEpisodes: ongoingData.totalEpisodes || dates.length,
                isPremiere: epNum === 1,
                isFinale: epNum === (ongoingData.totalEpisodes || dates.length),
                airTime: ongoingData.airTime,
                isWatched,
                releaseDateStr: day.dateKey,
              });
            }
          }
        } else {
          // Weekly tracking mode
          if (ongoingData.airDays.includes(day.airDay)) {
            const firstAir = ongoingData.firstAirDate
              ? parseDateOnly(ongoingData.firstAirDate)
              : null;
            if (firstAir) {
              if (day.date >= firstAir) {
                const epNum = countReleasedEpisodes(
                  firstAir,
                  day.date,
                  new Set(ongoingData.airDays),
                  ongoingData.premiereEpisodeCount || 1,
                );
                if (epNum > 0 && epNum <= ongoingData.totalEpisodes) {
                  const isWatched = (ongoingData.currentEpisode || 0) >= epNum;
                  items.push({
                    id: `${entry.id}:weekly:${epNum}:${day.dateKey}`,
                    entry,
                    ongoingData,
                    type: "episode",
                    episodeNumber: epNum,
                    totalEpisodes: ongoingData.totalEpisodes,
                    isPremiere: epNum === 1,
                    isFinale: epNum === ongoingData.totalEpisodes,
                    airTime: ongoingData.airTime,
                    isWatched,
                    releaseDateStr: day.dateKey,
                  });
                }
              }
            } else {
              // No firstAirDate, regular recurring air day
              const epNum = (ongoingData.currentEpisode || 0) + 1;
              items.push({
                id: `${entry.id}:recurring:${day.airDay}:${day.dateKey}`,
                entry,
                ongoingData,
                type: "episode",
                episodeNumber: epNum <= ongoingData.totalEpisodes ? epNum : undefined,
                totalEpisodes: ongoingData.totalEpisodes,
                airTime: ongoingData.airTime,
                isWatched: false,
                releaseDateStr: day.dateKey,
              });
            }
          }
        }

        // Specials for this ongoing entry
        for (const special of ongoingData.specialEpisodes || []) {
          if (special.releaseDate === day.dateKey) {
            items.push({
              id: `${entry.id}:special:${special.id}:${day.dateKey}`,
              entry,
              ongoingData,
              type: "special",
              specialEpisode: special,
              episodeNumber: special.specialNumber,
              airTime: special.releaseTime || ongoingData.airTime,
              isWatched: Boolean(special.watched),
              releaseDateStr: day.dateKey,
            });
          }
        }
      }

      // 2. Planned Premieres
      for (const entry of plannedEntries) {
        const ongoingData = getOngoingByEntryId(entry.id);
        const premiereDate =
          ongoingData?.trackingMode === "calendar" &&
          ongoingData.releaseDates &&
          ongoingData.releaseDates.length > 0
            ? ongoingData.releaseDates[0]
            : entry.plannedDate;

        if (premiereDate === day.dateKey) {
          items.push({
            id: `${entry.id}:planned:${day.dateKey}`,
            entry,
            ongoingData,
            type: "planned_premiere",
            isPremiere: true,
            airTime: entry.plannedTime || ongoingData?.airTime,
            isWatched: false,
            releaseDateStr: day.dateKey,
          });
        }
      }

      // Sort items on the same day by air time (if present) then title
      items.sort((a, b) => {
        if (a.airTime && b.airTime) return a.airTime.localeCompare(b.airTime);
        if (a.airTime) return -1;
        if (b.airTime) return 1;
        return a.entry.title.localeCompare(b.entry.title);
      });

      return {
        ...day,
        releases: items,
      };
    });
  }, [state.entries, getOngoingByEntryId, weekDays]);

  // Total weekly release count
  const totalWeeklyReleases = useMemo(() => {
    return scheduleByDay.reduce((acc, d) => acc + d.releases.length, 0);
  }, [scheduleByDay]);

  // Today releases count
  const todayReleasesCount = useMemo(() => {
    const today = scheduleByDay.find((d) => d.isToday);
    return today ? today.releases.length : 0;
  }, [scheduleByDay]);

  // Apply filters
  const filteredSchedule = useMemo(() => {
    return scheduleByDay.map((day) => {
      let releases = day.releases;
      if (filter === "today") {
        releases = day.isToday ? releases : [];
      } else if (filter === "unwatched") {
        releases = releases.filter((r) => !r.isWatched);
      } else if (filter === "specials") {
        releases = releases.filter((r) => r.type === "special");
      } else if (filter === "planned") {
        releases = releases.filter((r) => r.type === "planned_premiere");
      }
      return {
        ...day,
        releases,
      };
    });
  }, [scheduleByDay, filter]);

  // Navigation handlers
  const handlePrevWeek = useCallback(() => {
    setReferenceDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }, []);

  const handleNextWeek = useCallback(() => {
    setReferenceDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }, []);

  const handleResetToToday = useCallback(() => {
    setReferenceDate(new Date());
    const todayIndex = new Date().getDay();
    setSelectedMobileDay(AIR_DAYS_BY_INDEX[todayIndex] || "Monday");
  }, []);

  // Quick toggle watched handler
  const handleToggleWatched = useCallback(
    (e: React.MouseEvent, item: CalendarReleaseItem) => {
      e.stopPropagation();

      if (item.type === "special" && item.specialEpisode && item.ongoingData) {
        const specialId = item.specialEpisode.id;
        const targetWatched = !item.isWatched;
        dispatch({
          type: "UPDATE_ONGOING",
          payload: {
            ...item.ongoingData,
            specialEpisodes: (item.ongoingData.specialEpisodes || []).map((s) =>
              s.id === specialId ? { ...s, watched: targetWatched } : s,
            ),
          },
        });
        return;
      }

      if (item.type === "episode" && item.ongoingData && item.episodeNumber) {
        const epNum = item.episodeNumber;
        const targetEp = item.isWatched ? epNum - 1 : Math.max(item.ongoingData.currentEpisode, epNum);

        dispatch({
          type: "UPDATE_ONGOING",
          payload: {
            ...item.ongoingData,
            currentEpisode: Math.max(0, targetEp),
          },
        });
      }
    },
    [dispatch],
  );

  return (
    <div className={`w-full space-y-4 ${isModal ? "p-4" : ""}`}>
      {/* ── Top Bar: Week Navigation & Controls ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-[#141414] border border-white/[0.08] p-3.5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white transition-colors tap-active"
              aria-label="Previous week"
              title="Previous week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white transition-colors tap-active"
              aria-label="Next week"
              title="Next week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {weekRangeLabel}
              </h2>
              {isCurrentWeek ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/30">
                  Current Week
                </span>
              ) : (
                <button
                  onClick={handleResetToToday}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-[#B3B3B3] hover:text-white transition-colors"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Jump to Today
                </button>
              )}
            </div>
            <p className="text-xs text-[#888]">
              {totalWeeklyReleases} {totalWeeklyReleases === 1 ? "release" : "releases"} scheduled this week
              {todayReleasesCount > 0 && ` · ${todayReleasesCount} airing today`}
            </p>
          </div>
        </div>

        {/* View Style & Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Layout switcher */}
          <div className="inline-flex rounded-lg bg-white/[0.04] p-1 border border-white/[0.06]">
            <button
              onClick={() => setViewStyle("grid")}
              className={`p-1.5 rounded-md transition-colors tap-active ${
                viewStyle === "grid"
                  ? "bg-white/[0.12] text-white"
                  : "text-[#777] hover:text-white"
              }`}
              title="7-Day Grid View"
              aria-label="7-Day Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewStyle("agenda")}
              className={`p-1.5 rounded-md transition-colors tap-active ${
                viewStyle === "agenda"
                  ? "bg-white/[0.12] text-white"
                  : "text-[#777] hover:text-white"
              }`}
              title="Agenda List View"
              aria-label="Agenda List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Filter options */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-0.5">
            {[
              { id: "all", label: "All" },
              { id: "today", label: "Airing Today" },
              { id: "unwatched", label: "Unwatched" },
              { id: "specials", label: "Specials" },
              { id: "planned", label: "Premieres" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as CalendarFilter)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all tap-active ${
                  filter === f.id
                    ? "bg-[#E50914] text-white"
                    : "bg-white/[0.04] text-[#888] hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mobile Day Selector (Visible on small screens) ── */}
      <div className="flex sm:hidden gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {weekDays.map((d) => {
          const isSelected = selectedMobileDay === d.airDay;
          const dayReleases = scheduleByDay.find((day) => day.airDay === d.airDay)?.releases || [];
          const hasReleases = dayReleases.length > 0;

          return (
            <button
              key={d.airDay}
              onClick={() => setSelectedMobileDay(d.airDay)}
              className={`flex-1 min-w-[50px] flex flex-col items-center py-2 rounded-xl transition-all tap-active ${
                isSelected
                  ? "bg-white/[0.12] ring-1 ring-white/20"
                  : "bg-[#141414] border border-white/[0.04]"
              }`}
            >
              <span
                className={`text-[10px] font-semibold uppercase ${
                  d.isToday ? "text-[#E50914]" : "text-[#777]"
                }`}
              >
                {d.dayShort}
              </span>
              <span
                className={`text-xs font-bold ${
                  d.isToday ? "text-[#E50914]" : isSelected ? "text-white" : "text-[#B3B3B3]"
                }`}
              >
                {d.date.getDate()}
              </span>
              {hasReleases && (
                <div
                  className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                    d.isToday ? "bg-[#E50914]" : "bg-white/40"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Main View 1: 7-Day Grid View (Desktop / Tablet / Mobile Toggle) ── */}
      {viewStyle === "grid" && (
        <div className="space-y-4">
          {/* Desktop & Tablet: Full 7 columns grid / horizontal scroll */}
          <div className="hidden sm:grid grid-cols-7 gap-2.5 items-start">
            {filteredSchedule.map((day) => {
              const isToday = day.isToday;

              return (
                <div
                  key={day.dateKey}
                  className={`flex flex-col rounded-2xl bg-[#141414] border transition-all ${
                    isToday
                      ? "border-[#E50914]/50 shadow-[0_0_20px_rgba(229,9,20,0.12)] bg-[#171112]"
                      : "border-white/[0.06] hover:border-white/[0.12]"
                  }`}
                >
                  {/* Day Column Header */}
                  <div
                    className={`p-2.5 border-b rounded-t-2xl flex flex-col gap-0.5 ${
                      isToday
                        ? "border-[#E50914]/30 bg-[#E50914]/10"
                        : "border-white/[0.06] bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-extrabold uppercase tracking-wide ${
                          isToday ? "text-[#E50914]" : "text-[#999]"
                        }`}
                      >
                        {day.dayShort}
                      </span>
                      {isToday && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#E50914] text-white">
                          Today
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline justify-between mt-0.5">
                      <span className="text-sm font-bold text-white">{day.formattedDate}</span>
                      <span className="text-[11px] text-[#666]">
                        {day.releases.length}
                      </span>
                    </div>
                  </div>

                  {/* Releases in Column */}
                  <div className="p-2 space-y-2 min-h-[160px]">
                    {day.releases.length === 0 ? (
                      <div className="h-full flex items-center justify-center py-8 text-center">
                        <p className="text-[11px] text-[#555] italic">No releases</p>
                      </div>
                    ) : (
                      day.releases.map((item) => (
                        <CalendarCard
                          key={item.id}
                          item={item}
                          onEntryClick={onEntryClick}
                          onToggleWatched={handleToggleWatched}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile Single-Day View (Follows selectedMobileDay) */}
          <div className="block sm:hidden">
            {(() => {
              const activeDay = filteredSchedule.find((d) => d.airDay === selectedMobileDay);
              if (!activeDay) return null;

              return (
                <div
                  className={`rounded-2xl bg-[#141414] border p-3.5 space-y-3 ${
                    activeDay.isToday
                      ? "border-[#E50914]/40 bg-[#171112]"
                      : "border-white/[0.08]"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">
                          {activeDay.dayFull}
                        </h3>
                        {activeDay.isToday && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E50914] text-white">
                            Today
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#888]">{activeDay.formattedDate}</p>
                    </div>
                    <span className="text-xs font-semibold text-[#B3B3B3]">
                      {activeDay.releases.length} {activeDay.releases.length === 1 ? "release" : "releases"}
                    </span>
                  </div>

                  {activeDay.releases.length === 0 ? (
                    <div className="py-12 text-center space-y-2">
                      <Calendar className="w-8 h-8 text-[#444] mx-auto opacity-40" />
                      <p className="text-sm text-[#777]">No releases scheduled for {activeDay.dayFull}</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {activeDay.releases.map((item) => (
                        <CalendarCard
                          key={item.id}
                          item={item}
                          onEntryClick={onEntryClick}
                          onToggleWatched={handleToggleWatched}
                          expanded
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Main View 2: Agenda List View ── */}
      {viewStyle === "agenda" && (
        <div className="space-y-3">
          {filteredSchedule.map((day) => {
            if (day.releases.length === 0 && filter !== "all") return null;

            return (
              <div
                key={day.dateKey}
                className={`rounded-2xl border p-3.5 transition-all ${
                  day.isToday
                    ? "bg-[#171112] border-[#E50914]/40"
                    : "bg-[#141414] border-white/[0.06]"
                }`}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-extrabold uppercase ${
                        day.isToday ? "text-[#E50914]" : "text-white"
                      }`}
                    >
                      {day.dayFull}
                    </span>
                    <span className="text-xs text-[#888]">• {day.formattedDate}</span>
                    {day.isToday && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E50914] text-white">
                        Today
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#777]">
                    {day.releases.length} {day.releases.length === 1 ? "item" : "items"}
                  </span>
                </div>

                {day.releases.length === 0 ? (
                  <p className="text-xs text-[#555] py-2 italic">No releases scheduled</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {day.releases.map((item) => (
                      <CalendarCard
                        key={item.id}
                        item={item}
                        onEntryClick={onEntryClick}
                        onToggleWatched={handleToggleWatched}
                        expanded
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Release Item Card Component ──
interface CalendarCardProps {
  item: CalendarReleaseItem;
  onEntryClick?: (entry: Entry) => void;
  onToggleWatched: (e: React.MouseEvent, item: CalendarReleaseItem) => void;
  expanded?: boolean;
}

function CalendarCard({
  item,
  onEntryClick,
  onToggleWatched,
  expanded = false,
}: CalendarCardProps) {
  const displayTitle = formatEntryTitle(item.entry);

  // Episode label logic
  const episodeBadgeText = useMemo(() => {
    if (item.type === "special" && item.specialEpisode) {
      return `Special ${item.specialEpisode.specialNumber}`;
    }
    if (item.type === "planned_premiere") {
      return "Planned Premiere";
    }
    if (item.isFinale) {
      return `Finale (EP ${item.episodeNumber})`;
    }
    if (item.isPremiere) {
      return "Premiere (EP 1)";
    }
    if (item.episodeNumber && item.totalEpisodes) {
      return `EP ${item.episodeNumber} / ${item.totalEpisodes}`;
    }
    if (item.episodeNumber) {
      return `EP ${item.episodeNumber}`;
    }
    return "Airing";
  }, [item]);

  return (
    <div
      onClick={() => onEntryClick?.(item.entry)}
      className={`group relative rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.2] hover:bg-white/[0.07] transition-all cursor-pointer overflow-hidden tap-active ${
        item.isWatched ? "opacity-75" : "opacity-100"
      } ${expanded ? "p-3" : "p-2"}`}
    >
      <div className="flex gap-2.5 items-start">
        {/* Poster */}
        <div className="flex-shrink-0">
          <Poster
            src={item.entry.poster}
            title={displayTitle}
            size={expanded ? "md" : "sm"}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-white truncate group-hover:text-red-400 transition-colors">
              {displayTitle}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-[#888] mt-0.5">
              <span>{item.entry.country}</span>
              {item.airTime && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-0.5 text-[#B3B3B3]">
                    <Clock className="w-2.5 h-2.5" />
                    {item.airTime}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Episode Tag & Quick Watched Action */}
          <div className="mt-2 flex items-center justify-between gap-1 flex-wrap">
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                item.type === "special"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : item.type === "planned_premiere"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                  : item.isFinale
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : item.isPremiere
                  ? "bg-[#E50914]/20 text-red-300 border border-[#E50914]/30"
                  : "bg-white/[0.06] text-[#B3B3B3]"
              }`}
            >
              {episodeBadgeText}
            </span>

            {/* Quick Toggle Watched Button (For Ongoing titles) */}
            {item.ongoingData && item.type !== "planned_premiere" && (
              <button
                type="button"
                onClick={(e) => onToggleWatched(e, item)}
                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded transition-colors tap-active ${
                  item.isWatched
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                    : "bg-white/[0.06] text-[#888] hover:bg-white/[0.12] hover:text-white"
                }`}
                title={item.isWatched ? "Mark unwatched" : "Mark watched"}
                aria-label={item.isWatched ? "Mark unwatched" : "Mark watched"}
              >
                {item.isWatched ? (
                  <>
                    <Check className="w-2.5 h-2.5" />
                    <span>Watched</span>
                  </>
                ) : (
                  <span>Mark Watched</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
