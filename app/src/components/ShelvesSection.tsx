import { useState, useMemo } from 'react';
import {
  Bookmark,
  Plus,
  Settings2,
  X,
  Trash2,
  Edit3,
  Search,
  Check,
  FolderPlus,
} from 'lucide-react';
import { useShelves, SHELF_PRESET_IDEAS } from '@/hooks/useShelves';
import { useApp } from '@/context/AppContext';
import Poster from './Poster';
import { formatRating } from '@/lib/rating';
import type { Entry, Shelf } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface ShelvesSectionProps {
  onSelectEntry: (entry: Entry) => void;
}

const PRESET_COLORS = [
  { label: 'Crimson Red', hex: '#E50914' },
  { label: 'Coral Orange', hex: '#FF6B35' },
  { label: 'Amber Gold', hex: '#F59E0B' },
  { label: 'Emerald Mint', hex: '#10B981' },
  { label: 'Sky Blue', hex: '#0EA5E9' },
  { label: 'Royal Indigo', hex: '#6366F1' },
  { label: 'Fuchsia Pink', hex: '#EC4899' },
  { label: 'Deep Violet', hex: '#8B5CF6' },
  { label: 'Slate Gray', hex: '#64748B' },
];

const PRESET_EMOJIS = ['🛋️', '⚡', '🔥', '😭', '✨', '🍬', '💼', '🗡️', '🎒', '🌙', '🍿', '👑', '💖', '🎬', '☕'];

export default function ShelvesSection({ onSelectEntry }: ShelvesSectionProps) {
  const { state } = useApp();
  const {
    shelves,
    createShelf,
    updateShelf,
    deleteShelf,
    addEntryToShelf,
    removeEntryFromShelf,
  } = useShelves();

  // Fast entry lookup
  const entryMap = useMemo(() => {
    const map = new Map<string, Entry>();
    state.entries.forEach((e) => map.set(e.id, e));
    return map;
  }, [state.entries]);

  // Fast rating lookup
  const ratingMap = useMemo(() => {
    const map = new Map<string, number>();
    state.favorites.forEach((f) => map.set(f.entryId, f.overallRating));
    state.ratings.forEach((r) => map.set(r.entryId, r.overallRating));
    return map;
  }, [state.favorites, state.ratings]);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newShelfName, setNewShelfName] = useState('');
  const [newShelfDesc, setNewShelfDesc] = useState('');
  const [newShelfEmoji, setNewShelfEmoji] = useState('🛋️');
  const [newShelfColor, setNewShelfColor] = useState('#FF6B35');

  const [editModalShelf, setEditModalShelf] = useState<Shelf | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editColor, setEditColor] = useState('');
  const [confirmDeleteShelfId, setConfirmDeleteShelfId] = useState<string | null>(null);

  const [addTitlesShelfId, setAddTitlesShelfId] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  // Always derive activeAddShelf dynamically so additions/removals reflect immediately
  const activeAddShelf = useMemo(() => {
    return shelves.find((s) => s.id === addTitlesShelfId) || null;
  }, [shelves, addTitlesShelfId]);

  const handleCreateShelf = () => {
    if (!newShelfName.trim()) return;
    createShelf(newShelfName, newShelfDesc, newShelfEmoji, newShelfColor);
    setCreateModalOpen(false);
    setNewShelfName('');
    setNewShelfDesc('');
    setNewShelfEmoji('🛋️');
    setNewShelfColor('#FF6B35');
  };

  const openEditShelf = (shelf: Shelf) => {
    setEditModalShelf(shelf);
    setEditName(shelf.name);
    setEditDesc(shelf.description || '');
    setEditEmoji(shelf.emoji || '📁');
    setEditColor(shelf.color || '#E50914');
    setConfirmDeleteShelfId(null);
  };

  const handleSaveEditShelf = () => {
    if (!editModalShelf || !editName.trim()) return;
    updateShelf(editModalShelf.id, {
      name: editName.trim(),
      description: editDesc.trim() || undefined,
      emoji: editEmoji.trim() || '📁',
      color: editColor.trim() || '#E50914',
    });
    setEditModalShelf(null);
  };

  const handleApplyPreset = (preset: typeof SHELF_PRESET_IDEAS[0]) => {
    setNewShelfName(preset.name);
    setNewShelfDesc(preset.description);
    setNewShelfEmoji(preset.emoji);
    setNewShelfColor(preset.color);
  };

  return (
    <section className="space-y-6">
      {/* ── Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-[#E50914]" />
          <div>
            <h2 className="text-lg font-extrabold text-white tracking-tight">Curated Shelves &amp; Playlists</h2>
            <p className="text-xs text-[#777]">Your personalized collections and thematic BL shelves.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#E50914] text-white hover:bg-[#E50914]/90 transition-colors tap-active shadow-sm"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>New Shelf</span>
        </button>
      </div>

      {/* ── Shelves List ── */}
      {shelves.length === 0 ? (
        <div className="py-12 text-center rounded-2xl border border-dashed border-white/10 bg-[#0f0f0f]">
          <Bookmark className="w-8 h-8 text-[#444] mx-auto mb-2" />
          <p className="text-sm font-semibold text-white">No custom shelves created yet</p>
          <p className="text-xs text-[#666] mt-1 max-w-sm mx-auto">
            Organize series into shelves like &ldquo;Comfort Watches&rdquo;, &ldquo;High Stakes&rdquo;, or &ldquo;Must Watch&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-[#E50914] text-white hover:bg-[#E50914]/90"
          >
            Create Your First Shelf
          </button>
        </div>
      ) : (
        <div className="space-y-7">
          {shelves.map((shelf) => {
            const shelfEntries = shelf.entryIds
              .map((id) => entryMap.get(id))
              .filter(Boolean) as Entry[];

            return (
              <div key={shelf.id} className="space-y-3">
                {/* Shelf Title & Controls */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      style={{ backgroundColor: `${shelf.color}20`, borderColor: `${shelf.color}50` }}
                      className="w-7 h-7 rounded-lg border flex items-center justify-center text-sm shrink-0"
                    >
                      {shelf.emoji}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white truncate">{shelf.name}</h3>
                        <span className="text-[11px] font-semibold text-[#888] bg-white/[0.06] px-2 py-0.5 rounded-full shrink-0">
                          {shelfEntries.length} {shelfEntries.length === 1 ? 'title' : 'titles'}
                        </span>
                      </div>
                      {shelf.description && (
                        <p className="text-xs text-[#777] truncate">{shelf.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setAddTitlesShelfId(shelf.id);
                        setPickerSearch('');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/[0.08] transition-colors"
                    >
                      <Plus className="w-3 h-3 text-[#E50914]" />
                      <span className="hidden sm:inline">Add Series</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditShelf(shelf)}
                      title="Edit Shelf"
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#888] hover:text-white transition-colors"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Horizontal Scroll Carousel */}
                {shelfEntries.length === 0 ? (
                  <div
                    onClick={() => {
                      setAddTitlesShelfId(shelf.id);
                      setPickerSearch('');
                    }}
                    className="p-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer text-center transition-colors group"
                  >
                    <p className="text-xs font-semibold text-[#888] group-hover:text-white">
                      This shelf is empty
                    </p>
                    <p className="text-[11px] text-[#666] mt-0.5">
                      Click here or use &ldquo;+ Add Series&rdquo; to add titles to {shelf.name}
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                    {shelfEntries.map((entry) => {
                      const rating = ratingMap.get(entry.id);

                      return (
                        <div
                          key={entry.id}
                          className="group relative w-28 shrink-0 text-left select-none"
                        >
                          {/* Poster Thumbnail */}
                          <div
                            onClick={() => onSelectEntry(entry)}
                            className="relative h-40 w-28 overflow-hidden rounded-xl bg-[#181818] border border-white/[0.08] group-hover:border-white/20 transition-all cursor-pointer shadow-md"
                          >
                            <Poster
                              src={entry.poster}
                              title={entry.title}
                              size="lg"
                              className="!h-full !w-full !rounded-xl transition-transform duration-300 group-hover:scale-105"
                            />

                            {/* User Rating Badge */}
                            {rating !== undefined && rating > 0 && (
                              <span className="absolute top-1 right-1 z-10 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[10px] font-bold text-yellow-400">
                                <span>⭐</span>
                                <span>{formatRating(rating)}</span>
                              </span>
                            )}

                            {/* Remove button on hover */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeEntryFromShelf(shelf.id, entry.id);
                              }}
                              title="Remove from this shelf"
                              className="absolute top-1 left-1 z-20 p-1 rounded-full bg-black/80 text-white/70 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Title & Metadata */}
                          <div className="mt-2 min-w-0">
                            <p
                              onClick={() => onSelectEntry(entry)}
                              className="text-xs font-bold text-white truncate group-hover:text-[#ff6670] transition-colors cursor-pointer"
                            >
                              {entry.title}
                            </p>
                            <p className="text-[10px] text-[#777] truncate">
                              {entry.year} · {entry.type}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    {/* Quick "+ Add More" End Card */}
                    <button
                      type="button"
                      onClick={() => {
                        setAddTitlesShelfId(shelf.id);
                        setPickerSearch('');
                      }}
                      className="h-40 w-28 shrink-0 rounded-xl border border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#E50914]/40 flex flex-col items-center justify-center gap-1.5 text-center transition-colors group"
                    >
                      <Plus className="w-5 h-5 text-[#888] group-hover:text-[#E50914] transition-colors" />
                      <span className="text-[11px] font-semibold text-[#888] group-hover:text-white">
                        Add More
                      </span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: Create New Shelf ── */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="bg-[#121212] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-[#E50914]" />
              Create Custom Shelf
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Quick Inspiration Presets */}
            <div>
              <p className="text-xs font-semibold text-[#888] mb-1.5">Quick Inspiration Presets</p>
              <div className="flex flex-wrap gap-1.5">
                {SHELF_PRESET_IDEAS.slice(0, 5).map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-[#aaa] hover:text-white border border-white/[0.06] transition-colors"
                  >
                    <span>{preset.emoji}</span>
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Name & Emoji */}
            <div className="flex gap-2">
              <div>
                <label className="block text-xs font-semibold text-[#aaa] mb-1">Emoji</label>
                <select
                  value={newShelfEmoji}
                  onChange={(e) => setNewShelfEmoji(e.target.value)}
                  className="h-10 px-3 bg-white/[0.04] border border-white/10 rounded-md text-lg text-white cursor-pointer"
                >
                  {PRESET_EMOJIS.map((emoji) => (
                    <option key={emoji} value={emoji}>
                      {emoji}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-0">
                <label className="block text-xs font-semibold text-[#aaa] mb-1">Shelf Name</label>
                <Input
                  value={newShelfName}
                  onChange={(e) => setNewShelfName(e.target.value)}
                  placeholder="e.g. Comfort Watches, High Stakes..."
                  className="h-10 bg-white/[0.04] border-white/10 text-white font-bold"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-[#aaa] mb-1">Description (Optional)</label>
              <Input
                value={newShelfDesc}
                onChange={(e) => setNewShelfDesc(e.target.value)}
                placeholder="e.g. Low-angst wholesome favorites to rewatch anytime"
                className="h-10 bg-white/[0.04] border-white/10 text-white text-xs"
              />
            </div>

            {/* Color Accent */}
            <div>
              <label className="block text-xs font-semibold text-[#aaa] mb-1.5">Accent Color</label>
              <div className="grid grid-cols-9 gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setNewShelfColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`h-7 rounded-md flex items-center justify-center transition-transform ${
                      newShelfColor === c.hex ? 'scale-110 ring-2 ring-white' : 'hover:opacity-90'
                    }`}
                  >
                    {newShelfColor === c.hex && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#aaa] hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateShelf}
                disabled={!newShelfName.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#E50914] text-white hover:bg-[#E50914]/90 disabled:opacity-40"
              >
                Create Shelf
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Edit Shelf ── */}
      <Dialog open={Boolean(editModalShelf)} onOpenChange={() => setEditModalShelf(null)}>
        <DialogContent className="bg-[#121212] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-[#E50914]" />
              Edit Shelf
            </DialogTitle>
          </DialogHeader>

          {editModalShelf && (
            <div className="space-y-4 pt-2">
              <div className="flex gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#aaa] mb-1">Emoji</label>
                  <select
                    value={editEmoji}
                    onChange={(e) => setEditEmoji(e.target.value)}
                    className="h-10 px-3 bg-white/[0.04] border border-white/10 rounded-md text-lg text-white cursor-pointer"
                  >
                    {PRESET_EMOJIS.map((emoji) => (
                      <option key={emoji} value={emoji}>
                        {emoji}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-semibold text-[#aaa] mb-1">Shelf Name</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-10 bg-white/[0.04] border-white/10 text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#aaa] mb-1">Description</label>
                <Input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="h-10 bg-white/[0.04] border-white/10 text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#aaa] mb-1.5">Accent Color</label>
                <div className="grid grid-cols-9 gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setEditColor(c.hex)}
                      style={{ backgroundColor: c.hex }}
                      className={`h-7 rounded-md flex items-center justify-center transition-transform ${
                        editColor === c.hex ? 'scale-110 ring-2 ring-white' : 'hover:opacity-90'
                      }`}
                    >
                      {editColor === c.hex && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
                {confirmDeleteShelfId === editModalShelf.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400 font-medium">Delete &ldquo;{editModalShelf.name}&rdquo;?</span>
                    <button
                      type="button"
                      onClick={() => {
                        deleteShelf(editModalShelf.id);
                        setEditModalShelf(null);
                        setConfirmDeleteShelfId(null);
                      }}
                      className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteShelfId(null)}
                      className="px-2 py-1 text-[11px] text-[#888] hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteShelfId(editModalShelf.id)}
                    className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Shelf</span>
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditModalShelf(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#aaa] hover:bg-white/[0.06]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditShelf}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#E50914] text-white hover:bg-[#E50914]/90"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Add Series to Shelf ── */}
      <Dialog open={Boolean(activeAddShelf)} onOpenChange={(open) => !open && setAddTitlesShelfId(null)}>
        <DialogContent className="bg-[#121212] border-white/10 text-white sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span>{activeAddShelf?.emoji}</span>
              <span>Add Series to {activeAddShelf?.name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2 flex-1 flex flex-col overflow-hidden">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#666]" />
              <Input
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Search BL series or movie from your watchlist..."
                className="h-10 pl-9 bg-white/[0.04] border-white/10 text-white"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[280px]">
              {state.entries
                .filter((e) => {
                  if (!pickerSearch.trim()) return true;
                  return e.title.toLowerCase().includes(pickerSearch.trim().toLowerCase());
                })
                .slice(0, 40)
                .map((entry) => {
                  const isAdded = Boolean(activeAddShelf?.entryIds.includes(entry.id));

                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors border border-white/[0.05]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {entry.poster ? (
                          <img
                            src={entry.poster}
                            alt=""
                            className="w-9 h-12 object-cover rounded shadow"
                          />
                        ) : (
                          <div className="w-9 h-12 rounded bg-[#222] flex items-center justify-center text-[10px]">
                            BL
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{entry.title}</p>
                          <p className="text-[10px] text-[#777]">
                            {entry.year} · {entry.country} · {entry.type}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!activeAddShelf) return;
                          if (isAdded) {
                            removeEntryFromShelf(activeAddShelf.id, entry.id);
                          } else {
                            addEntryToShelf(activeAddShelf.id, entry.id);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isAdded
                            ? 'bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400'
                            : 'bg-[#E50914] text-white hover:bg-[#E50914]/90'
                        }`}
                      >
                        {isAdded ? '✓ Added' : '+ Add'}
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
