import { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Star, ChevronDown, ChevronRight, Trash2, Plus, X, AlertTriangle, Edit3, Lock } from "lucide-react";
import { useApp } from "@/context/AppContext";
import Poster from "../Poster";
import type { Entry } from "@/types";
import EntryModal from "../EntryModal";
import ShareButton from "../ShareCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RankBadge = memo(function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, string> = {
    1: "bg-[#E50914]",
    2: "bg-[#FF2D7B]",
    3: "bg-[#FF6B35]",
  };
  const bgClass = colors[rank] || "bg-[#333]";

  return (
    <span
      className={`absolute top-2 left-2 ${bgClass} text-white text-sm font-extrabold w-8 h-8 rounded-full flex items-center justify-center shadow-lg z-10`}
    >
      {rank}
    </span>
  );
});

const Top10Card = memo(function Top10Card({
  entry,
  rank,
  isEditMode,
  onRemove,
  onClick,
}: {
  entry: { title: string; poster: string | null; type: string; country: string };
  rank: number;
  isEditMode: boolean;
  onRemove: () => void;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl overflow-hidden bg-[#141414] select-none ${
        !isEditMode ? "cursor-pointer" : ""
      }`}
    >
      {/* Poster Container */}
      <div className="relative aspect-[2/3] w-full">
        {entry.poster ? (
          <img
            src={entry.poster}
            alt={entry.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center">
            <Star className="w-8 h-8 text-[#444]" />
          </div>
        )}

        {/* Ranking Badge */}
        <RankBadge rank={rank} />

        {/* Remove Button (Edit Mode Only) */}
        {isEditMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute top-2 right-2 w-7 h-7 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-red-500/80 transition-colors z-10"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        )}
      </div>

      {/* Info Below Poster */}
      <div className="p-2.5">
        <p className="text-sm font-bold truncate">{entry.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#E50914]/15 text-[#E50914]">
            {entry.type.toUpperCase()}
          </span>
          <span className="text-[11px] text-[#B3B3B3]">{entry.country}</span>
        </div>
      </div>
    </div>
  );
});

const SortableTop10Card = memo(function SortableTop10Card({
  entry,
  rank,
  onRemove,
}: {
  entry: { id: string; title: string; poster: string | null; type: string; country: string };
  rank: number;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
      }}
      {...attributes}
      {...listeners}
    >
      <Top10Card entry={entry} rank={rank} isEditMode onRemove={onRemove} />
    </div>
  );
});

const EmptySlot = memo(function EmptySlot({ rank }: { rank: number }) {
  return (
    <div className="aspect-[2/3] w-full rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center bg-[#0f0f0f]">
      <span className="text-lg font-extrabold text-[#333]">{rank}</span>
      <span className="text-[10px] text-[#444] mt-1">Empty</span>
    </div>
  );
});

/** Ranking Modal - Move Items in a popup */
function RankingModal({
  open,
  onClose,
  year,
  entries,
  getEntryById,
  onRankChange,
}: {
  open: boolean;
  onClose: () => void;
  year: number;
  entries: { entryId: string; rank: number }[];
  getEntryById: (id: string) => Entry | undefined;
  onRankChange: (entryId: string, newRank: number) => void;
}) {
  if (!open) return null;

  const count = entries.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#141414] border-white/10 text-white max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Move Items &middot; {year}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-4">
          {entries.map((entry) => {
            const e = getEntryById(entry.entryId);
            if (!e) return null;
            return (
              <div
                key={entry.entryId}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#1a1a1a]"
              >
                <span className="text-sm font-medium truncate flex-1 min-w-0">
                  {e.title}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-[#B3B3B3]">Rank:</span>
                  <Select
                    value={String(entry.rank)}
                    onValueChange={(value) =>
                      onRankChange(entry.entryId, parseInt(value))
                    }
                  >
                    <SelectTrigger
                      className="h-8 min-w-[4.5rem] bg-white/[0.06] border-white/10 text-white text-xs"
                      size="sm"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                      {Array.from({ length: count }, (_, i) => i + 1).map(
                        (rankNum) => (
                          <SelectItem
                            key={rankNum}
                            value={String(rankNum)}
                            className="text-xs focus:bg-white/10 focus:text-white"
                          >
                            {rankNum}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <Button
            onClick={onClose}
            className="w-full bg-[#E50914] text-white hover:bg-[#E50914]/90 font-semibold"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Top10Tab() {
  const { state, dispatch, getEntryById, checkMilestones } = useApp();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [openDrawers, setOpenDrawers] = useState<Set<number>>(new Set([new Date().getFullYear()]));
  const [addYearOpen, setAddYearOpen] = useState(false);
  const [newYear, setNewYear] = useState("");
  const [addEntryDrawer, setAddEntryDrawer] = useState<number | null>(null);
  const [deleteDrawerConfirm, setDeleteDrawerConfirm] = useState<number | null>(null);
  const [editModeDrawers, setEditModeDrawers] = useState<Set<number>>(new Set());
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [duplicateError, setDuplicateError] = useState("");
  const [rankingModalYear, setRankingModalYear] = useState<number | null>(null);

  const toggleDrawer = (year: number) => {
    setOpenDrawers((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const toggleEditMode = (year: number) => {
    setEditModeDrawers((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const handleAddYear = () => {
    const year = parseInt(newYear);
    setDuplicateError("");
    if (!year || year < 2000 || year > 2100) return;
    if (state.top10Drawers.find((d) => d.year === year)) {
      setDuplicateError(`Year ${year} already exists`);
      return;
    }
    dispatch({ type: "ADD_DRAWER", payload: year });
    setNewYear("");
    setAddYearOpen(false);
    setOpenDrawers((prev) => new Set(prev).add(year));
  };

  const handleDeleteDrawer = (year: number) => {
    dispatch({ type: "DELETE_DRAWER", payload: year });
    setDeleteDrawerConfirm(null);
  };

  /** Handle rank change from the Move Items selector — auto-reorders affected entries */
  const handleRankChange = (year: number, entryId: string, newRank: number) => {
    const drawer = state.top10Drawers.find((d) => d.year === year);
    if (!drawer) return;

    const currentIndex = drawer.entries.findIndex((e) => e.entryId === entryId);
    if (currentIndex === -1) return;

    const currentRank = drawer.entries[currentIndex].rank;
    if (currentRank === newRank) return; // No change

    // Create new array and move the entry
    const items = Array.from(drawer.entries);
    const [moved] = items.splice(currentIndex, 1);

    // Insert at new position (newRank is 1-based)
    const targetIndex = Math.max(0, Math.min(newRank - 1, items.length));
    items.splice(targetIndex, 0, moved);

    // Dispatch reorder — reducer automatically reassigns ranks 1..N
    dispatch({
      type: "REORDER_TOP10",
      payload: {
        year,
        entries: items.map((e, i) => ({ ...e, rank: i + 1 })),
        updatedEntryId: entryId,
      },
    });
  };

  /** Move an entry only after a drag is completed inside its edit-mode drawer. */
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const drawer = state.top10Drawers.find((item) =>
      item.entries.some((entry) => entry.entryId === activeId),
    );
    const overDrawer = state.top10Drawers.find((item) =>
      item.entries.some((entry) => entry.entryId === overId),
    );
    if (!drawer || drawer.year !== overDrawer?.year) return;

    const sourceIndex = drawer.entries.findIndex((entry) => entry.entryId === activeId);
    const destinationIndex = drawer.entries.findIndex((entry) => entry.entryId === overId);
    if (sourceIndex === -1 || destinationIndex === -1) return;

    const items = arrayMove(drawer.entries, sourceIndex, destinationIndex);
    dispatch({
      type: "REORDER_TOP10",
      payload: {
        year: drawer.year,
        entries: items.map((entry, index) => ({ ...entry, rank: index + 1 })),
        updatedEntryId: activeId,
      },
    });
  };

  const getAvailableEntries = (year: number) => {
    const drawer = state.top10Drawers.find((d) => d.year === year);
    const existingIds = new Set(drawer?.entries.map((e) => e.entryId) || []);
    // Exclude dropped entries from available entries
    return state.entries.filter((e) => e.year === year && !existingIds.has(e.id) && e.status !== 'DROPPED');
  };

  // Build share card entries for a drawer
  const getShareCardEntries = (year: number) => {
    const drawer = state.top10Drawers.find((d) => d.year === year);
    if (!drawer) return [];
    return drawer.entries
      .sort((a, b) => a.rank - b.rank)
      .map((e) => {
        const entry = getEntryById(e.entryId);
        return {
          title: entry?.title || "Unknown",
          poster: entry?.poster || null,
          year: entry?.year,
          country: entry?.country,
        };
      });
  };

  if (state.top10Drawers.length === 0) {
    return (
      <div className="space-y-4 w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-6 h-6 text-[#E50914]" />
            <h1 className="text-2xl font-extrabold">Top 10 Rankings</h1>
          </div>
          <button
            onClick={() => setAddYearOpen(true)}
            className="flex items-center gap-1.5 glass text-white px-3 py-2 rounded-lg text-sm font-semibold tap-active"
          >
            <Plus className="w-4 h-4" />
            Add Year
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Star className="w-8 h-8 text-[#333] mb-3" />
          <p className="text-[#666] text-sm">No rankings yet</p>
          <p className="text-[#555] text-xs mt-1">Add your first year drawer</p>
        </div>

        <Dialog open={addYearOpen} onOpenChange={setAddYearOpen}>
          <DialogContent className="bg-[#141414] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Add Year Drawer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <Input
                type="number"
                placeholder="Enter year (e.g. 2025)"
                value={newYear}
                onChange={(e) => { setNewYear(e.target.value); setDuplicateError(""); }}
                min={2000}
                max={2100}
                className="bg-white/[0.06] border-white/10 text-white placeholder:text-[#666] focus:border-[#E50914] focus:ring-[#E50914]/15"
              />
              {duplicateError && <p className="text-red-500 text-xs">{duplicateError}</p>}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setAddYearOpen(false); setNewYear(""); setDuplicateError(""); }}
                  className="flex-1 bg-white/[0.06] border-white/10 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddYear}
                  className="flex-1 bg-[#E50914] text-white hover:bg-[#E50914]/90 font-semibold"
                >
                  Add
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="w-6 h-6 text-[#E50914]" />
          <h1 className="text-2xl font-extrabold">Top 10 Rankings</h1>
        </div>
        <button
          onClick={() => setAddYearOpen(true)}
          className="flex items-center gap-1.5 glass text-white px-3 py-2 rounded-lg text-sm font-semibold tap-active"
        >
          <Plus className="w-4 h-4" />
          Add Year
        </button>
      </div>

      {/* Year Drawers */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-3">
          {state.top10Drawers.map((drawer) => {
          const isOpen = openDrawers.has(drawer.year);
          const isEditMode = editModeDrawers.has(drawer.year);
          const isCurrentYear = drawer.year === new Date().getFullYear();
          const emptySlots = 10 - drawer.entries.length;

          return (
            <div
              key={drawer.year}
              className={`rounded-xl overflow-hidden ${isCurrentYear && isOpen ? "ring-1 ring-[#E50914]/30" : ""}`}
            >
              {/* Drawer Header */}
              <div
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                  isOpen ? "bg-[#E50914]/8" : "glass"
                } ${isCurrentYear ? "border-l-[3px] border-l-[#E50914]" : ""}`}
              >
                <button onClick={() => toggleDrawer(drawer.year)} className="flex items-center gap-3 flex-1 min-w-0">
                  {isOpen ? (
                    <ChevronDown className="w-5 h-5 text-[#B3B3B3] transition-transform duration-200 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-[#B3B3B3] transition-transform duration-200 flex-shrink-0" />
                  )}
                  <span className="text-lg font-bold flex-1">{drawer.year}</span>
                  <span className="text-xs text-[#B3B3B3] bg-white/[0.06] px-2 py-0.5 rounded-full flex-shrink-0">
                    {drawer.entries.length}/10
                  </span>
                </button>

                {/* Share Button */}
                {drawer.entries.length > 0 && (
                  <ShareButton
                    type="top10"
                    title={`My ${drawer.year} Rankings`}
                    subtitle={`${drawer.entries.length}/10 ranked`}
                    entries={getShareCardEntries(drawer.year)}
                    year={drawer.year}
                    label=""
                  />
                )}

                {/* Edit Mode Toggle */}
                {drawer.entries.length > 0 && (
                  <button
                    onClick={() => toggleEditMode(drawer.year)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium tap-active transition-colors flex-shrink-0 ${
                      isEditMode
                        ? "bg-[#E50914] text-white"
                        : "bg-white/[0.06] text-[#B3B3B3] hover:bg-white/[0.1]"
                    }`}
                  >
                    {isEditMode ? (
                      <>
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        Locked
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteDrawerConfirm(drawer.year); }}
                  className="p-1.5 rounded-lg hover:bg-red-500/15 tap-active flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4 text-[#666] hover:text-red-400" />
                </button>
              </div>

              {/* Drawer Content */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-[#0A0A0A] p-3">
                      {/* Grid of Entries */}
                      {isEditMode ? (
                        <SortableContext
                          items={drawer.entries.map((entry) => entry.entryId)}
                          strategy={rectSortingStrategy}
                        >
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {drawer.entries.map((entry) => {
                              const e = getEntryById(entry.entryId);
                              if (!e) return null;
                              return (
                                <SortableTop10Card
                                  key={entry.entryId}
                                  entry={e}
                                  rank={entry.rank}
                                  onRemove={() =>
                                    dispatch({
                                      type: "REMOVE_FROM_TOP10",
                                      payload: { year: drawer.year, entryId: entry.entryId },
                                    })
                                  }
                                />
                              );
                            })}
                            {Array.from({ length: emptySlots }).map((_, i) => (
                              <EmptySlot key={`empty-${i}`} rank={drawer.entries.length + i + 1} />
                            ))}
                          </div>
                        </SortableContext>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {drawer.entries.map((entry) => {
                            const e = getEntryById(entry.entryId);
                            if (!e) return null;
                            return (
                              <div key={entry.entryId} onClick={() => setSelectedEntry(e)}>
                                <Top10Card
                                  entry={e}
                                  rank={entry.rank}
                                  isEditMode={false}
                                  onRemove={() => undefined}
                                  onClick={() => setSelectedEntry(e)}
                                />
                              </div>
                            );
                          })}
                          {Array.from({ length: emptySlots }).map((_, i) => (
                            <EmptySlot key={`empty-${i}`} rank={drawer.entries.length + i + 1} />
                          ))}
                        </div>
                      )}

                      {/* Move Items Button (Edit Mode Only) */}
                      {isEditMode && (
                        <button
                          onClick={() => setRankingModalYear(drawer.year)}
                          className="w-full mt-3 py-2.5 rounded-lg border border-dashed border-[#E50914]/30 text-[#E50914] text-sm font-medium hover:bg-[#E50914]/10 transition-colors tap-active flex items-center justify-center gap-1.5"
                        >
                          <Edit3 className="w-4 h-4" />
                          Move Items ({drawer.entries.length} entries)
                        </button>
                      )}

                      {/* Add Entry Button */}
                      {drawer.entries.length < 10 && (
                        <button
                          onClick={() => setAddEntryDrawer(drawer.year)}
                          className="w-full mt-3 py-2.5 rounded-lg border border-dashed border-white/15 text-[#B3B3B3] text-sm font-medium hover:border-[#E50914]/30 hover:text-[#E50914] transition-colors tap-active flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          Add Entry ({10 - drawer.entries.length} slot{10 - drawer.entries.length !== 1 ? "s" : ""} left)
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            );
          })}
        </div>
      </DndContext>

      {/* Ranking Modal */}
      {rankingModalYear && (
        <RankingModal
          open={!!rankingModalYear}
          onClose={() => setRankingModalYear(null)}
          year={rankingModalYear}
          entries={state.top10Drawers.find(d => d.year === rankingModalYear)?.entries || []}
          getEntryById={getEntryById}
          onRankChange={(entryId, newRank) =>
            rankingModalYear && handleRankChange(rankingModalYear, entryId, newRank)
          }
        />
      )}

      {/* Add Year Dialog */}
      <Dialog open={addYearOpen} onOpenChange={setAddYearOpen}>
        <DialogContent className="bg-[#141414] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add Year Drawer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input
              type="number"
              placeholder="Enter year (e.g. 2025)"
              value={newYear}
              onChange={(e) => { setNewYear(e.target.value); setDuplicateError(""); }}
              min={2000}
              max={2100}
              className="bg-white/[0.06] border-white/10 text-white placeholder:text-[#666] focus:border-[#E50914] focus:ring-[#E50914]/15"
            />
            {duplicateError && <p className="text-red-500 text-xs">{duplicateError}</p>}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setAddYearOpen(false); setNewYear(""); setDuplicateError(""); }}
                className="flex-1 bg-white/[0.06] border-white/10 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddYear}
                className="flex-1 bg-[#E50914] text-white hover:bg-[#E50914]/90 font-semibold"
              >
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Entry to Drawer Dialog */}
      <Dialog open={!!addEntryDrawer} onOpenChange={() => setAddEntryDrawer(null)}>
        <DialogContent className="bg-[#141414] border-white/10 text-white max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add to {addEntryDrawer}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {addEntryDrawer && getAvailableEntries(addEntryDrawer).length === 0 ? (
              <p className="text-center text-[#B3B3B3] py-8">No available entries for {addEntryDrawer}</p>
            ) : (
              addEntryDrawer && getAvailableEntries(addEntryDrawer).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-[#141414] card-hover"
                >
                  <Poster src={entry.poster} title={entry.title} size="sm" />
                  <span className="flex-1 text-sm font-semibold truncate">{entry.title}</span>
                  <Button
                    size="sm"
                    onClick={() => {
                      dispatch({ type: "ADD_TO_TOP10", payload: { year: addEntryDrawer, entryId: entry.id } });
                      // Check if this drawer just became full (9 entries + this one = 10)
                      const drawer = state.top10Drawers.find(d => d.year === addEntryDrawer);
                      if (drawer && drawer.entries.length + 1 >= 10) {
                        checkMilestones('TOP10_COMPLETE', addEntryDrawer);
                      }
                      setAddEntryDrawer(null);
                    }}
                    className="bg-[#E50914] text-white hover:bg-[#E50914]/90 text-xs h-7 px-3"
                  >
                    Add
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Drawer Confirmation */}
      <Dialog open={!!deleteDrawerConfirm} onOpenChange={() => setDeleteDrawerConfirm(null)}>
        <DialogContent className="bg-[#141414] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#E50914]" />
              Delete Drawer?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#B3B3B3] mt-2">
            Delete the {deleteDrawerConfirm} drawer? Entries will remain in your General List.
          </p>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDrawerConfirm(null)}
              className="flex-1 bg-white/[0.06] border-white/10 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteDrawerConfirm && handleDeleteDrawer(deleteDrawerConfirm)}
              className="flex-1 bg-[#E50914] text-white hover:bg-[#E50914]/90 font-semibold"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Entry Detail Modal */}
      <EntryModal
        isOpen={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        entry={selectedEntry}
      />
    </div>
  );
}
