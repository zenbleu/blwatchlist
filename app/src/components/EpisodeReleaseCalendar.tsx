import { useEffect, useState } from 'react';
import { CalendarDays, Check, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';

interface EpisodeReleaseCalendarProps {
  isOpen: boolean;
  onClose: () => void;
  releaseDates: string[];
  onSave: (releaseDates: string[]) => void;
}

function dateToKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function keyToDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getFullYear() === Number(match[1]) &&
    date.getMonth() === Number(match[2]) - 1 &&
    date.getDate() === Number(match[3])
    ? date
    : null;
}

export default function EpisodeReleaseCalendar({
  isOpen,
  onClose,
  releaseDates,
  onSave,
}: EpisodeReleaseCalendarProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [episodeCounts, setEpisodeCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isOpen) return;
    const counts: Record<string, number> = {};
    const dates = releaseDates
      .map(keyToDate)
      .filter((date): date is Date => date !== null);
    dates.forEach((date) => {
      const key = dateToKey(date);
      counts[key] = (counts[key] || 0) + 1;
    });
    setSelectedDates([...new Map(dates.map((date) => [dateToKey(date), date])).values()]);
    setEpisodeCounts(counts);
  }, [isOpen, releaseDates]);

  const handleSave = () => {
    const dates = selectedDates.flatMap((date) => {
      const key = dateToKey(date);
      return Array.from({ length: episodeCounts[key] || 1 }, () => key);
    });
    onSave(dates.sort());
    onClose();
  };

  const handleClear = () => {
    setSelectedDates([]);
    setEpisodeCounts({});
  };

  const updateEpisodeCount = (key: string, change: number) => {
    setEpisodeCounts((current) => {
      const nextCount = Math.max(1, (current[key] || 1) + change);
      return { ...current, [key]: nextCount };
    });
  };

  const totalEpisodes = selectedDates.reduce(
    (total, date) => total + (episodeCounts[dateToKey(date)] || 1),
    0,
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#141414] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <CalendarDays className="w-5 h-5 text-[#E50914]" />
            Episode Release Dates
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-[#B3B3B3]">
            Select every date an episode releases. You can reopen this calendar
            anytime when the airing schedule changes.
          </p>

          <div className="flex justify-center rounded-xl bg-white/[0.04] p-2 overflow-x-auto">
            <Calendar
              mode="multiple"
              selected={selectedDates}
              onSelect={(dates) => setSelectedDates(dates || [])}
              numberOfMonths={1}
              className="bg-transparent [--cell-size:2.5rem] p-0"
              classNames={{
                table: 'w-full border border-white/15 rounded-lg overflow-hidden',
                weekdays: 'grid grid-cols-7 bg-white/[0.04]',
                weekday: 'flex h-9 items-center justify-center border-r border-b border-white/15 text-[#A3A3A3] text-xs font-medium last:border-r-0',
                week: 'grid grid-cols-7 mt-0',
                day: 'relative h-(--cell-size) w-full border-r border-b border-white/15 p-0 text-center last:border-r-0',
              }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-[#B3B3B3]">
            <span>
              {selectedDates.length} release date{selectedDates.length === 1 ? '' : 's'} selected
            </span>
            <span className="text-white/70">Total episodes: {totalEpisodes}</span>
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 text-[#888] hover:text-white tap-active"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>

          {selectedDates.length > 0 && (
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {[...selectedDates].sort((a, b) => a.getTime() - b.getTime()).map((date) => {
                const key = dateToKey(date);
                const count = episodeCounts[key] || 1;
                return (
                  <div key={key} className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
                    <span className="text-xs text-[#B3B3B3]">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => updateEpisodeCount(key, -1)} disabled={count <= 1}
                        className="rounded-md bg-white/[0.08] p-1 text-white disabled:opacity-30" aria-label={`Decrease episodes on ${key}`}>
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="min-w-14 text-center text-xs text-white">{count} ep{count === 1 ? '' : 's'}</span>
                      <button type="button" onClick={() => updateEpisodeCount(key, 1)}
                        className="rounded-md bg-white/[0.08] p-1 text-white" aria-label={`Increase episodes on ${key}`}>
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-white/10 text-[#B3B3B3] hover:bg-white/[0.06]"
            >
              <X className="w-4 h-4 mr-1.5" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="flex-1 bg-[#E50914] hover:bg-[#E50914]/90 text-white font-semibold"
            >
              <Check className="w-4 h-4 mr-1.5" />
              Save Dates
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}