import { useState, useCallback, useEffect } from 'react';
import { CalendarDays, Camera, Check, ChevronsUpDown } from 'lucide-react';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import GenreChip from './GenreChip';
import AirDaySelector from './AirDaySelector';
import type { Entry, Status, AirDay, LinkedReleaseMode, EntryRelationshipType } from '@/types';
import EpisodeReleaseCalendar from './EpisodeReleaseCalendar';
import { isSameEntryIdentity } from '@/lib/entry';

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
  const [relationshipType, setRelationshipType] = useState<EntryRelationshipType>('original');
  const [season, setSeason] = useState<number | null>(null);
  const [specialNumber, setSpecialNumber] = useState(1);
  const [parentEntryId, setParentEntryId] = useState('');
  const [linkedReleaseMode, setLinkedReleaseMode] = useState<LinkedReleaseMode>('independent');
  const [year, setYear] = useState(new Date().getFullYear());
  const [country, setCountry] = useState('Thailand');
  const [status, setStatus] = useState<Status>('COMPLETE');
  const [posterData, setPosterData] = useState<string | null>(null);
  const [airDays, setAirDays] = useState<AirDay[]>([]);
  const [airTime, setAirTime] = useState('00:00');
  const [currentEp, setCurrentEp] = useState(0);
  const [totalEp, setTotalEp] = useState(1);
  const [releaseDates, setReleaseDates] = useState<string[]>([]);
  const [plannedTime, setPlannedTime] = useState('');
  const [releaseCalendarOpen, setReleaseCalendarOpen] = useState(false);
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const [parentSearchTerm, setParentSearchTerm] = useState('');
  const [genrePickerOpen, setGenrePickerOpen] = useState(false);
  const [genreSearchTerm, setGenreSearchTerm] = useState('');
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [plannedDate, setPlannedDate] = useState('');
  const [error, setError] = useState('');

  const ongoing = entry ? getOngoingByEntryId(entry.id) : null;
  const selectedParentEntry = state.entries.find((candidate) => candidate.id === parentEntryId);
  const availableParentEntries = state.entries
    .filter((candidate) => candidate.id !== entry?.id && !candidate.parentEntryId)
    .sort((a, b) => a.title.localeCompare(b.title));
  const normalizedParentSearch = parentSearchTerm.trim().toLocaleLowerCase();
  const filteredParentEntries = availableParentEntries
    .filter((candidate) =>
      `${candidate.title} ${candidate.year} ${candidate.country} ${candidate.type}`
        .toLocaleLowerCase()
        .includes(normalizedParentSearch),
    )
    .slice(0, 50);
  const selectedGenreTags = state.genreTags.filter((tag) => selectedGenreIds.includes(tag.id));
  const normalizedGenreSearch = genreSearchTerm.trim().toLocaleLowerCase();
  const filteredGenreTags = state.genreTags
    .filter((tag) =>
      `${tag.name} ${tag.category}`.toLocaleLowerCase().includes(normalizedGenreSearch),
    )
    .slice(0, 60);

  // Reset form whenever entry changes or modal opens/closes
  const resetForm = useCallback(() => {
    setParentPickerOpen(false);
    setParentSearchTerm('');
    setGenrePickerOpen(false);
    setGenreSearchTerm('');
    if (entry) {
      setTitle(entry.title);
      setType(entry.type);
      setRelationshipType(entry.relationshipType
        || (entry.parentEntryId ? (entry.season == null ? 'continuation' : 'season') : (entry.season == null ? 'original' : 'season')));
      setSeason(entry.season ?? null);
      setSpecialNumber(entry.specialNumber ?? 1);
      setParentEntryId(entry.parentEntryId || '');
      setLinkedReleaseMode(entry.linkedReleaseMode || 'independent');
      setYear(entry.year);
      setCountry(entry.country.replace(/\s*\p{Emoji}\s*/gu, '').trim());
      setStatus(entry.status);
      setPosterData(entry.poster);
      setPlannedDate(entry.plannedDate || '');
      setPlannedTime(entry.plannedTime || '');
      setSelectedGenreIds(entry.genres || []);
      if (ongoing) {
        setAirDays(ongoing.airDays as AirDay[]);
        setAirTime(ongoing.airTime || '00:00');
        setCurrentEp(ongoing.currentEpisode);
        setTotalEp(ongoing.releaseDates?.length || 1);
        setReleaseDates(ongoing.releaseDates || []);
      } else {
        setAirDays([]);
        setAirTime('00:00');
        setCurrentEp(0);
        setTotalEp(1);
        setReleaseDates([]);
      }
    } else {
      setTitle('');
      setType('Series');
      setRelationshipType('original');
      setSeason(null);
      setSpecialNumber(1);
      setParentEntryId('');
      setLinkedReleaseMode('independent');
      setYear(new Date().getFullYear());
      setCountry('Thailand');
      setStatus('COMPLETE');
      setPosterData(null);
      setPlannedDate('');
      setPlannedTime('');
      setSelectedGenreIds([]);
      setAirDays([]);
      setAirTime('00:00');
      setCurrentEp(0);
      setTotalEp(1);
      setReleaseDates([]);
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

  const handleSave = () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    const selectedParent = parentEntryId
      ? state.entries.find((existing) => existing.id === parentEntryId && existing.id !== entry?.id && !existing.parentEntryId)
      : undefined;
    if (parentEntryId && !selectedParent) {
      setError('Choose an existing top-level entry as the parent.');
      return;
    }
    const includedReleaseHasRankings = linkedReleaseMode === 'included'
      && (state.favorites.some((favorite) => favorite.entryId === entry?.id)
        || state.ratings.some((rating) => rating.entryId === entry?.id)
        || state.top10Drawers.some((drawer) => drawer.entries.some((item) => item.entryId === entry?.id)));
    if (parentEntryId && includedReleaseHasRankings) {
      setError('Remove this entry from Favorites, ratings, and Top 10 before marking it as part of the parent.');
      return;
    }
    const duplicateSeason = state.entries.some((existing) =>
      existing.id !== entry?.id &&
      isSameEntryIdentity(existing, {
        title,
        type,
        year,
        country,
        season: relationshipType === 'season' ? season ?? undefined : undefined,
        specialNumber: relationshipType === 'specialEpisode' ? specialNumber ?? undefined : undefined,
        parentEntryId: selectedParent?.id,
        relationshipType: selectedParent
          ? relationshipType === 'original' ? 'continuation' : relationshipType
          : relationshipType === 'season' ? 'season' : 'original',
      }),
    );
    if (duplicateSeason) {
      setError(`An entry with this title, year, country, and relationship already exists.`);
      return;
    }
    setError('');
    const savedRelationshipType: EntryRelationshipType = selectedParent
      ? relationshipType === 'original' ? 'continuation' : relationshipType
      : relationshipType === 'season' ? 'season' : 'original';
    const savedSeason = savedRelationshipType === 'season' ? season ?? 1 : undefined;

    const newEntry: Entry = {
      id: entry?.id || `bl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      type,
      relationshipType: savedRelationshipType,
      ...(savedSeason !== undefined ? { season: savedSeason } : {}),
      ...(savedRelationshipType === 'specialEpisode' ? { specialNumber: Math.max(1, specialNumber) } : {}),
      ...(selectedParent
        ? { parentEntryId: selectedParent.id, linkedReleaseMode }
        : {}),
      year,
      country,
      status,
      poster: posterData,
      genres: [...selectedGenreIds],
      createdAt: entry?.createdAt || Date.now(),
      lastUpdatedAt: entry?.lastUpdatedAt || entry?.createdAt || Date.now(),
      ...(entry?.episodeRatings ? { episodeRatings: entry.episodeRatings } : {}),
      ...(plannedDate && (status === 'PLANNED' || savedRelationshipType === 'specialEpisode') ? { plannedDate } : {}),
      ...(plannedTime ? { plannedTime } : {}),
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
          currentEpisode: savedRelationshipType === 'specialEpisode' ? Math.min(currentEp, 1) : currentEp,
          totalEpisodes: savedRelationshipType === 'specialEpisode' ? 1 : totalEp,
            airDays: airDays.length > 0 ? airDays : ['Monday'] as AirDay[],
            airTime: savedRelationshipType === 'specialEpisode' && plannedTime ? plannedTime : airTime,
            trackingMode: (savedRelationshipType === 'specialEpisode' && (plannedDate || releaseDates.length > 0))
              || releaseDates.length > 0
              ? 'calendar'
              : (ongoing?.trackingMode || 'recurring'),
            releaseDates: savedRelationshipType === 'specialEpisode'
              ? plannedDate ? [plannedDate] : releaseDates.slice(0, 1)
              : releaseDates,
            specialEpisodes: [],
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

          {/* Genre tags */}
          <div className="space-y-2">
            <Label className="text-[#B3B3B3]">Genres</Label>
            <Popover
              open={genrePickerOpen}
              onOpenChange={(open) => {
                setGenrePickerOpen(open);
                if (!open) setGenreSearchTerm('');
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={genrePickerOpen}
                  className="h-10 w-full justify-between border-white/10 bg-white/[0.06] text-left font-normal text-white hover:bg-white/[0.1]"
                >
                  <span className="truncate">
                    {selectedGenreTags.length
                      ? `${selectedGenreTags.length} genre${selectedGenreTags.length === 1 ? '' : 's'} selected`
                      : 'Search and select genres...'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-[#888]" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[min(24rem,calc(100vw-3rem))] border-white/10 bg-[#1a1a1a] p-0"
              >
                <Command shouldFilter={false} className="bg-transparent text-white">
                  <CommandInput
                    value={genreSearchTerm}
                    onValueChange={setGenreSearchTerm}
                    placeholder="Search genre or category..."
                    className="text-white placeholder:text-[#777]"
                  />
                  <CommandList className="max-h-60">
                    <CommandEmpty className="text-[#999]">
                      {state.genreTags.length === 0 ? 'No genres have been added yet.' : 'No matches.'}
                    </CommandEmpty>
                    <CommandGroup>
                      {filteredGenreTags.map((tag) => {
                        const selected = selectedGenreIds.includes(tag.id);
                        return (
                          <CommandItem
                            key={tag.id}
                            value={tag.id}
                            onSelect={() => {
                              setSelectedGenreIds((current) =>
                                selected
                                  ? current.filter((id) => id !== tag.id)
                                  : [...current, tag.id],
                              );
                            }}
                            className="cursor-pointer text-white data-[selected=true]:bg-white/10 data-[selected=true]:text-white"
                          >
                            <Check className={`h-4 w-4 ${selected ? 'opacity-100' : 'opacity-0'}`} />
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                            <span className="max-w-[45%] truncate text-[10px] text-[#888]">{tag.category}</span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedGenreTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedGenreTags.map((tag) => (
                  <GenreChip
                    key={tag.id}
                    tag={tag}
                    onRemove={() => setSelectedGenreIds((current) => current.filter((id) => id !== tag.id))}
                  />
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-[#666]">Choose multiple genres; entries can appear in more than one genre list.</p>
            )}
          </div>

          {/* Parent and relationship */}
          <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
            <Label className="text-[#B3B3B3]">Related entry</Label>
            <div className="space-y-2">
              <Popover
                open={parentPickerOpen}
                onOpenChange={(open) => {
                  setParentPickerOpen(open);
                  if (!open) setParentSearchTerm('');
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={parentPickerOpen}
                    className="h-10 w-full justify-between border-white/10 bg-white/[0.06] text-left font-normal text-white hover:bg-white/[0.1]"
                  >
                    <span className="truncate">
                      {selectedParentEntry
                        ? `${selectedParentEntry.title} · ${selectedParentEntry.year} · ${selectedParentEntry.country}`
                        : 'Search by title, year, country, or type...'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-[#888]" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-[min(24rem,calc(100vw-3rem))] border-white/10 bg-[#1a1a1a] p-0"
                >
                  <Command shouldFilter={false} className="bg-transparent text-white">
                    <CommandInput
                      value={parentSearchTerm}
                      onValueChange={setParentSearchTerm}
                      placeholder="Search title, year, country, or type..."
                      className="text-white placeholder:text-[#777]"
                    />
                    <CommandList className="max-h-60">
                      <CommandEmpty className="text-[#999]">
                        {availableParentEntries.length === 0
                          ? 'No top-level entries available to link.'
                          : 'No matches. Try another title or year.'}
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredParentEntries.map((candidate) => (
                          <CommandItem
                            key={candidate.id}
                            value={candidate.id}
                            onSelect={() => {
                              setParentEntryId(candidate.id);
                              setRelationshipType((current) => current === 'original' ? 'continuation' : current);
                              setParentPickerOpen(false);
                              setParentSearchTerm('');
                              setError('');
                            }}
                            className="cursor-pointer text-white data-[selected=true]:bg-white/10 data-[selected=true]:text-white"
                          >
                            <Check className={`h-4 w-4 ${parentEntryId === candidate.id ? 'opacity-100' : 'opacity-0'}`} />
                            <span className="min-w-0 flex-1 truncate">
                              {candidate.title} · {candidate.year} · {candidate.country}
                            </span>
                            <span className="text-[10px] text-[#999]">{candidate.type}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedParentEntry && (
                <button
                  type="button"
                  onClick={() => {
                    setParentEntryId('');
                    setRelationshipType(season === null ? 'original' : 'season');
                    setLinkedReleaseMode('independent');
                    setError('');
                  }}
                  className="text-[11px] text-[#999] underline underline-offset-2 hover:text-white"
                >
                  Clear linked series
                </button>
              )}
            </div>
            {!parentEntryId ? (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-[#888]">Standalone (Original)</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRelationshipType('original');
                      setSeason(null);
                    }}
                    className={`flex-1 rounded-lg border px-2.5 py-2 text-xs transition-colors ${
                      relationshipType === 'original'
                        ? 'border-[#E50914]/50 bg-[#E50914]/10 text-white'
                        : 'border-white/10 bg-white/[0.03] text-[#999]'
                    }`}
                  >
                    Original
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRelationshipType('season');
                      setSeason(season ?? 1);
                    }}
                    className={`flex-1 rounded-lg border px-2.5 py-2 text-xs transition-colors ${
                      relationshipType === 'season'
                        ? 'border-[#E50914]/50 bg-[#E50914]/10 text-white'
                        : 'border-white/10 bg-white/[0.03] text-[#999]'
                    }`}
                  >
                    Season
                  </button>
                </div>
                {relationshipType === 'season' && (
                  <Input
                    type="number"
                    value={season ?? 1}
                    onChange={(event) => setSeason(Math.max(1, parseInt(event.target.value) || 1))}
                    min={1}
                    max={999}
                    className="bg-white/[0.06] border-white/10 text-white focus:border-[#E50914]"
                    aria-label="Season number"
                  />
                )}
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <Label className="text-[11px] text-[#888]">Relationship</Label>
                <Select
                  value={relationshipType === 'original' ? 'continuation' : relationshipType}
                  onValueChange={(value) => {
                    const nextType = value as EntryRelationshipType;
                    if (nextType === 'original') {
                      setParentEntryId('');
                      setLinkedReleaseMode('independent');
                      setSeason(null);
                      setRelationshipType('original');
                      return;
                    }
                    setRelationshipType(nextType);
                    if (nextType === 'specialEpisode') {
                      setLinkedReleaseMode('included');
                    }
                    if (nextType === 'season') setSeason(season ?? 1);
                    else setSeason(null);
                  }}
                >
                  <SelectTrigger className="h-9 border-white/10 bg-white/[0.06] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#1a1a1a] text-white">
                    <SelectItem value="original">Standalone (Original)</SelectItem>
                    <SelectItem value="continuation">Continuation</SelectItem>
                    <SelectItem value="specialEpisode">Special Episode</SelectItem>
                    <SelectItem value="season">Season</SelectItem>
                    <SelectItem value="spinOff">Spin-off</SelectItem>
                    <SelectItem value="sideStory">Side Story</SelectItem>
                  </SelectContent>
                </Select>
                {relationshipType === 'season' && (
                  <Input
                    type="number"
                    value={season ?? 1}
                    onChange={(event) => setSeason(Math.max(1, parseInt(event.target.value) || 1))}
                    min={1}
                    max={999}
                    className="bg-white/[0.06] border-white/10 text-white focus:border-[#E50914]"
                    aria-label="Season number"
                  />
                )}
                {relationshipType === 'specialEpisode' && (
                  <Input
                    type="number"
                    value={specialNumber}
                    onChange={(event) => setSpecialNumber(Math.max(1, parseInt(event.target.value) || 1))}
                    min={1}
                    max={999}
                    className="bg-white/[0.06] border-white/10 text-white focus:border-[#E50914]"
                    aria-label="Special episode number"
                  />
                )}
                <p className="text-[11px] text-[#888]">Rating eligibility</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLinkedReleaseMode('independent')}
                    className={`flex-1 rounded-lg border p-2 text-left transition-colors ${
                      linkedReleaseMode === 'independent'
                        ? 'border-[#E50914]/50 bg-[#E50914]/10'
                        : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <span className="block text-xs font-semibold text-white">Separate</span>
                    <span className="mt-0.5 block text-[10px] text-[#999]">Own favorite and ranking.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkedReleaseMode('included')}
                    className={`flex-1 rounded-lg border p-2 text-left transition-colors ${
                      linkedReleaseMode === 'included'
                        ? 'border-[#E50914]/50 bg-[#E50914]/10'
                        : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <span className="block text-xs font-semibold text-white">Part of parent</span>
                    <span className="mt-0.5 block text-[10px] text-[#999]">No separate ranking.</span>
                  </button>
                </div>
              </div>
            )}
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
          {(status === 'PLANNED' || relationshipType === 'specialEpisode') && (
            <div className="space-y-3 bg-white/[0.04] rounded-xl p-4">
              <div>
                <label className="text-sm font-medium text-[#B3B3B3]">
                  Release Date <span className="text-[#666] text-xs">(optional)</span>
                </label>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  type="date"
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                  className="h-9 min-w-0 bg-white/[0.06] border border-white/10 rounded-lg px-3 text-sm text-white focus:border-[#E50914] outline-none [color-scheme:dark]"
                />
                <input
                  type="time"
                  value={plannedTime}
                  onChange={(e) => setPlannedTime(e.target.value)}
                  className="h-9 w-28 bg-white/[0.06] border border-white/10 rounded-lg px-2 text-sm text-white focus:border-[#E50914] outline-none [color-scheme:dark]"
                  aria-label="Release time"
                />
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
