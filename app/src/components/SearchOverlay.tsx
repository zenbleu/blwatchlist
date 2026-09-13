import { useState, useMemo, useEffect, useRef, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Heart, Star, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import Poster from './Poster';
import StatusBadge from './StatusBadge';
import EntryModal from './EntryModal';
import EditEntryModal from './EditEntryModal';
import FavoriteEvaluation from './FavoriteEvaluation';
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
import type { Entry } from '@/types';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

/* ============================================================
   Search Result Card — mirrors BLSeriesTab EntryCard
   ============================================================ */
const SearchResultCard = memo(function SearchResultCard({
  entry,
  favorited,
  top10Info,
  canAddToTop10,
  onView,
  onRate,
  onToggleFavorite,
  onAddToTop10,
  onEdit,
  onDelete,
}: {
  entry: Entry;
  favorited: boolean;
  top10Info: { year: number; rank: number } | null;
  canAddToTop10: boolean;
  onView: (entry: Entry) => void;
  onRate: (entry: Entry) => void;
  onToggleFavorite: (entry: Entry) => void;
  onAddToTop10: (entry: Entry) => void;
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-[#141414] w-full min-w-0">
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
          <StatusBadge status={entry.status} />
        </div>
      </button>

      {/* Actions */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {/* Favorite */}
          <button
            onClick={() => onToggleFavorite(entry)}
            disabled={entry.status !== 'COMPLETE'}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium tap-active transition-colors ${
              favorited
                ? 'bg-[#FF2D7B]/15 text-[#FF2D7B]'
                : entry.status !== 'COMPLETE'
                ? 'bg-white/[0.04] text-[#555] cursor-not-allowed'
                : 'bg-white/[0.06] text-[#B3B3B3] hover:bg-white/[0.1]'
            }`}
            title={entry.status !== 'COMPLETE' ? 'Only completed entries can be favorited' : ''}
          >
            <Heart className={`w-3 h-3 ${favorited ? 'fill-current' : ''}`} />
            <span className="hidden sm:inline">Fav</span>
          </button>

          <button
            onClick={() => onRate(entry)}
            disabled={entry.status !== 'COMPLETE'}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium tap-active transition-colors ${
              entry.status === 'COMPLETE' ? 'bg-white/[0.06] text-[#B3B3B3] hover:bg-white/[0.1]' : 'bg-white/[0.04] text-[#555] cursor-not-allowed'
            }`}
            title={entry.status === 'COMPLETE' ? 'Rate this entry' : 'Only completed entries can be rated'}
          >
            <Star className="w-3 h-3 text-yellow-400" />
            <span className="hidden sm:inline">Rate</span>
          </button>

          {/* Top 10 */}
          {top10Info ? (
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-[#E50914]/15 text-[#E50914]">
              <Star className="w-3 h-3 fill-current" />
              #{top10Info.rank}
            </span>
          ) : (
            <button
              onClick={() => onAddToTop10(entry)}
              disabled={!canAddToTop10 || entry.status !== 'COMPLETE'}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-white/[0.06] text-[#B3B3B3] hover:bg-white/[0.1] tap-active disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Star className="w-3 h-3" />
              <span className="hidden sm:inline">Top</span>
            </button>
          )}

          {/* Edit */}
          <button
            onClick={() => onEdit(entry)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-white/[0.06] text-[#B3B3B3] hover:bg-white/[0.1] tap-active"
          >
            <Pencil className="w-3 h-3" />
            <span className="hidden sm:inline">Edit</span>
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(entry.id)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-white/[0.06] text-[#B3B3B3] hover:bg-red-500/15 hover:text-red-400 tap-active"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
});

/* ============================================================
   Main SearchOverlay
   ============================================================ */
export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const { state, dispatch, isFavorited, isInTop10 } = useApp();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 200);
  const inputRef = useRef<HTMLInputElement>(null);

  // View modal
  const [viewEntry, setViewEntry] = useState<Entry | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  // Favorite Evaluation modal
  const [favEvalOpen, setFavEvalOpen] = useState(false);
  const [favEvalEntryId, setFavEvalEntryId] = useState<string | null>(null);
  const [favEvalMode, setFavEvalMode] = useState<'view' | 'edit'>('view');
  const [evaluationType, setEvaluationType] = useState<'favorite' | 'rating'>('favorite');

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) setQuery('');
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    return state.entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.country.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        e.status.toLowerCase().includes(q) ||
        e.year.toString().includes(q)
    );
  }, [debouncedQuery, state.entries]);

  const handleView = useCallback((entry: Entry) => {
    setViewEntry(entry);
    setViewModalOpen(true);
  }, []);

  const handleEdit = useCallback((entry: Entry) => {
    setEditingEntry(entry);
    setEditModalOpen(true);
  }, []);

  const handleToggleFavorite = useCallback((entry: Entry) => {
    if (entry.status !== 'DROPPED') {
      dispatch({ type: 'TOGGLE_FAVORITE', payload: entry.id });
    }
  }, [dispatch]);

  const handleRate = useCallback((entry: Entry) => {
    setFavEvalEntryId(entry.id);
    setFavEvalMode('view');
    setEvaluationType('rating');
    setFavEvalOpen(true);
  }, []);

  const handleAddToTop10 = useCallback((entry: Entry) => {
    const drawer = state.top10Drawers.find((d) => d.year === entry.year);
    if (drawer && drawer.entries.length < 10) {
      dispatch({ type: 'ADD_TO_TOP10', payload: { year: entry.year, entryId: entry.id } });
    }
  }, [state.top10Drawers, dispatch]);

  const handleDelete = useCallback((id: string) => {
    dispatch({ type: 'DELETE_ENTRY', payload: id });
    setDeleteConfirm(null);
  }, [dispatch]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black z-[100] flex flex-col"
          >
            {/* Search Header */}
            <div className="flex items-center gap-3 p-4 border-b border-white/[0.06]">
              <div className="flex-1 flex items-center gap-2 bg-white/[0.06] rounded-lg px-3 h-12 border border-white/10 focus-within:border-[#E50914] focus-within:ring-1 focus-within:ring-[#E50914]/20 transition-all">
                <Search className="w-5 h-5 text-[#B3B3B3] flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search titles, countries, types..."
                  className="flex-1 bg-transparent text-white placeholder:text-[#666] outline-none text-base"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="tap-active">
                    <X className="w-4 h-4 text-[#B3B3B3]" />
                  </button>
                )}
              </div>
              <button onClick={onClose} className="text-[#B3B3B3] text-sm font-medium tap-active">
                Cancel
              </button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4">
              {query.trim() && results.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <Search className="w-12 h-12 text-[#666] mb-4" />
                  <p className="text-base text-[#B3B3B3]">No results found</p>
                </div>
              )}

              {results.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase text-[#B3B3B3] font-medium tracking-wider mb-3">
                    {results.length} result{results.length !== 1 ? 's' : ''}
                  </p>
                  {results.map((entry) => {
                    const favorited = isFavorited(entry.id);
                    const top10Info = isInTop10(entry.id);
                    const drawer = state.top10Drawers.find((d) => d.year === entry.year);
                    const canAddToTop10 = !!drawer && drawer.entries.length < 10 && entry.status !== 'DROPPED';

                    return (
                      <SearchResultCard
                        key={entry.id}
                        entry={entry}
                        favorited={favorited}
                        top10Info={top10Info}
                        canAddToTop10={canAddToTop10}
                        onView={handleView}
                        onRate={handleRate}
                        onToggleFavorite={handleToggleFavorite}
                        onAddToTop10={handleAddToTop10}
                        onEdit={handleEdit}
                        onDelete={setDeleteConfirm}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Card Modal */}
      <EntryModal
        isOpen={viewModalOpen}
        onClose={() => { setViewModalOpen(false); setViewEntry(null); }}
        entry={viewEntry}
      />

      {/* Edit Entry Modal */}
      <EditEntryModal
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditingEntry(null); }}
        entry={editingEntry}
      />

      {/* Favorite Evaluation Modal */}
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
    </>
  );
}
