import { useState, useCallback, useEffect } from 'react';
import { CalendarDays, Camera, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApp } from '@/context/AppContext';
import AirDaySelector from './AirDaySelector';
import type { Entry, Status, AirDay, SpecialEpisode } from '@/types';
import EpisodeReleaseCalendar from './EpisodeReleaseCalendar';
import { formatSeasonLabel, isSameEntryIdentity } from '@/lib/entry';

const COUNTRIES = [
  'Thailand', 'Japan', 'South Korea', 'Taiwan', 'China', 'Hong Kong', 'Philippines',
  'Vietnam', 'Singapore', 'Malaysia', 'Indonesia', 'India',
  'US', 'UK', 'Canada', 'Australia', 'Italy', 'Spain', 'France',
  'Germany', 'Netherlands', 'Belgium', 'Argentina', 'Brazil', 'Mexico',
  'Other'
];

interface EditEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (entry: Entry) => void;
  entry?: Entry | null;
}

export default function EditEntryModal({ isOpen, onClose, onSave, entry }: EditEntryModalProps) {
  const { state, dispatch, getOngoingByEntryId } = useApp();

  // Form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'Movie' | 'Series'>('Series');
  const [season, setSeason] = useState<number | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [country, setCountry] = useState('Thailand');
  const [status, setStatus] = useState<Status>('COMPLETE');
  const [posterData, setPosterData] = useState<string | null>(null);
  const [airDays, setAirDays] = useState<AirDay[]>([]);
  const [airTime, setAirTime] = useState('00:00');
  const [currentEp, setCurrentEp] = useState(0);
  const [totalEp, setTotalEp] = useState(1);
  const [releaseDates, setReleaseDates] = useState<string[]>([]);
  const [specialEpisodes, setSpecialEpisodes] = useState<SpecialEpisode[]>([]);
  const [releaseCalendarOpen, setReleaseCalendarOpen] = useState(false);
  const [plannedDate, setPlannedDate] = useState('');
  const [error, setError] = useState('');

  const ongoing = entry ? getOngoingByEntryId(entry.id) : null;

  // Reset form whenever entry changes or modal opens/closes
  const resetForm = useCallback(() => {
    if (entry) {
      setTitle(entry.title);
      setType(entry.type);
      setSeason(entry.season ?? null);
      setYear(entry.year);
      setCountry(entry.country.replace(/\s*\p{Emoji}\s*/gu, '').trim());
      setStatus(entry.status);
      setPosterData(entry.poster);
      setPlannedDate(entry.plannedDate || '');
      if (ongoing) {
        setAirDays(ongoing.airDays as AirDay[]);
        setAirTime(ongoing.airTime || '00:00');
        setCurrentEp(ongoing.currentEpisode);
        setTotalEp(ongoing.releaseDates?.length || 1);
        setReleaseDates(ongoing.releaseDates || []);
        setSpecialEpisodes(ongoing.specialEpisodes || []);
      } else {
        setAirDays([]);
        setAirTime('00:00');
        setCurrentEp(0);
        setTotalEp(1);
        setReleaseDates([]);
        setSpecialEpisodes([]);
      }
    } else {
      setTitle('');
      setType('Series');
      setSeason(null);
      setYear(new Date().getFullYear());
      setCountry('Thailand');
      setStatus('COMPLETE');
      setPosterData(null);
      setPlannedDate('');
      setAirDays([]);
      setAirTime('00:00');
      setCurrentEp(0);
      setTotalEp(1);
      setReleaseDates([]);
      setSpecialEpisodes([]);
    }
    setError('');
  }, [entry, ongoing]);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  const handlePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPosterData(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleReleaseDatesSave = (dates: string[]) => {
    setReleaseDates(dates);
    setTotalEp(Math.max(1, dates.length));
  };

  const handleSpecialEpisodesSave = (episodes: SpecialEpisode[]) => {
    setSpecialEpisodes(episodes);
  };

  const handleSave = () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    const duplicateSeason = state.entries.some((existing) =>
      existing.id !== entry?.id &&
      isSameEntryIdentity(existing, { title, type, season }),
    );
    if (duplicateSeason) {
      setError(`An entry for ${title.trim()} — ${formatSeasonLabel(season)} already exists.`);
      return;
    }
    setError('');

    const newEntry: Entry = {
      id: entry?.id || `bl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      type,
      ...(season !== null ? { season } : {}),
      year,
      country,
      status,
      poster: posterData,
      createdAt: entry?.createdAt || Date.now(),
      lastUpdatedAt: entry?.lastUpdatedAt || entry?.createdAt || Date.now(),
      ...(status === 'PLANNED' && plannedDate ? { plannedDate } : {}),
    };

    if (onSave) {
      onSave(newEntry);
    } else {
      if (entry) {
        dispatch({ type: 'UPDATE_ENTRY', payload: newEntry });
      } else {
        dispatch({ type: 'ADD_ENTRY', payload: newEntry });
      }
    }

    if (status === 'ONGOING') {
      dispatch({
        type: 'UPDATE_ONGOING',
        payload: {
          entryId: newEntry.id,
          currentEpisode: currentEp,
          totalEpisodes: totalEp,
            airDays: airDays.length > 0 ? airDays : ['Monday'] as AirDay[],
            airTime,
            trackingMode: releaseDates.length > 0 ? 'calendar' : (ongoing?.trackingMode || 'recurring'),
            releaseDates,
           specialEpisodes,
        }
      });
    }

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#141414] border-white/10 text-white max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {entry ? 'Edit Entry' : 'Add New Entry'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Poster Upload */}
          <div className="flex justify-center">
            <div
              className="relative w-[120px] h-[160px] mx-auto rounded-lg border-2 border-dashed border-white/15 flex flex-col items-center justify-center cursor-pointer hover:border-[#E50914]/50 transition-colors overflow-hidden"
              onClick={() => document.getElementById('edit-poster-upload')?.click()}
            >
              {posterData ? (
                <>
                  <img src={posterData} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </>
              ) : (
                <>
                  <Camera className="w-8 h-8 text-[#B3B3B3] mb-2" />
                  <span className="text-[13px] text-[#B3B3B3] text-center px-2">Tap to upload poster</span>
                </>
              )}
              <input
                id="edit-poster-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePosterUpload}
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-[#B3B3B3]">Title</Label>
            <Input
              value={title}
              onChange={e => { setTitle(e.target.value); setError(''); }}
              placeholder="Enter title..."
              className={`bg-white/[0.06] border-white/10 text-white placeholder-[#666] focus:border-[#E50914] ${error ? 'border-red-500' : ''}`}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>

          {/* Type & Year */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[#B3B3B3]">Type</Label>
              <div className="flex gap-2">
                {(['Series', 'Movie'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      type === t
                        ? "bg-[#E50914] text-white"
                        : "bg-white/[0.06] text-[#B3B3B3] hover:bg-white/[0.1]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[#B3B3B3]">Year</Label>
              <Input
                type="number"
                value={year}
                onChange={e => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                min={1980}
                max={2030}
                className="bg-white/[0.06] border-white/10 text-white focus:border-[#E50914]"
              />
            </div>
          </div>

          {/* Season */}
          <div className="space-y-2">
            <Label className="text-[#B3B3B3]">Season</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSeason(null)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  season === null
                    ? 'bg-[#E50914] text-white'
                    : 'bg-white/[0.06] text-[#B3B3B3] hover:bg-white/[0.1]'
                }`}
              >
                Standalone
              </button>
              <button
                type="button"
                onClick={() => setSeason(season ?? 1)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  season !== null
                    ? 'bg-[#E50914] text-white'
                    : 'bg-white/[0.06] text-[#B3B3B3] hover:bg-white/[0.1]'
                }`}
              >
                Season
              </button>
            </div>
            {season !== null && (
              <Input
                type="number"
                value={season}
                onChange={e => setSeason(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                max={999}
                className="bg-white/[0.06] border-white/10 text-white focus:border-[#E50914]"
                aria-label="Season number"
              />
            )}
            <p className="text-[10px] text-[#666]">
              Keep each season as its own entry with its own poster, progress, and evaluation.
            </p>
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label className="text-[#B3B3B3]">Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="bg-white/[0.06] border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10 max-h-60">
                {COUNTRIES.map(c => (
                  <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-[#B3B3B3]">Status</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['COMPLETE', 'ONGOING', 'DROPPED', 'PLANNED'] as Status[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                    status === s ? 'bg-[#E50914] text-white' : 'bg-white/[0.06] text-[#888] hover:bg-white/[0.1]'
                  }`}
                >
                  {s === 'COMPLETE' ? 'Completed' : s === 'ONGOING' ? 'Ongoing' : s === 'DROPPED' ? 'Dropped' : 'Planned'}
                </button>
              ))}
            </div>
          </div>

          {/* Planned Date */}
          {status === 'PLANNED' && (
            <div className="space-y-3 bg-white/[0.04] rounded-xl p-4">
              <div>
                <label className="text-sm font-medium text-[#B3B3B3]">
                  Release Date <span className="text-[#666] text-xs">(optional)</span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                  className="flex-1 h-9 bg-white/[0.06] border border-white/10 rounded-lg px-3 text-sm text-white focus:border-[#E50914] outline-none [color-scheme:dark]"
                />
                {plannedDate && (
                  <button
                    onClick={() => setPlannedDate('')}
                    className="text-[#666] hover:text-[#B3B3B3] transition-colors tap-active"
                    aria-label="Clear date"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-[#666]">Links to Release Calendar in Ongoing BL tab</p>
            </div>
          )}

          {/* Ongoing Air Days & Episodes */}
          {status === 'ONGOING' && (
            <div className="space-y-3 bg-white/[0.04] rounded-xl p-4">
              <div className="space-y-2">
                <Label className="text-[#B3B3B3]">Air Days</Label>
                <AirDaySelector value={airDays} onChange={setAirDays} />
                <p className="text-[10px] text-[#666]">Set airing weekdays here. The Ongoing tab shows these days without editing.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-[#B3B3B3]">Airing Time</Label>
                <Input
                  type="time"
                  value={airTime}
                  onChange={e => setAirTime(e.target.value)}
                  className="bg-white/[0.06] border-white/10 text-white [color-scheme:dark]"
                />
                <p className="text-[10px] text-[#666]">Latest aired and Final EP use this local time.</p>
              </div>
              <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setReleaseCalendarOpen(true)}
                    className="w-full flex items-center justify-between gap-3 rounded-lg bg-white/[0.06] border border-white/10 px-3 py-2.5 text-left hover:bg-white/[0.1] transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-[#E50914]" />
                      <span className="text-sm text-white">Edit episode release dates</span>
                    </span>
                    <span className="text-xs text-[#B3B3B3]">
                      {releaseDates.length} episode{releaseDates.length === 1 ? '' : 's'}
                    </span>
                  </button>
                <p className="text-[10px] text-[#666]">
                  Select release days and set how many episodes air on each day.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] text-[#666]">Watched Episode</Label>
                  <Input
                    type="number"
                    value={currentEp}
                    onChange={e => setCurrentEp(parseInt(e.target.value) || 0)}
                    className="bg-white/[0.06] border-white/10 text-white"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-[#666]">Total Episodes</Label>
                    <Input
                    type="number"
                    value={totalEp}
                      readOnly
                      disabled
                      className="bg-white/[0.04] border-white/10 text-[#888] cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          )}

          <EpisodeReleaseCalendar
            isOpen={releaseCalendarOpen}
            onClose={() => setReleaseCalendarOpen(false)}
            parentTitle={title}
            releaseDates={releaseDates}
            onSave={handleReleaseDatesSave}
            specialEpisodes={specialEpisodes}
            onSpecialEpisodesSave={handleSpecialEpisodesSave}
          />

          {/* Cancel & Save Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-white/10 text-[#B3B3B3] hover:bg-white/[0.06]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!title.trim()}
              className="flex-1 bg-[#E50914] hover:bg-[#E50914]/90 text-white font-semibold"
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
