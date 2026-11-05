import { motion, AnimatePresence } from "framer-motion";
import { X, CalendarDays } from "lucide-react";
import type { Entry } from "@/types";
import WeeklyReleaseCalendar from "./WeeklyReleaseCalendar";

interface CalendarSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onEntryClick: (entry: Entry) => void;
  // Optional for backward compatibility with previous callers
  ongoingEntries?: unknown[];
  plannedEntries?: unknown[];
}

export default function CalendarSheet({
  isOpen,
  onClose,
  onEntryClick,
}: CalendarSheetProps) {
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
            className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Responsive Modal Sheet */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-x-2 bottom-2 top-10 sm:inset-6 md:inset-x-12 md:top-14 md:bottom-10 lg:inset-x-20 z-[95] bg-[#0d0d0d] border border-white/[0.1] rounded-2xl md:rounded-3xl flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] bg-[#141414]/90 backdrop-blur flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#E50914]/10 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-[#E50914]" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-base tracking-tight">
                    Weekly Release Calendar
                  </h2>
                  <p className="text-xs text-[#888]">
                    Schedule of ongoing episodes, specials, and premieres
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-[#B3B3B3] hover:text-white transition-colors tap-active"
                aria-label="Close calendar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content containing WeeklyReleaseCalendar */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <WeeklyReleaseCalendar
                onEntryClick={(entry) => {
                  onClose();
                  onEntryClick(entry);
                }}
                isModal
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
