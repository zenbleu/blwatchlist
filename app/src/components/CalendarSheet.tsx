import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { Entry, OngoingEntry, AirDay } from "@/types";
import Poster from "./Poster";

const WEEK_DAYS: AirDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_LABELS: Record<AirDay, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

function parseReleaseDate(value: string): Date | null {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function airDayFromDate(date: Date): AirDay {
  const days: AirDay[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[date.getDay()];
}

interface CalendarSheetProps {
  isOpen: boolean;
  onClose: () => void;
  ongoingEntries: { entry: Entry; ongoingData: OngoingEntry }[];
  plannedEntries: Entry[];
  onEntryClick: (entry: Entry) => void;
}

export default function CalendarSheet({
  isOpen,
  onClose,
  ongoingEntries,
  plannedEntries,
  onEntryClick,
}: CalendarSheetProps) {
  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" }) as AirDay;
  const [selectedDay, setSelectedDay] = useState<AirDay>(todayName);

  // Group ongoing entries by air day
  const entriesByDay = useMemo(() => {
    const map = new Map<AirDay, { entry: Entry; ongoingData: OngoingEntry }[]>();
    for (const day of WEEK_DAYS) {
      map.set(day, []);
    }
    for (const item of ongoingEntries) {
      const days = item.ongoingData.trackingMode === 'calendar'
        ? [...new Set(
            (item.ongoingData.releaseDates || [])
              .map(parseReleaseDate)
              .filter((date): date is Date => date !== null)
              .map(airDayFromDate),
          )]
        : item.ongoingData.airDays;
      for (const day of days) {
        const existing = map.get(day) || [];
        existing.push(item);
        map.set(day, existing);
      }
    }
    return map;
  }, [ongoingEntries]);

  // Upcoming: next 14 days of entries (ongoing + planned)
  const upcomingEntries = useMemo(() => {
    const result: {
      date: Date;
      entry: Entry;
      type: "ongoing" | "planned";
      ongoingData?: OngoingEntry;
    }[] = [];

    const now = new Date();

    // Add ongoing entries with their air days in the next 14 days
    for (const { entry, ongoingData } of ongoingEntries) {
      if (ongoingData.trackingMode === 'calendar') {
        for (const releaseDate of ongoingData.releaseDates || []) {
          const date = parseReleaseDate(releaseDate);
          if (!date) continue;
          const daysUntil = Math.floor(
            (date.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
              (24 * 60 * 60 * 1000),
          );
          if (daysUntil >= 0 && daysUntil <= 14) {
            result.push({ date, entry, type: "ongoing", ongoingData });
          }
        }
        continue;
      }

      for (const airDay of ongoingData.airDays) {
        const dayIndex = WEEK_DAYS.indexOf(airDay);
        const todayIndex = WEEK_DAYS.indexOf(todayName);
        let daysUntil = dayIndex - todayIndex;
        if (daysUntil < 0) daysUntil += 7;
        if (daysUntil === 0) daysUntil = 0; // today
        if (daysUntil <= 14) {
          const date = new Date(now);
          date.setDate(date.getDate() + daysUntil);
          result.push({ date, entry, type: "ongoing", ongoingData });
        }
        // Also check next week
        if (daysUntil + 7 <= 14) {
          const date = new Date(now);
          date.setDate(date.getDate() + daysUntil + 7);
          result.push({ date, entry, type: "ongoing", ongoingData });
        }
      }
    }

    // Add planned entries — use specific plannedDate if set, otherwise year placeholder
    const currentYear = now.getFullYear();
    for (const entry of plannedEntries) {
      if (entry.year >= currentYear) {
        const date = entry.plannedDate
          ? new Date(entry.plannedDate + "T00:00:00")
          : new Date(entry.year, 0, 1);
        result.push({ date, entry, type: "planned" });
      }
    }

    // Sort by date
    result.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Remove duplicates (same entry, same day)
    const seen = new Set<string>();
    return result.filter((item) => {
      const key = `${item.entry.id}-${item.date.toDateString()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [ongoingEntries, plannedEntries, todayName]);

  // Get entries for the selected day
  const selectedDayEntries = entriesByDay.get(selectedDay) || [];

  // Format date for upcoming section
  const formatUpcomingDate = useCallback((date: Date) => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === date.toDateString();
    if (isToday) return "Today";
    if (isTomorrow) return "Tomorrow";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[95] bg-[#0a0a0a] border-t border-white/[0.08] rounded-t-2xl max-h-[75vh] flex flex-col"
            style={{ maxWidth: "480px", margin: "0 auto", width: "100%" }}
          >
            {/* Drag Handle + Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 rounded-full bg-white/20 mx-auto absolute left-1/2 -translate-x-1/2 top-1.5" />
              </div>
              <h2 className="text-white font-bold text-base mt-2">Release Calendar</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors mt-2"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-6">
              {/* ===== THIS WEEK ===== */}
              <div className="mt-2">
                <p className="text-[11px] uppercase text-[#888] tracking-wider font-medium mb-2">
                  This Week
                </p>

                {/* Day Tabs */}
                <div className="flex gap-1 mb-3">
                  {WEEK_DAYS.map((day) => {
                    const isToday = day === todayName;
                    const isSelected = day === selectedDay;
                    const dayEntries = entriesByDay.get(day) || [];
                    const hasEntries = dayEntries.length > 0;

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all tap-active ${
                          isSelected
                            ? "bg-white/[0.08] ring-1 ring-white/10"
                            : "hover:bg-white/[0.04]"
                        }`}
                      >
                        <span
                          className={`text-[10px] font-medium ${
                            isToday ? "text-[#E50914]" : "text-[#666]"
                          }`}
                        >
                          {DAY_LABELS[day]}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            isToday
                              ? "text-[#E50914]"
                              : isSelected
                              ? "text-white"
                              : "text-[#B3B3B3]"
                          }`}
                        >
                          {new Date(
                            new Date().setDate(
                              new Date().getDate() +
                                ((WEEK_DAYS.indexOf(day) - WEEK_DAYS.indexOf(todayName) + 7) % 7)
                            )
                          ).getDate()}
                        </span>
                        {hasEntries && (
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              isToday ? "bg-[#E50914]" : "bg-[#E50914]/60"
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Day Entries */}
                {selectedDayEntries.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-[#555] text-xs">No releases on {DAY_LABELS[selectedDay]}</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedDayEntries.slice(0, 3).map(({ entry }) => (
                      <button
                        key={entry.id}
                        onClick={() => onEntryClick(entry)}
                        className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl p-2 hover:bg-white/[0.06] transition-colors tap-active"
                      >
                        <Poster src={entry.poster} title={entry.title} size="sm" />
                        <div className="text-left">
                          <p className="text-white text-xs font-semibold truncate max-w-[100px]">
                            {entry.title}
                          </p>
                          <p className="text-[#666] text-[10px]">{entry.year}</p>
                        </div>
                      </button>
                    ))}
                    {selectedDayEntries.length > 3 && (
                      <button
                        onClick={() => {
                          // Scroll to upcoming section for this day
                        }}
                        className="flex items-center justify-center w-[52px] h-[52px] bg-white/[0.04] border border-white/[0.06] rounded-xl hover:bg-white/[0.06] transition-colors"
                      >
                        <span className="text-[#B3B3B3] text-xs font-bold">
                          +{selectedDayEntries.length - 3}
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-white/[0.06] my-4" />

              {/* ===== UPCOMING ===== */}
              <div>
                <p className="text-[11px] uppercase text-[#888] tracking-wider font-medium mb-2">
                  Upcoming
                </p>

                {upcomingEntries.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-[#555] text-xs">No upcoming releases</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {upcomingEntries.slice(0, 14).map((item, idx) => {
                      const epInfo =
                        item.type === "ongoing" && item.ongoingData
                          ? `Ep ${item.ongoingData.currentEpisode + 1}/${item.ongoingData.totalEpisodes}`
                          : item.type === "planned"
                          ? "Premiere"
                          : "";

                      return (
                        <div
                          key={`${item.entry.id}-${idx}`}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] text-left"
                        >
                          <span className="text-[10px] text-[#E50914] font-semibold w-14 flex-shrink-0">
                            {formatUpcomingDate(item.date)}
                          </span>
                          <Poster
                            src={item.entry.poster}
                            title={item.entry.title}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-semibold truncate">
                              {item.entry.title}
                            </p>
                            <p className="text-[#666] text-[10px]">
                              {epInfo}
                              {epInfo && (
                                <span className="text-[#444] mx-1">|</span>
                              )}
                              {item.entry.country}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
