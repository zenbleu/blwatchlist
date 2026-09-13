import { useState, useMemo, memo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Heart, Star, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { Entry } from "@/types";
import { getOngoingSchedule } from "@/lib/episodeSchedule";
import Poster from "../Poster";
import StatusBadge from "../StatusBadge";
import EntryModal from "../EntryModal";
import EditEntryModal from "../EditEntryModal";
import FavoriteEvaluation from "../FavoriteEvaluation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type FilterType = "All" | "Series" | "Movies" | "Completed" | "Ongoing" | "Dropped" | "Planned";
type SortType = "yearNew" | "yearOld" | "titleAZ" | "titleZA" | "country" | "status";

const filters: FilterType[] = ["All", "Series", "Movies", "Completed", "Ongoing", "Dropped", "Planned"];

const sortOptions: { value: SortType; label: string }[] = [
  { value: "yearNew", label: "Year (Newest)" },
  { value: "yearOld", label: "Year (Oldest)" },
  { value: "titleAZ", label: "Title (A → Z)" },
  { value: "titleZA", label: "Title (Z → A)" },
  { value: "country", label: "Country" },
  { value: "status", label: "Status" },
];

const EntryCard = memo(function EntryCard({
  entry,
  favorited,
  top10Info,
  onRate,
  onToggleFavorite,
  onAddToTop10,
  onEdit,
  onDelete,
  onView,
  canAddToTop10,
  airingBadge,
}: {
  entry: Entry;
  favorited: boolean;
  top10Info: { year: number; rank: number } | null;
  onRate: (entry: Entry) => void;
  onToggleFavorite: (entry: Entry) => void;
  onAddToTop10: (entry: Entry) => void;
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => void;
  onView: (entry: Entry) => void;
  canAddToTop10: boolean;
  airingBadge: "Airing Today" | "Final EP" | null;
}) {
  const completed = entry.status === 'COMPLETE';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.25 }}
      className="flex items-start gap-3 p-3 rounded-xl bg-[#141414] card-hover w-full min-w-0"
    >
      {/* Clickable Poster → opens view card modal */}
      <button
        onClick={() => onView(entry)}
        className="flex-shrink-0 cursor-pointer tap-active"
      >
        <Poster src={entry.poster} title={entry.title} size="md" />
      </button>

      {/* Clickable info area → opens view card modal */}
      <button
        onClick={() => onView(entry)}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold truncate">{entry.title}</p>
            <p className="text-xs text-[#B3B3B3] mt-0.5">
              {entry.type} &middot; {entry.year} &middot; {entry.country}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {airingBadge && (
              <span className={`whitespace-nowrap text-white text-[10px] font-bold px-2 py-0.5 rounded-full ${
                airingBadge === "Final EP" ? "bg-amber-500" : "bg-[#E50914]"
              }`}>
                {airingBadge}
              </span>
            )}
            <StatusBadge status={entry.status} />
          </div>
        </div>
      </button>

      {/* Actions - NOT clickable for view (each has own handler) */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <button
            onClick={() => onToggleFavorite(entry)}
            disabled={!completed}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium tap-active transition-colors ${
              favorited
                ? "bg-[#FF2D7B]/15 text-[#FF2D7B]"
                : !completed
                ? "bg-white/[0.04] text-[#555] cursor-not-allowed"
                : "bg-white/[0.06] text-[#B3B3B3] hover:bg-white/[0.1]"
            }`}
            title={!completed ? "Only completed entries can be favorited" : ""}
          >
            <Heart className={`w-3 h-3 ${favorited ? "fill-current" : ""}`} />
            <span className="hidden sm:inline">Favorite</span>
          </button>

          <button
            onClick={() => onRate(entry)}
            disabled={!completed}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium tap-active transition-colors ${
              completed ? "bg-white/[0.06] text-[#B3B3B3] hover:bg-white/[0.1]" : "bg-white/[0.04] text-[#555] cursor-not-allowed"
            }`}
            title={completed ? "Rate this entry" : "Only completed entries can be rated"}
          >
            <Star className="w-3 h-3 text-yellow-400" />
            <span className="hidden sm:inline">Rate</span>
          </button>

          {top10Info ? (
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-[#E50914]/15 text-[#E50914]">
              <Star className="w-3 h-3 fill-current" />
              #{top10Info.rank}
            </span>
          ) : (
            <button
              onClick={() => onAddToTop10(entry)}
              disabled={!canAddToTop10 || !completed}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-white/[0.06] text-[#B3B3B3] hover:bg-white/[0.1] tap-active disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Star className="w-3 h-3" />
              <span className="hidden sm:inline">Top 10</span>
            </button>
          )}

          {/* Edit button → opens edit form directly */}
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(entry); }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-white/[0.06] text-[#B3B3B3] hover:bg-white/[0.1] tap-active"
          >
            <Pencil className="w-3 h-3" />
            <span className="hidden sm:inline">Edit</span>
          </button>

          {/* Delete button → confirm delete */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-white/[0.06] text-[#B3B3B3] hover:bg-red-500/15 hover:text-red-400 tap-active"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});

export default function BLSeriesTab() {
  const { state, dispatch, isFavorited, isInTop10, checkMilestones } = useApp();
  const [filter, setFilter] = useState<FilterType>("All");
  const [sort, setSort] = useState<SortType>("yearNew");
  const [showSort, setShowSort] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // View card modal state (for clicking poster/row)
  const [viewEntry, setViewEntry] = useState<Entry | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  // Edit modal state (for Edit button)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  // Favorite Evaluation modal state
  const [favEvalOpen, setFavEvalOpen] = useState(false);
  const [favEvalEntryId, setFavEvalEntryId] = useState<string | null>(null);
  const [favEvalMode, setFavEvalMode] = useState<'view' | 'edit'>('view');
  const [evaluationType, setEvaluationType] = useState<'favorite' | 'rating'>('favorite');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredAndSortedEntries = useMemo(() => {
    let entries = state.entries.filter((e) => {
      switch (filter) {
        case "Series": return e.type === "Series";
        case "Movies": return e.type === "Movie";
         case "Completed": return e.status === "COMPLETE";
        case "Ongoing": return e.status === "ONGOING";
        case "Dropped": return e.status === "DROPPED";
        case "Planned": return e.status === "PLANNED";
        default: return true;
      }
    });

    const compareBySelectedSort = (a: Entry, b: Entry): number => {
      switch (sort) {
        case "yearNew": return b.year - a.year;
        case "yearOld": return a.year - b.year;
        case "titleAZ": return a.title.localeCompare(b.title);
        case "titleZA": return b.title.localeCompare(a.title);
        case "country": return a.country.localeCompare(b.country);
        case "status": return a.status.localeCompare(b.status);
        default: return 0;
      }
    };

    const isAiringToday = (entry: Entry): boolean => {
      if (entry.status !== "ONGOING") return false;
      const ongoing = state.ongoing.find((item) => item.entryId === entry.id);
      if (!ongoing) return false;
      const schedule = getOngoingSchedule(ongoing, now);
      return schedule.isAiringToday || schedule.isFinalEpisodeScheduledToday;
    };

    entries = [...entries].sort((a, b) => {
      // Airing entries are temporarily prioritized without changing their
      // persistent update timestamp, so they return to their normal order
      // after today unless the user makes a real update.
      const airingDifference = Number(isAiringToday(b)) - Number(isAiringToday(a));
      if (airingDifference !== 0) return airingDifference;
      if (isAiringToday(a)) return compareBySelectedSort(a, b);

      const recentDifference =
        (b.lastUpdatedAt || b.createdAt) - (a.lastUpdatedAt || a.createdAt);
      return recentDifference || compareBySelectedSort(a, b);
    });

    return entries;
  }, [state.entries, state.ongoing, filter, sort, now]);

  // View card handlers
  const handleView = useCallback((entry: Entry) => {
    setViewEntry(entry);
    setViewModalOpen(true);
  }, []);

  // Edit handlers
  const handleAdd = useCallback(() => {
    setEditingEntry(null);
    setEditModalOpen(true);
  }, []);

  const handleEdit = useCallback((entry: Entry) => {
    setEditingEntry(entry);
    setEditModalOpen(true);
  }, []);

  const handleSave = useCallback((entry: Entry) => {
    if (editingEntry) {
      dispatch({ type: "UPDATE_ENTRY", payload: entry });
    } else {
      dispatch({ type: "ADD_ENTRY", payload: entry });
      // Check collection size milestone after adding a new entry
      checkMilestones('COLLECTION_SIZE', state.entries.length + 1);
    }
  }, [editingEntry, dispatch, checkMilestones, state.entries.length]);

  const handleDelete = useCallback((id: string) => {
    dispatch({ type: "DELETE_ENTRY", payload: id });
    setDeleteConfirm(null);
  }, [dispatch]);

  const handleToggleFavorite = useCallback((entry: Entry) => {
    if (entry.status !== 'DROPPED') {
      dispatch({ type: "TOGGLE_FAVORITE", payload: entry.id });
    }
  }, [dispatch]);

  const handleRate = useCallback((entry: Entry) => {
    setFavEvalEntryId(entry.id);
    // Rate is an action, so open the reusable evaluator directly in edit mode.
    // View mode makes the button appear to do nothing because the stars are
    // intentionally non-interactive there.
    setFavEvalMode('edit');
    setEvaluationType('rating');
    setFavEvalOpen(true);
  }, []);

  const handleAddToTop10 = useCallback((entry: Entry) => {
    const drawer = state.top10Drawers.find((d) => d.year === entry.year);
    if (drawer && drawer.entries.length < 10) {
      dispatch({ type: "ADD_TO_TOP10", payload: { year: entry.year, entryId: entry.id } });
    }
  }, [state.top10Drawers, dispatch]);

  return (
    <div className="space-y-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">BL Series &amp; Movies</h1>
          <p className="text-sm text-[#B3B3B3]">{filteredAndSortedEntries.length} entries</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 bg-[#E50914] text-white px-4 py-2 rounded-lg text-sm font-semibold tap-active flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Filter Chips - scrollable with no overflow issues */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4" style={{ WebkitOverflowScrolling: "touch" }}>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all tap-active ${
              filter === f
                ? "bg-[#E50914] text-white"
                : "glass text-[#B3B3B3] hover:bg-white/[0.1]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowSort(!showSort)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all tap-active ${
            showSort ? "bg-[#E50914] text-white" : "glass text-[#B3B3B3] hover:bg-white/[0.1]"
          }`}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          Sort
        </button>
        {showSort && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1">
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSort(opt.value)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-all tap-active ${
                  sort === opt.value
                    ? "bg-white/[0.1] text-white"
                    : "bg-transparent text-[#B3B3B3] hover:bg-white/[0.06]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Entry List */}
      <div className="space-y-2 w-full">
        <AnimatePresence mode="popLayout">
          {filteredAndSortedEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Plus className="w-8 h-8 text-[#333] mb-3" />
              <p className="text-[#666] text-sm">No entries found</p>
              <p className="text-[#555] text-xs mt-1">Add your first BL!</p>
            </div>
          ) : (
            filteredAndSortedEntries.map((entry) => {
              const favorited = isFavorited(entry.id);
              const top10Info = isInTop10(entry.id);
              const drawer = state.top10Drawers.find((d) => d.year === entry.year);
              // Dropped entries cannot be added to Top 10
              const canAddToTop10 = !!drawer && drawer.entries.length < 10;
              const ongoing = entry.status === "ONGOING"
                ? state.ongoing.find((item) => item.entryId === entry.id)
                : undefined;
              const schedule = ongoing ? getOngoingSchedule(ongoing, now) : null;
              const airingBadge = schedule?.isFinalEpisodeScheduledToday
                ? "Final EP"
                : schedule?.isAiringToday
                  ? "Airing Today"
                  : null;

              return (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  favorited={favorited}
                  top10Info={top10Info}
                  onRate={handleRate}
                  onToggleFavorite={handleToggleFavorite}
                  onAddToTop10={handleAddToTop10}
                  onEdit={handleEdit}
                  onDelete={setDeleteConfirm}
                  onView={handleView}
                  canAddToTop10={canAddToTop10}
                  airingBadge={airingBadge}
                />
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* View Card Modal (poster/row click) */}
      <EntryModal
        isOpen={viewModalOpen}
        onClose={() => { setViewModalOpen(false); setViewEntry(null); }}
        entry={viewEntry}
      />

      {/* Edit Entry Modal (Edit button click) */}
      <EditEntryModal
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditingEntry(null); }}
        onSave={handleSave}
        entry={editingEntry}
      />

      {/* Favorite Evaluation Modal (Favorite button click) */}
      <FavoriteEvaluation
        isOpen={favEvalOpen}
        onClose={() => { setFavEvalOpen(false); setFavEvalEntryId(null); }}
        entryId={favEvalEntryId}
        initialMode={favEvalMode}
        evaluationType={evaluationType}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="bg-[#141414] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Delete Entry?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#B3B3B3]">
              This will remove the entry from all lists (Ongoing, Favorites, Top 10).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-white/[0.06] border-white/10 text-white hover:bg-white/10 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-[#E50914] text-white hover:bg-[#E50914]/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
