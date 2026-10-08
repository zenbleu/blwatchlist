import { useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Plus, Settings2, Tags, Trash2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { Entry, GenreTag } from '@/types';
import { createCustomGenreTag, normalizeGenreName } from '@/lib/genres';
import Poster from '@/components/Poster';
import GenreChip from '@/components/GenreChip';
import EntryModal from '@/components/EntryModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const HISTORY_COPY =
  "Originating from the 1970s Japanese Shōnen-ai and Yaoi manga subcultures, Boys' Love (BL) has evolved into a massive, multi-billion dollar global phenomenon. Far more than a typical romance category, the genre is celebrated for its highly structured character dynamics, rich emotional frameworks, and creative narrative tropes that explore identity, connection, and the many facets of love.";

function PosterStack({ entries }: { entries: Entry[] }) {
  const posters = entries.slice(0, 3);

  return (
    <div className="relative h-[76px] w-[112px] shrink-0" aria-hidden="true">
      {posters.map((entry, index) => (
        <div
          key={entry.id}
          className="absolute top-1"
          style={{
            left: `${index * 18}px`,
            zIndex: index + 1,
            transform: `rotate(${(index - 1) * 5}deg)`,
          }}
        >
          <Poster
            src={entry.poster}
            title={entry.title}
            size="sm"
            className="border border-black/60 shadow-lg"
          />
        </div>
      ))}
      {entries.length > 3 && (
        <span className="absolute bottom-0 right-0 z-10 rounded-full border border-white/10 bg-black/80 px-2 py-1 text-[9px] font-semibold text-white">
          +{entries.length - 3}
        </span>
      )}
    </div>
  );
}

function GenrePosterCard({
  tag,
  entries,
  onClick,
}: {
  tag: GenreTag;
  entries: Entry[];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[142px] w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-[#171717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E50914]"
      aria-label={`Open ${tag.name} genre, ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
    >
      <div className="min-w-0 flex-1">
        <GenreChip tag={tag} size="regular" />
        <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.16em] text-[#777]">
          {tag.category}
        </p>
        <p className="mt-1 text-xs text-[#aaa]">
          {entries.length} {entries.length === 1 ? 'title' : 'titles'}
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-white/55 transition-colors group-hover:text-white">
          View titles <ArrowRight className="h-3 w-3" />
        </span>
      </div>
      <PosterStack entries={entries} />
    </button>
  );
}

export default function GenresTab() {
  const { state, dispatch } = useApp();
  const [selectedGenreId, setSelectedGenreId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [genreName, setGenreName] = useState('');
  const [genreCategory, setGenreCategory] = useState('Custom');
  const [genreError, setGenreError] = useState('');
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [deleteGenreConfirm, setDeleteGenreConfirm] = useState<GenreTag | null>(null);

  const genresByCategory = useMemo(() => {
    const groups = new Map<string, GenreTag[]>();
    const usedGenreIds = new Set(state.entries.flatMap((entry) => entry.genres ?? []));
    state.genreTags
      .filter((tag) => usedGenreIds.has(tag.id))
      .forEach((tag) => {
        const tags = groups.get(tag.category) || [];
        tags.push(tag);
        groups.set(tag.category, tags);
      });
    return [...groups.entries()];
  }, [state.entries, state.genreTags]);
  const customTags = state.genreTags.filter((tag) => tag.custom);

  const entriesForGenre = (genreId: string) =>
    state.entries.filter((entry) => entry.genres?.includes(genreId));
  const selectedGenre = state.genreTags.find((tag) => tag.id === selectedGenreId) || null;
  const selectedEntries = selectedGenre ? entriesForGenre(selectedGenre.id) : [];

  const handleAddGenre = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = genreName.trim();
    if (!name) {
      setGenreError('Enter a genre name.');
      return;
    }
    if (state.genreTags.some((tag) => normalizeGenreName(tag.name) === normalizeGenreName(name))) {
      setGenreError('That genre already exists.');
      return;
    }

    const tag = createCustomGenreTag(name, genreCategory, state.genreTags);
    dispatch({ type: 'ADD_GENRE_TAG', payload: tag });
    setGenreName('');
    setGenreCategory('Custom');
    setGenreError('');
    setAddDialogOpen(false);
  };

  const openAddDialog = () => {
    setGenreError('');
    setAddDialogOpen(true);
  };

  const handleDeleteGenre = () => {
    if (!deleteGenreConfirm) return;
    dispatch({ type: 'DELETE_GENRE_TAG', payload: deleteGenreConfirm.id });
    setDeleteGenreConfirm(null);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 p-4 sm:p-6">
      {selectedGenre ? (
        <section className="space-y-5">
          <button
            type="button"
            onClick={() => setSelectedGenreId(null)}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#aaa] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            All genres
          </button>
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#777]">
                {selectedGenre.category}
              </p>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">{selectedGenre.name}</h1>
              <p className="mt-1 text-sm text-[#888]">
                {selectedEntries.length} {selectedEntries.length === 1 ? 'entry' : 'entries'} in this genre
              </p>
            </div>
            <GenreChip tag={selectedGenre} size="regular" />
          </div>

          {selectedEntries.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {selectedEntries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedEntry(entry)}
                  className="flex min-w-0 items-center gap-3 rounded-xl border border-white/[0.07] bg-[#111] p-3 text-left transition-colors hover:border-white/20 hover:bg-[#171717]"
                >
                  <Poster src={entry.poster} title={entry.title} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{entry.title}</span>
                    <span className="mt-1 block text-xs text-[#888]">
                      {entry.type} · {entry.year} · {entry.country}
                    </span>
                    <span className="mt-1 block text-[10px] uppercase tracking-wide text-[#666]">
                      {entry.status === 'COMPLETE'
                        ? 'Completed'
                        : entry.status === 'ONGOING'
                          ? 'Ongoing'
                          : entry.status === 'DROPPED'
                            ? 'Dropped'
                            : 'Planned'}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#555]" />
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-14 text-center">
              <Tags className="mx-auto h-7 w-7 text-[#555]" />
              <p className="mt-3 text-sm font-medium text-white">No entries in this genre yet</p>
              <p className="mt-1 text-xs text-[#777]">Assign this genre while adding or editing an entry.</p>
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="relative isolate min-h-[270px] overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101010]">
            <img
              src="/bl-history-context.jpg"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover object-center opacity-35"
            />
            <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#090909] via-[#090909]/85 to-[#090909]/30" />
            <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#090909]/95 via-transparent to-[#090909]/25" />
            <div className="relative z-10 flex min-h-[270px] max-w-4xl flex-col justify-center p-6 sm:p-9">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#ff8990]">
                BL History &amp; Context
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                About Boys&apos; Love (BL)
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80 sm:text-[15px] sm:leading-7">
                {HISTORY_COPY}
              </p>
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white sm:text-2xl">Explore Genres of BL</h2>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#777]">Genre Tags</p>
                <p className="mt-1 text-sm text-[#888]">Browse your collection by genre. An entry can appear in multiple lists.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={openAddDialog}
                  className="bg-[#E50914] text-white hover:bg-[#c90811]"
                >
                  <Plus className="h-4 w-4" />
                  Add genre
                </Button>
                {customTags.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setManageDialogOpen(true)}
                    className="border-white/10 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white"
                  >
                    <Settings2 className="h-4 w-4" />
                    Manage custom tags
                  </Button>
                )}
              </div>
            </div>

            {genresByCategory.length > 0 ? (
              <div className="space-y-7">
                {genresByCategory.map(([category, tags]) => (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#aaa]">{category}</h3>
                      <span className="h-px flex-1 bg-white/[0.07]" />
                      <span className="text-[10px] text-[#666]">{tags.length}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                      {tags.map((tag) => (
                        <GenrePosterCard
                          key={tag.id}
                          tag={tag}
                          entries={entriesForGenre(tag.id)}
                          onClick={() => setSelectedGenreId(tag.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center">
                <Tags className="mx-auto h-7 w-7 text-[#555]" />
                <p className="mt-3 text-sm font-medium text-white">No genres assigned yet</p>
                <p className="mt-1 text-xs text-[#777]">Genre tags appear here after they’re assigned to an entry.</p>
              </div>
            )}
          </section>
        </>
      )}

      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) setGenreError('');
        }}
      >
        <DialogContent className="max-w-md border-white/10 bg-[#141414] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Add a genre tag</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddGenre} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-genre-name" className="text-[#bbb]">Genre name</Label>
              <Input
                id="new-genre-name"
                autoFocus
                value={genreName}
                onChange={(event) => {
                  setGenreName(event.target.value);
                  setGenreError('');
                }}
                placeholder="e.g. Road Trip"
                className="border-white/10 bg-white/[0.06] text-white placeholder:text-[#666]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-genre-category" className="text-[#bbb]">Group</Label>
              <Input
                id="new-genre-category"
                value={genreCategory}
                onChange={(event) => setGenreCategory(event.target.value)}
                placeholder="Custom"
                className="border-white/10 bg-white/[0.06] text-white placeholder:text-[#666]"
              />
              <p className="text-[10px] text-[#777]">Use an existing group name to add this tag to that section.</p>
            </div>
            {genreError && <p role="alert" className="text-xs text-red-400">{genreError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#E50914] text-white hover:bg-[#c90811]">Add genre</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto border-white/10 bg-[#141414] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Manage custom genre tags</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {customTags.length > 0 ? customTags.map((tag) => {
              const assignedCount = entriesForGenre(tag.id).length;
              return (
                <div
                  key={tag.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"
                >
                  <div className="min-w-0">
                    <GenreChip tag={tag} size="regular" />
                    <p className="mt-2 text-xs text-[#888]">
                      {tag.category} · {assignedCount} {assignedCount === 1 ? 'entry' : 'entries'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${tag.name}`}
                    onClick={() => setDeleteGenreConfirm(tag)}
                    className="text-[#aaa] hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            }) : (
              <p className="py-6 text-center text-sm text-[#888]">No custom genre tags remain.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteGenreConfirm}
        onOpenChange={(open) => {
          if (!open) setDeleteGenreConfirm(null);
        }}
      >
        <AlertDialogContent className="border-white/10 bg-[#141414] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete custom genre?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#aaa]">
              {deleteGenreConfirm && (
                <>
                  Delete “{deleteGenreConfirm.name}”?
                  {entriesForGenre(deleteGenreConfirm.id).length > 0
                    ? ` It will also be removed from ${entriesForGenre(deleteGenreConfirm.id).length} ${entriesForGenre(deleteGenreConfirm.id).length === 1 ? 'entry' : 'entries'}.`
                    : ' This tag is not assigned to any entries.'}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="border-white/10 bg-white/[0.06] text-white hover:bg-white/10 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGenre}
              className="bg-[#E50914] text-white hover:bg-[#E50914]/90"
            >
              Delete tag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EntryModal
        isOpen={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        entry={selectedEntry}
      />
    </div>
  );
}
