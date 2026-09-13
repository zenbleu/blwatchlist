import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Heart, ArrowUpDown, ArrowUp, ArrowDown, Filter } from "lucide-react";
import { useApp } from "@/context/AppContext";
import Poster from "../Poster";
import RatingCircle from "../RatingCircle";
import FavoriteEvaluation from "../FavoriteEvaluation";
import { formatRating } from "@/lib/rating";
type SortOption = "ratingDesc" | "ratingAsc" | "yearDesc" | "yearAsc" | "titleAZ" | "titleZA";
type FilterOption = "all" | "movies" | "series";

export default function FavoritesTab() {
  const { state, getEntryById } = useApp();
  const [sortBy, setSortBy] = useState<SortOption>("ratingDesc");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  // Build sorted and filtered list
  const processedFavorites = useMemo(() => {
    let result = [...state.favorites];

    // Safety filter: exclude favorites for dropped entries (they should be cleaned up already)
    result = result.filter((fav) => {
      const entry = getEntryById(fav.entryId);
      return entry && entry.status !== 'DROPPED';
    });

    // Apply filter
    if (filterBy !== "all") {
      result = result.filter((fav) => {
        const entry = getEntryById(fav.entryId);
        if (!entry) return false;
        if (filterBy === "movies") return entry.type === "Movie";
        if (filterBy === "series") return entry.type === "Series";
        return true;
      });
    }

    // Apply sort
    result.sort((a, b) => {
      const entryA = getEntryById(a.entryId);
      const entryB = getEntryById(b.entryId);

      switch (sortBy) {
        case "yearDesc":
          return (entryB?.year ?? 0) - (entryA?.year ?? 0);
        case "yearAsc":
          return (entryA?.year ?? 0) - (entryB?.year ?? 0);
        case "titleAZ":
          return (entryA?.title ?? "").localeCompare(entryB?.title ?? "");
        case "titleZA":
          return (entryB?.title ?? "").localeCompare(entryA?.title ?? "");
        case "ratingDesc":
          return (b.overallRating ?? 0) - (a.overallRating ?? 0);
        case "ratingAsc":
          return (a.overallRating ?? 0) - (b.overallRating ?? 0);
        default:
          return 0;
      }
    });

    return result;
  }, [state.favorites, sortBy, filterBy, getEntryById]);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "ratingDesc", label: "Highest Rating" },
    { value: "ratingAsc", label: "Lowest Rating" },
    { value: "yearDesc", label: "Year (Newest → Oldest)" },
    { value: "yearAsc", label: "Year (Oldest → Newest)" },
    { value: "titleAZ", label: "Title (A → Z)" },
    { value: "titleZA", label: "Title (Z → A)" },
  ];

  const filterOptions: { value: FilterOption; label: string }[] = [
    { value: "all", label: "All" },
    { value: "movies", label: "Movies" },
    { value: "series", label: "Series" },
  ];

  if (state.favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Heart className="w-8 h-8 text-[#333] mb-3" />
        <p className="text-[#666] text-sm">No favorites yet</p>
        <p className="text-[#555] text-xs mt-1">Tap the heart icon on any entry to add it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-[#E50914]" />
          <h2 className="text-white font-bold text-lg">Favorites</h2>
          <span className="text-[#666] text-xs">({state.favorites.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Sort Button */}
          <button
            onClick={() => { setShowSortMenu((p) => !p); setShowFilterMenu(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showSortMenu ? "bg-[#E50914] text-white" : "bg-white/[0.06] text-[#B3B3B3] hover:bg-white/10"}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Sort
          </button>

          {/* Filter Button */}
          <button
            onClick={() => { setShowFilterMenu((p) => !p); setShowSortMenu(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showFilterMenu ? "bg-[#E50914] text-white" : "bg-white/[0.06] text-[#B3B3B3] hover:bg-white/10"}`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filter
          </button>

        </div>
      </div>

      {/* Sort Menu */}
      {showSortMenu && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-2 space-y-1"
        >
          <p className="text-[11px] uppercase text-[#B3B3B3] tracking-wider px-2 py-1">Sort By</p>
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left transition-colors ${sortBy === opt.value ? "bg-[#E50914]/20 text-white" : "text-[#B3B3B3] hover:bg-white/[0.06]"}`}
            >
              {sortBy === opt.value ? (
                opt.value.includes("Asc") ? <ArrowUp className="w-3 h-3 text-[#E50914]" /> : <ArrowDown className="w-3 h-3 text-[#E50914]" />
              ) : (
                <ArrowUpDown className="w-3 h-3 text-[#666]" />
              )}
              {opt.label}
            </button>
          ))}
        </motion.div>
      )}

      {/* Filter Menu */}
      {showFilterMenu && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-2 space-y-1"
        >
          <p className="text-[11px] uppercase text-[#B3B3B3] tracking-wider px-2 py-1">Filter</p>
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setFilterBy(opt.value); setShowFilterMenu(false); }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left transition-colors ${filterBy === opt.value ? "bg-[#E50914]/20 text-white" : "text-[#B3B3B3] hover:bg-white/[0.06]"}`}
            >
              <Filter className={`w-3 h-3 ${filterBy === opt.value ? "text-[#E50914]" : "text-[#666]"}`} />
              {opt.label}
            </button>
          ))}
        </motion.div>
      )}

      {/* Status text */}
      <p className="text-sm text-[#B3B3B3]">
        {processedFavorites.length} favorite{processedFavorites.length !== 1 ? "s" : ""}
        {filterBy !== "all" && ` \u00B7 ${filterOptions.find((f) => f.value === filterBy)?.label}`}
      </p>

      {/* Favorite Cards */}
      <div className="space-y-3 w-full">
        {processedFavorites.map((fav) => {
          const entry = getEntryById(fav.entryId);
          if (!entry) return null;

          // Status badge colors
          const cardStatusConfig = {
            'COMPLETE': { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completed' },
            'ONGOING': { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Ongoing' },
            'DROPPED': { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Dropped' },
            'PLANNED': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Planned' },
          }[entry.status];

          return (
            <motion.button
              key={fav.entryId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedEntryId(fav.entryId)}
              className="w-full flex items-center gap-4 bg-white/[0.04] border border-white/[0.06] rounded-2xl p-3.5 text-left hover:bg-white/[0.06] transition-colors"
            >
              <Poster src={entry.poster} title={entry.title} size="lg" />
              <div className="flex-1 min-w-0">
                <h3 className="text-white text-sm font-semibold truncate">{entry.title}</h3>
                <p className="text-[#888] text-xs mt-0.5">{entry.year} &middot; {entry.country}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {/* Status badge */}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${cardStatusConfig?.bg} ${cardStatusConfig?.text}`}>
                    {cardStatusConfig?.label}
                  </span>
                  {/* Overall Rating */}
                  <span className="flex items-center gap-0.5 text-[10px] text-yellow-400 font-medium">
                    <span className="text-yellow-400">&#9733;</span>
                    {formatRating(fav.overallRating)}
                  </span>
                </div>
              </div>
              <RatingCircle rating={fav.overallRating} size={40} />
            </motion.button>
          );
        })}
      </div>

      {/* Favorite Evaluation Modal */}
      <FavoriteEvaluation
        isOpen={!!selectedEntryId}
        onClose={() => setSelectedEntryId(null)}
        entryId={selectedEntryId}
        initialMode="view"
      />
    </div>
  );
}
