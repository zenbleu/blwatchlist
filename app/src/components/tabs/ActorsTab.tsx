import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowUpDown,
  CalendarDays,
  ChevronDown,
  Edit3,
  Heart,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { Actor, ActorCredit, ActorRole, Entry } from '@/types';
import Poster from '../Poster';
import RatingTierBadge from '../RatingTierBadge';
import { formatRating, getEpisodeAverage } from '@/lib/rating';
import { formatSeasonLabel } from '@/lib/entry';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const NATIONALITIES = [
  'Thai',
  'Chinese',
  'Korean',
  'Japanese',
  'Taiwanese',
  'Filipino',
  'Vietnamese',
  'Other',
];

type SortOption = 'nameAsc' | 'nameDesc' | 'filmography' | 'older' | 'younger';
type RoleFilter = 'ALL' | ActorRole;

const fieldClass = 'mt-1 h-10 border-white/10 bg-white/[0.04] text-white placeholder:text-[#666]';

function ageFromBirthDate(birthDate: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday = now.getMonth() < birth.getMonth()
    || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}

function actorId() {
  return `actor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function ActorAvatar({
  actor,
  size = 'md',
}: {
  actor: Pick<Actor, 'photo' | 'name'>;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = {
    sm: 'h-11 w-11',
    md: 'h-24 w-24 sm:h-28 sm:w-28',
    lg: 'h-32 w-32 sm:h-40 sm:w-40',
  };
  return (
    <div className={`${sizes[size]} shrink-0 overflow-hidden rounded-full border-2 border-white/10 bg-[#1a1a1a]`}>
      {actor.photo ? (
        <img src={actor.photo} alt={actor.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <UserRound className={`${size === 'sm' ? 'h-5 w-5' : 'h-10 w-10'} text-[#555]`} />
        </div>
      )}
    </div>
  );
}

function ActorForm({
  actor,
  onSave,
  onCancel,
}: {
  actor: Actor | null;
  onSave: (actor: Actor) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Actor>(() => actor ?? {
    id: actorId(),
    photo: null,
    name: '',
    nationality: 'Thai',
    birthDate: '',
    filmography: [],
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const age = ageFromBirthDate(draft.birthDate);

  const update = <K extends keyof Actor>(key: K, value: Actor[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handlePhoto = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => update('photo', typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative"
          aria-label="Choose actor profile photo"
        >
          <ActorAvatar actor={draft} size="lg" />
          <span className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#E50914] text-white shadow-lg transition-transform group-hover:scale-105">
            <ImagePlus className="h-4 w-4" />
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handlePhoto(event.target.files?.[0])}
        />
        <p className="text-[11px] text-[#777]">Add a profile photo from your device</p>
      </div>

      <label className="block text-xs font-medium text-[#B3B3B3]">
        Full name
        <Input
          autoFocus
          value={draft.name}
          onChange={(event) => update('name', event.target.value)}
          placeholder="Actor name"
          className={fieldClass}
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-xs font-medium text-[#B3B3B3]">
          Nationality
          <select
            value={NATIONALITIES.includes(draft.nationality) ? draft.nationality : 'Other'}
            onChange={(event) => update('nationality', event.target.value)}
            className={`w-full rounded-md border px-3 text-sm outline-none focus:border-[#E50914] ${fieldClass}`}
          >
            {NATIONALITIES.map((nationality) => <option key={nationality} value={nationality}>{nationality}</option>)}
          </select>
          {(!NATIONALITIES.includes(draft.nationality) || draft.nationality === 'Other') && (
            <Input
              value={NATIONALITIES.includes(draft.nationality) ? '' : draft.nationality}
              onChange={(event) => update('nationality', event.target.value || 'Other')}
              placeholder="Please specify"
              className={fieldClass}
            />
          )}
        </label>
        <label className="block text-xs font-medium text-[#B3B3B3]">
          Birth date
          <div className="relative">
            <Input
              type="date"
              value={draft.birthDate}
              onChange={(event) => update('birthDate', event.target.value)}
              className={fieldClass}
            />
            <CalendarDays className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[#777]" />
          </div>
          <span className="mt-1 block text-[11px] text-[#666]">{age === null ? 'Age calculates automatically' : `${age} years old`}</span>
        </label>
      </div>

      <div className="flex justify-end gap-2 border-t border-white/[0.08] pt-4">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-[#B3B3B3] hover:bg-white/[0.06]">Cancel</button>
        <button
          type="button"
          disabled={!draft.name.trim()}
          onClick={() => onSave({ ...draft, name: draft.name.trim(), nationality: draft.nationality.trim() || 'Other' })}
          className="rounded-lg bg-[#E50914] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {actor ? 'Save changes' : 'Add actor'}
        </button>
      </div>
    </div>
  );
}

function CreditEditor({
  entry,
  credit,
  onSave,
}: {
  entry: Entry;
  credit: ActorCredit;
  onSave: (credit: ActorCredit) => void;
}) {
  const [character, setCharacter] = useState(credit.character);
  const [role, setRole] = useState<ActorRole>(credit.role);
  const [isEditing, setIsEditing] = useState(false);
  const changed = character !== credit.character || role !== credit.role;

  if (!isEditing) {
    return (
      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-black/20 p-3">
        <div className="min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <span className="truncate text-[#B3B3B3]">
            <span className="text-[#666]">Character:</span> {credit.character || 'Character not set'}
          </span>
          <span className={`rounded-full px-2 py-1 ${credit.role === 'MAIN' ? 'bg-[#E50914]/15 text-[#ff6970]' : 'bg-white/[0.08] text-[#aaa]'}`}>
            {credit.role === 'MAIN' ? 'Main Role' : 'Supporting Role'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="shrink-0 rounded-md p-2 text-[#777] hover:bg-white/[0.08] hover:text-white"
          aria-label={`Edit character and role for ${entry.title}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 grid gap-2 rounded-xl border border-white/[0.08] bg-black/20 p-3 sm:grid-cols-[1fr_150px_auto] sm:items-end">
      <label className="text-[11px] font-medium text-[#888]">
        Character name
        <Input value={character} onChange={(event) => setCharacter(event.target.value)} placeholder="Character" className={fieldClass} />
      </label>
      <label className="text-[11px] font-medium text-[#888]">
        Role
        <select value={role} onChange={(event) => setRole(event.target.value as ActorRole)} className={`w-full rounded-md border px-3 text-sm outline-none ${fieldClass}`}>
          <option value="MAIN">Main Role</option>
          <option value="SUPPORTING">Supporting Role</option>
        </select>
      </label>
      <button
        type="button"
        disabled={!changed}
        onClick={() => {
          onSave({ entryId: entry.id, character: character.trim(), role });
          setIsEditing(false);
        }}
        className="flex h-10 items-center justify-center gap-1 rounded-md bg-white/[0.08] px-3 text-xs font-semibold text-white disabled:opacity-30"
      >
        <Pencil className="h-3.5 w-3.5" /> Save
      </button>
    </div>
  );
}

function FilmographyRow({
  entry,
  credit,
  rating,
  favorite,
  top10,
  onSaveCredit,
}: {
  entry: Entry;
  credit: ActorCredit;
  rating: ReturnType<typeof useApp>['state']['ratings'][number] | undefined;
  favorite: boolean;
  top10: { year: number; rank: number } | null;
  onSaveCredit: (credit: ActorCredit) => void;
}) {
  const episodeRating = getEpisodeAverage(entry.episodeRatings);
  const overallRating = rating?.overallRating || episodeRating;
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#141414] p-3 sm:p-4">
      <div className="flex gap-3">
        <Poster src={entry.poster} title={entry.title} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-white">{entry.title}</h3>
              <p className="mt-1 text-[11px] text-[#777]">{entry.year} · {entry.country}{entry.season != null ? ` · ${formatSeasonLabel(entry.season)}` : ''}</p>
            </div>
            <span className={`rounded-full px-2 py-1 text-[10px] ${entry.status === 'COMPLETE' ? 'bg-emerald-500/15 text-emerald-400' : entry.status === 'ONGOING' ? 'bg-amber-500/15 text-amber-400' : 'bg-white/[0.08] text-[#999]'}`}>
              {entry.status === 'COMPLETE' ? 'Completed' : entry.status[0] + entry.status.slice(1).toLowerCase()}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#999]">
            <span className={`rounded-full px-2 py-1 ${credit.role === 'MAIN' ? 'bg-[#E50914]/15 text-[#ff6970]' : 'bg-white/[0.08] text-[#aaa]'}`}>{credit.role === 'MAIN' ? 'Main Role' : 'Supporting Role'}</span>
            <span className="truncate">as {credit.character || 'Character not set'}</span>
            {overallRating ? <span className="inline-flex items-center gap-1 text-yellow-400"><Star className="h-3 w-3 fill-current" /> {formatRating(overallRating)}</span> : null}
            {favorite && <Heart className="h-3.5 w-3.5 fill-[#E50914] text-[#E50914]" aria-label="Favorite" />}
            {top10 && <span className="font-bold text-[#E50914]">Top 10 #{top10.rank}</span>}
            <RatingTierBadge rating={rating} compact />
          </div>
        </div>
      </div>
      <CreditEditor entry={entry} credit={credit} onSave={onSaveCredit} />
    </div>
  );
}

function ActorDetail({
  actor,
  onBack,
  onEdit,
}: {
  actor: Actor;
  onBack: () => void;
  onEdit: () => void;
}) {
  const { state, dispatch, isFavorited, isInTop10 } = useApp();
  const [addingEntryId, setAddingEntryId] = useState('');
  const [entrySearch, setEntrySearch] = useState('');
  const [entryPickerOpen, setEntryPickerOpen] = useState(false);
  const [addingRole, setAddingRole] = useState<ActorRole>('MAIN');
  const [addingCharacter, setAddingCharacter] = useState('');
  const credits = actor.filmography
    .map((credit) => ({ credit, entry: state.entries.find((entry) => entry.id === credit.entryId) }))
    .filter((item): item is { credit: ActorCredit; entry: Entry } => Boolean(item.entry));
  const series = credits.filter(({ entry }) => entry.type === 'Series');
  const movies = credits.filter(({ entry }) => entry.type === 'Movie');
  const age = ageFromBirthDate(actor.birthDate);

  const addCredit = () => {
    if (!addingEntryId) return;
    dispatch({
      type: 'UPDATE_ACTOR_CREDIT',
      payload: { actorId: actor.id, entryId: addingEntryId, character: addingCharacter, role: addingRole },
    });
    setAddingEntryId('');
    setEntrySearch('');
    setEntryPickerOpen(false);
    setAddingCharacter('');
  };

  const renderCredits = (title: string, items: typeof credits) => items.length > 0 ? (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] text-[#888]">{items.length}</span>
      </div>
      {items.map(({ credit, entry }) => (
        <FilmographyRow
          key={entry.id}
          entry={entry}
          credit={credit}
          rating={state.favorites.find((item) => item.entryId === entry.id) ?? state.ratings.find((item) => item.entryId === entry.id)}
          favorite={isFavorited(entry.id)}
          top10={isInTop10(entry.id)}
          onSaveCredit={(next) => dispatch({ type: 'UPDATE_ACTOR_CREDIT', payload: { actorId: actor.id, ...next } })}
        />
      ))}
    </section>
  ) : null;

  const availableEntries = state.entries.filter((entry) => !actor.filmography.some((credit) => credit.entryId === entry.id));
  const selectedEntry = availableEntries.find((entry) => entry.id === addingEntryId);
  const matchingEntries = availableEntries
    .filter((entry) => {
      const normalizedQuery = entrySearch.trim().toLocaleLowerCase();
      if (!normalizedQuery) return true;
      return `${entry.title} ${entry.year} ${entry.country} ${entry.type}`.toLocaleLowerCase().includes(normalizedQuery);
    })
    .slice(0, 8);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-[#B3B3B3] hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to Actors
      </button>

      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#1c1113] via-[#141414] to-[#101010] p-5 sm:p-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#E50914]/10 blur-3xl" />
        <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <ActorAvatar actor={actor} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E50914]">Actor profile</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">{actor.name}</h1>
            <p className="mt-2 text-sm text-[#B3B3B3]">{actor.nationality}{age !== null ? ` · ${age} years old` : ''}</p>
            <p className="mt-3 text-xs text-[#777]">{credits.length} {credits.length === 1 ? 'show' : 'shows'} in filmography</p>
          </div>
          <button type="button" onClick={onEdit} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white hover:bg-white/10">
            <Edit3 className="h-4 w-4" /> Edit profile
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-[#E50914]" />
          <h2 className="text-sm font-bold">Add to filmography</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_170px_170px_auto]">
          <div className="relative">
            <Input
              value={selectedEntry ? `${selectedEntry.title} (${selectedEntry.year})` : entrySearch}
              onChange={(event) => {
                setEntrySearch(event.target.value);
                setAddingEntryId('');
                setEntryPickerOpen(true);
              }}
              onFocus={() => setEntryPickerOpen(true)}
              onBlur={() => window.setTimeout(() => setEntryPickerOpen(false), 120)}
              placeholder="Search your BL titles"
              className={fieldClass}
              aria-label="Search entries to add to filmography"
            />
            {entryPickerOpen && (
              <div className="absolute left-0 right-0 top-11 z-20 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#1a1a1a] p-1 shadow-2xl">
                {matchingEntries.length > 0 ? matchingEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setAddingEntryId(entry.id);
                      setEntrySearch('');
                      setEntryPickerOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-white hover:bg-[#E50914]/15"
                  >
                    <span className="min-w-0 truncate">{entry.title}</span>
                    <span className="ml-2 shrink-0 text-[10px] text-[#777]">{entry.year} · {entry.type}</span>
                  </button>
                )) : (
                  <p className="px-3 py-3 text-xs text-[#777]">No matching titles in your BL list.</p>
                )}
              </div>
            )}
          </div>
          <Input value={addingCharacter} onChange={(event) => setAddingCharacter(event.target.value)} placeholder="Character name" className={fieldClass} />
          <select value={addingRole} onChange={(event) => setAddingRole(event.target.value as ActorRole)} className={`w-full rounded-md border px-3 text-sm outline-none ${fieldClass}`}>
            <option value="MAIN">Main Role</option>
            <option value="SUPPORTING">Supporting Role</option>
          </select>
          <button type="button" onClick={addCredit} disabled={!addingEntryId} className="rounded-md bg-[#E50914] px-4 text-sm font-semibold text-white disabled:opacity-40">Add</button>
        </div>
        {availableEntries.length === 0 && <p className="mt-2 text-[11px] text-[#666]">All titles in your collection are already linked to this actor.</p>}
      </section>

      <div className="space-y-8">
        {renderCredits('Series', series)}
        {renderCredits('Movies', movies)}
        {credits.length === 0 && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#141414] py-14 text-center">
            <FilmographyEmpty />
            <p className="mt-3 text-sm text-[#777]">No filmography yet</p>
            <p className="mt-1 text-xs text-[#555]">Link this actor to a title above.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FilmographyEmpty() {
  return <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06]"><Star className="h-5 w-5 text-[#555]" /></div>;
}

export default function ActorsTab() {
  const { state, dispatch } = useApp();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('nameAsc');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [nationalityFilter, setNationalityFilter] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [editingActor, setEditingActor] = useState<Actor | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const selectedActor = state.actors.find((actor) => actor.id === selectedActorId) ?? null;
  const nationalities = useMemo(() => [...new Set(state.actors.map((actor) => actor.nationality))].sort(), [state.actors]);

  const visibleActors = useMemo(() => {
    const filtered = state.actors.filter((actor) => {
      const matchesQuery = !query.trim() || actor.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
      const matchesNationality = nationalityFilter === 'ALL' || actor.nationality === nationalityFilter;
      const matchesRole = roleFilter === 'ALL' || actor.filmography.some((credit) => credit.role === roleFilter);
      return matchesQuery && matchesNationality && matchesRole;
    });
    return filtered.sort((a, b) => {
      if (sort === 'nameDesc') return b.name.localeCompare(a.name);
      if (sort === 'filmography') return b.filmography.length - a.filmography.length || a.name.localeCompare(b.name);
      if (sort === 'older' || sort === 'younger') {
        const aDate = a.birthDate || '9999-12-31';
        const bDate = b.birthDate || '9999-12-31';
        return sort === 'older' ? aDate.localeCompare(bDate) : bDate.localeCompare(aDate);
      }
      return a.name.localeCompare(b.name);
    });
  }, [nationalityFilter, query, roleFilter, sort, state.actors]);

  const openCreate = () => {
    setEditingActor(null);
    setFormOpen(true);
  };
  const openEdit = (actor: Actor) => {
    setEditingActor(actor);
    setFormOpen(true);
  };
  const saveActor = (actor: Actor) => {
    dispatch({ type: editingActor ? 'UPDATE_ACTOR' : 'ADD_ACTOR', payload: actor });
    setFormOpen(false);
    setEditingActor(null);
  };

  if (selectedActor) {
    return (
      <>
        <ActorDetail actor={selectedActor} onBack={() => setSelectedActorId(null)} onEdit={() => openEdit(selectedActor)} />
        <Dialog open={formOpen} onOpenChange={(open) => !open && setFormOpen(false)}>
          <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#101010] text-white sm:max-w-xl">
            <div className="mb-1 flex items-center justify-between">
              <div><p className="text-xs uppercase tracking-[0.16em] text-[#E50914]">Actors</p><h2 className="text-xl font-bold">Edit actor</h2></div>
            </div>
            <ActorForm actor={editingActor} onSave={saveActor} onCancel={() => setFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UsersRound className="h-6 w-6 text-[#E50914]" />
            <h1 className="text-2xl font-extrabold tracking-tight">Actors</h1>
          </div>
          <p className="mt-1 text-sm text-[#777]">Your cast library for main and supporting actors.</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E50914] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-950/30">
          <Plus className="h-4 w-4" /> Add actor
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-[#111] p-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[#666]" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actors" className="h-10 border-white/10 bg-white/[0.04] pl-9 text-sm" />
        </div>
        <button type="button" onClick={() => setShowFilters((open) => !open)} className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm ${showFilters ? 'bg-[#E50914]/15 text-[#ff6970]' : 'bg-white/[0.05] text-[#B3B3B3]'}`}>
          <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} /> Filters
        </button>
        <label className="flex h-10 items-center gap-2 rounded-lg bg-white/[0.05] px-3 text-xs text-[#888]">
          <ArrowUpDown className="h-4 w-4" />
          <select value={sort} onChange={(event) => setSort(event.target.value as SortOption)} className="bg-transparent text-xs text-white outline-none">
            <option value="nameAsc">Name (A → Z)</option>
            <option value="nameDesc">Name (Z → A)</option>
            <option value="filmography">Filmography</option>
            <option value="older">Older</option>
            <option value="younger">Younger</option>
          </select>
        </label>
      </div>

      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="flex flex-wrap gap-2 rounded-2xl border border-white/[0.08] bg-[#111] p-3">
              {(['ALL', 'MAIN', 'SUPPORTING'] as RoleFilter[]).map((role) => (
                <button key={role} type="button" onClick={() => setRoleFilter(role)} className={`rounded-full px-3 py-1.5 text-xs ${roleFilter === role ? 'bg-[#E50914] text-white' : 'bg-white/[0.06] text-[#999]'}`}>
                  {role === 'ALL' ? 'All roles' : role === 'MAIN' ? 'Main Role' : 'Supporting Role'}
                </button>
              ))}
              <select value={nationalityFilter} onChange={(event) => setNationalityFilter(event.target.value)} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white outline-none">
                <option value="ALL">All nationalities</option>
                {nationalities.map((nationality) => <option key={nationality} value={nationality}>{nationality}</option>)}
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {visibleActors.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-[#111] py-20 text-center">
          <UsersRound className="mx-auto h-10 w-10 text-[#444]" />
          <h2 className="mt-4 text-lg font-bold">{state.actors.length === 0 ? 'Build your cast library' : 'No actors match these filters'}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[#666]">{state.actors.length === 0 ? 'Add the main and supporting actors from your favorite BL series and movies.' : 'Try a different search or filter.'}</p>
          {state.actors.length === 0 && <button type="button" onClick={openCreate} className="mt-5 rounded-xl bg-[#E50914] px-4 py-2 text-sm font-bold">Add your first actor</button>}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-5">
          {visibleActors.map((actor) => (
            <motion.div key={actor.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="group relative min-w-0 text-center">
              <button type="button" onClick={() => setSelectedActorId(actor.id)} className="flex w-full flex-col items-center rounded-2xl p-2 text-center transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E50914]">
                <ActorAvatar actor={actor} size="md" />
                <p className="mt-3 w-full truncate text-sm font-bold text-white">{actor.name}</p>
                <p className="mt-1 w-full truncate text-xs text-[#777]">{actor.nationality}</p>
                <span className="mt-2 text-[10px] text-[#555]">{actor.filmography.length} {actor.filmography.length === 1 ? 'title' : 'titles'}</span>
              </button>
              <div className="absolute right-0 top-0 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <button type="button" onClick={() => openEdit(actor)} className="rounded-full bg-[#222] p-2 text-[#aaa] hover:text-white" aria-label={`Edit ${actor.name}`}><Pencil className="h-3 w-3" /></button>
                <button type="button" onClick={() => setDeleteId(actor.id)} className="rounded-full bg-[#222] p-2 text-[#aaa] hover:text-[#E50914]" aria-label={`Delete ${actor.name}`}><Trash2 className="h-3 w-3" /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={(open) => !open && setFormOpen(false)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#101010] text-white sm:max-w-xl">
          <div className="mb-1 flex items-center justify-between">
            <div><p className="text-xs uppercase tracking-[0.16em] text-[#E50914]">Actors</p><h2 className="text-xl font-bold">{editingActor ? 'Edit actor' : 'Add actor'}</h2></div>
          </div>
          <ActorForm actor={editingActor} onSave={saveActor} onCancel={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="border-white/10 bg-[#141414] text-white sm:max-w-sm">
          <h2 className="text-lg font-bold">Delete actor?</h2>
          <p className="text-sm text-[#999]">This removes the actor and their filmography links. Your BL titles stay untouched.</p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setDeleteId(null)} className="rounded-lg px-3 py-2 text-sm text-[#aaa]">Cancel</button>
            <button type="button" onClick={() => { if (deleteId) dispatch({ type: 'DELETE_ACTOR', payload: deleteId }); setDeleteId(null); }} className="rounded-lg bg-[#E50914] px-3 py-2 text-sm font-semibold">Delete</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}