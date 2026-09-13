import { useEffect, useState } from 'react';
import { CalendarDays, Check, Minus, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import type { SpecialEpisode } from '@/types';

interface EpisodeReleaseCalendarProps {
  isOpen: boolean;
  onClose: () => void;
  parentTitle: string;
  releaseDates: string[];
  onSave: (releaseDates: string[]) => void;
  specialEpisodes?: SpecialEpisode[];
  onSpecialEpisodesSave?: (specialEpisodes: SpecialEpisode[]) => void;
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
  parentTitle,
  releaseDates,
  onSave,
  specialEpisodes = [],
  onSpecialEpisodesSave,
}: EpisodeReleaseCalendarProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [episodeCounts, setEpisodeCounts] = useState<Record<string, number>>({});
  const [editedSpecialEpisodes, setEditedSpecialEpisodes] = useState<SpecialEpisode[]>([]);
  const [specialFormOpen, setSpecialFormOpen] = useState(false);
  const [editingSpecialId, setEditingSpecialId] = useState<string | null>(null);
  const [specialNumber, setSpecialNumber] = useState(1);
  const [specialDate, setSpecialDate] = useState('');
  const [specialTime, setSpecialTime] = useState('');
  const [specialError, setSpecialError] = useState('');

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
    const automaticSpecialTitle = `${parentTitle.trim()} (Special Episode)`;
    setEditedSpecialEpisodes(specialEpisodes.map((special) => ({
      ...special,
      title: automaticSpecialTitle,
    })));
    setSpecialFormOpen(false);
    setEditingSpecialId(null);
    setSpecialError('');
  }, [isOpen, parentTitle, releaseDates, specialEpisodes]);

  const handleSave = () => {
    const dates = selectedDates.flatMap((date) => {
      const key = dateToKey(date);
      return Array.from({ length: episodeCounts[key] || 1 }, () => key);
    });
    onSave(dates.sort());
    onSpecialEpisodesSave?.(editedSpecialEpisodes);
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

  const openNewSpecialForm = () => {
    const nextNumber = editedSpecialEpisodes.reduce(
      (highest, episode) => Math.max(highest, episode.specialNumber),
      0,
    ) + 1;
    setEditingSpecialId(null);
    setSpecialNumber(nextNumber);
    setSpecialDate('');
    setSpecialTime('');
    setSpecialError('');
    setSpecialFormOpen(true);
  };

  const openEditSpecialForm = (special: SpecialEpisode) => {
    setEditingSpecialId(special.id);
    setSpecialNumber(special.specialNumber);
    setSpecialDate(special.releaseDate);
    setSpecialTime(special.releaseTime || '');
    setSpecialError('');
    setSpecialFormOpen(true);
  };

  const saveSpecial = () => {
    if (!specialDate || specialNumber < 1) {
      setSpecialError('Add a special number and release date.');
      return;
    }
    const duplicateNumber = editedSpecialEpisodes.some(
      (episode) =>
        episode.id !== editingSpecialId && episode.specialNumber === specialNumber,
    );
    if (duplicateNumber) {
      setSpecialError(`Special ${specialNumber} already exists for this season.`);
      return;
    }

    const nextSpecial: SpecialEpisode = {
      id: editingSpecialId || `special_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      specialNumber,
      title: `${parentTitle.trim()} (Special Episode)`,
      releaseDate: specialDate,
      ...(specialTime ? { releaseTime: specialTime } : {}),
      watched: editingSpecialId
        ? editedSpecialEpisodes.find((episode) => episode.id === editingSpecialId)?.watched ?? false
        : false,
    };
    setEditedSpecialEpisodes((current) =>
      editingSpecialId
        ? current.map((episode) => episode.id === editingSpecialId ? nextSpecial : episode)
        : [...current, nextSpecial],
    );
    setSpecialFormOpen(false);
    setEditingSpecialId(null);
  };

  const isSpecialReleased = (special: SpecialEpisode): boolean => {
    const now = new Date();
    const today = dateToKey(now);
    if (special.releaseDate < today) return true;
    if (special.releaseDate > today) return false;
    if (!special.releaseTime) return true;
    const [hours, minutes] = special.releaseTime.split(':').map(Number);
    return now.getHours() * 60 + now.getMinutes() >= hours * 60 + minutes;
  };

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

          {/* Special Episodes */}
          <div className="border-t border-white/[0.08] pt-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Special Episodes</h3>
                <p className="text-[11px] text-[#777] mt-0.5">
                  Specials stay separate from the regular episode count.
                </p>
              </div>
              <button
                type="button"
                onClick={openNewSpecialForm}
                className="inline-flex items-center gap-1 rounded-lg bg-[#E50914]/15 px-2.5 py-1.5 text-xs font-semibold text-[#ff6b75] hover:bg-[#E50914]/25"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Special
              </button>
            </div>

            {specialFormOpen && (
              <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <div className="grid grid-cols-[90px_1fr] gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#888]">Number</label>
                    <input
                      type="number"
                      min={1}
                      value={specialNumber}
                      onChange={(event) => setSpecialNumber(Math.max(1, parseInt(event.target.value) || 1))}
                      className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.06] px-2 text-sm text-white outline-none focus:border-[#E50914]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#888]">Title</label>
                    <div className="flex h-9 items-center rounded-lg border border-white/10 bg-white/[0.03] px-2 text-sm text-[#B3B3B3]">
                      {parentTitle.trim()} (Special Episode)
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#888]">Release date</label>
                    <input
                      type="date"
                      value={specialDate}
                      onChange={(event) => setSpecialDate(event.target.value)}
                      className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.06] px-2 text-xs text-white outline-none [color-scheme:dark] focus:border-[#E50914]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#888]">Release time <span className="text-[#666]">(optional)</span></label>
                    <input
                      type="time"
                      value={specialTime}
                      onChange={(event) => setSpecialTime(event.target.value)}
                      className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.06] px-2 text-xs text-white outline-none [color-scheme:dark] focus:border-[#E50914]"
                    />
                  </div>
                </div>
                {specialError && <p className="text-xs text-red-400">{specialError}</p>}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSpecialFormOpen(false)}
                    className="flex-1 border-white/10 text-[#B3B3B3] hover:bg-white/[0.06]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={saveSpecial}
                    className="flex-1 bg-[#E50914] text-white hover:bg-[#E50914]/90"
                  >
                    {editingSpecialId ? 'Save Special' : 'Add Special'}
                  </Button>
                </div>
              </div>
            )}

            {editedSpecialEpisodes.length === 0 ? (
              <p className="rounded-lg bg-white/[0.03] px-3 py-3 text-center text-xs text-[#666]">
                No special episodes added yet.
              </p>
            ) : (
              <div className="space-y-2">
                {[...editedSpecialEpisodes]
                  .sort((a, b) => a.specialNumber - b.specialNumber)
                  .map((special) => {
                    const released = isSpecialReleased(special);
                    const status = special.watched ? 'Watched' : released ? 'Released' : 'Upcoming';
                    return (
                      <div key={special.id} className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2">
                        <span className="text-base" aria-hidden="true">✨</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-white">
                            Special {special.specialNumber} — {special.title}
                          </p>
                          <p className="text-[10px] text-[#777]">
                            {special.releaseDate}
                            {special.releaseTime ? ` · ${special.releaseTime}` : ''}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${
                          special.watched
                            ? 'bg-green-500/15 text-green-300'
                            : released
                              ? 'bg-blue-500/15 text-blue-300'
                              : 'bg-amber-500/15 text-amber-300'
                        }`}>
                          {status}
                        </span>
                        <button type="button" onClick={() => openEditSpecialForm(special)} className="rounded p-1 text-[#777] hover:bg-white/[0.08] hover:text-white" aria-label={`Edit special ${special.specialNumber}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditedSpecialEpisodes((current) => current.filter((episode) => episode.id !== special.id))}
                          className="rounded p-1 text-[#777] hover:bg-red-500/15 hover:text-red-300"
                          aria-label={`Delete special ${special.specialNumber}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

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