import { useState, useMemo, useCallback } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileCode,
  Check,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Layers,
  Star,
  Heart,
  Film,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useApp } from '@/context/AppContext';
import { formatEntryTitle } from '@/lib/entry';
import type { Entry, Status, FavoriteTier } from '@/types';

export type ExportScope = 'watchlist' | 'favorites' | 'top10' | 'comprehensive';
export type ExportFormat = 'csv' | 'json';

export type FieldKey =
  | 'title'
  | 'type'
  | 'year'
  | 'country'
  | 'status'
  | 'totalEpisodes'
  | 'genres'
  | 'actors'
  | 'overallScore'
  | 'storyline'
  | 'acting'
  | 'chemistry'
  | 'production'
  | 'rewatchValue'
  | 'favoriteTier'
  | 'personalComment'
  | 'top10Rank'
  | 'top10Commentary'
  | 'episodeRatingsSummary'
  | 'plannedDate'
  | 'createdAt'
  | 'lastUpdatedAt'
  | 'franchiseInfo';

interface FieldOption {
  key: FieldKey;
  label: string;
  category: 'core' | 'ratings' | 'people' | 'rankings' | 'meta';
  defaultEnabled: boolean;
}

const ALL_FIELDS: FieldOption[] = [
  // Core
  { key: 'title', label: 'Title', category: 'core', defaultEnabled: true },
  { key: 'type', label: 'Type (Series / Movie)', category: 'core', defaultEnabled: true },
  { key: 'year', label: 'Release Year', category: 'core', defaultEnabled: true },
  { key: 'country', label: 'Country', category: 'core', defaultEnabled: true },
  { key: 'status', label: 'Watchlist Status', category: 'core', defaultEnabled: true },
  { key: 'totalEpisodes', label: 'Total Episodes', category: 'core', defaultEnabled: true },
  // Tags & People
  { key: 'genres', label: 'Genres', category: 'people', defaultEnabled: true },
  { key: 'actors', label: 'Main Cast / Actors', category: 'people', defaultEnabled: true },
  // Ratings & Evaluations
  { key: 'overallScore', label: 'Overall Score (1–10)', category: 'ratings', defaultEnabled: true },
  { key: 'favoriteTier', label: 'Favorite Tier (Top, High, Comfort)', category: 'ratings', defaultEnabled: true },
  { key: 'storyline', label: 'Storyline Score', category: 'ratings', defaultEnabled: true },
  { key: 'acting', label: 'Acting Score', category: 'ratings', defaultEnabled: true },
  { key: 'chemistry', label: 'Chemistry Score', category: 'ratings', defaultEnabled: true },
  { key: 'production', label: 'Production Score', category: 'ratings', defaultEnabled: true },
  { key: 'rewatchValue', label: 'Rewatch Value Score', category: 'ratings', defaultEnabled: true },
  { key: 'personalComment', label: 'Personal Comment / Review', category: 'ratings', defaultEnabled: true },
  { key: 'episodeRatingsSummary', label: 'Episode Ratings Summary', category: 'ratings', defaultEnabled: false },
  // Rankings
  { key: 'top10Rank', label: 'Top 10 Rankings (Year & Rank)', category: 'rankings', defaultEnabled: true },
  { key: 'top10Commentary', label: 'Top 10 Commentary', category: 'rankings', defaultEnabled: true },
  { key: 'franchiseInfo', label: 'Franchise & Season Info', category: 'rankings', defaultEnabled: false },
  // Metadata & Dates
  { key: 'plannedDate', label: 'Planned Air Date & Time', category: 'meta', defaultEnabled: false },
  { key: 'createdAt', label: 'Date Added to App', category: 'meta', defaultEnabled: false },
  { key: 'lastUpdatedAt', label: 'Last Updated Date', category: 'meta', defaultEnabled: false },
];

const DEFAULT_ENABLED_KEYS = new Set<FieldKey>(
  ALL_FIELDS.filter((f) => f.defaultEnabled).map((f) => f.key),
);

interface CustomExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomExportModal({ isOpen, onClose }: CustomExportModalProps) {
  const { state } = useApp();

  const [scope, setScope] = useState<ExportScope>('watchlist');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Status>('ALL');
  const [tierFilter, setTierFilter] = useState<'ALL' | FavoriteTier>('ALL');
  const [top10YearFilter, setTop10YearFilter] = useState<'ALL' | number>('ALL');

  const [format, setFormat] = useState<ExportFormat>('csv');
  const [selectiveExport, setSelectiveExport] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<FieldKey>>(
    () => new Set(DEFAULT_ENABLED_KEYS),
  );

  // Available top 10 years in user's data
  const top10Years = useMemo(() => {
    return Array.from(new Set(state.top10Drawers.map((d) => d.year))).sort((a, b) => b - a);
  }, [state.top10Drawers]);

  // Toggle single field
  const toggleField = useCallback((key: FieldKey) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Select / Deselect all
  const selectAllFields = useCallback(() => {
    setSelectedFields(new Set(ALL_FIELDS.map((f) => f.key)));
  }, []);

  const resetFieldsToDefault = useCallback(() => {
    setSelectedFields(new Set(DEFAULT_ENABLED_KEYS));
  }, []);

  // Active fields list to include
  const activeFields = useMemo(() => {
    if (!selectiveExport) {
      // Depending on scope, include relevant default fields
      if (scope === 'favorites') {
        return ALL_FIELDS.filter((f) =>
          [
            'title',
            'type',
            'year',
            'country',
            'favoriteTier',
            'overallScore',
            'storyline',
            'acting',
            'chemistry',
            'production',
            'rewatchValue',
            'personalComment',
            'genres',
            'actors',
          ].includes(f.key),
        );
      }
      if (scope === 'top10') {
        return ALL_FIELDS.filter((f) =>
          [
            'top10Rank',
            'title',
            'type',
            'year',
            'country',
            'top10Commentary',
            'overallScore',
            'favoriteTier',
            'genres',
            'actors',
          ].includes(f.key),
        );
      }
      return ALL_FIELDS.filter((f) => DEFAULT_ENABLED_KEYS.has(f.key));
    }
    return ALL_FIELDS.filter((f) => selectedFields.has(f.key));
  }, [selectiveExport, selectedFields, scope]);

  // Resolve item data for export
  const resolvedExportData = useMemo(() => {
    const genreMap = new Map(state.genreTags.map((g) => [g.id, g.name]));
    const actorMap = new Map(state.actors.map((a) => [a.id, a.name]));
    const parentMap = new Map(state.entries.map((e) => [e.id, e.title]));

    const favMap = new Map(state.favorites.map((f) => [f.entryId, f]));
    const ratingMap = new Map(state.ratings.map((r) => [r.entryId, r]));

    // Top 10 lookups: entryId -> { year: number; rank: number; commentary?: string }[]
    const top10ByEntryId = new Map<
      string,
      { year: number; rank: number; commentary?: string }[]
    >();
    for (const drawer of state.top10Drawers) {
      for (const item of drawer.entries) {
        const existing = top10ByEntryId.get(item.entryId) || [];
        existing.push({ year: drawer.year, rank: item.rank, commentary: item.commentary });
        top10ByEntryId.set(item.entryId, existing);
      }
    }

    const formatTierLabel = (tier?: FavoriteTier) => {
      if (tier === 'topTier') return 'Top Tier';
      if (tier === 'highTier') return 'High Tier';
      if (tier === 'comfortTier') return 'Comfort Tier';
      return '';
    };

    // ── Scope 1: Top 10 specific export (each row is a ranking item) ──
    if (scope === 'top10') {
      const rows: Record<string, unknown>[] = [];
      for (const drawer of state.top10Drawers) {
        if (top10YearFilter !== 'ALL' && drawer.year !== top10YearFilter) continue;

        for (const item of drawer.entries) {
          const entry = state.entries.find((e) => e.id === item.entryId);
          if (!entry) continue;

          const fav = favMap.get(entry.id);
          const evalItem = fav || ratingMap.get(entry.id);
          const genres = (entry.genreTagIds || []).map((id) => genreMap.get(id) || '').filter(Boolean).join(', ');
          const actors = (entry.mainActorIds || []).map((id) => actorMap.get(id) || '').filter(Boolean).join(', ');

          rows.push({
            top10Rank: `${drawer.year} Rank #${item.rank}`,
            top10Commentary: item.commentary || '',
            title: formatEntryTitle(entry),
            type: entry.type,
            year: entry.year,
            country: entry.country,
            status: entry.status,
            totalEpisodes: entry.totalEpisodes ?? '',
            genres,
            actors,
            overallScore: evalItem?.overallScore != null ? evalItem.overallScore.toFixed(1) : '',
            favoriteTier: formatTierLabel(fav?.tier),
            storyline: evalItem?.ratings?.storyline ?? '',
            acting: evalItem?.ratings?.acting ?? '',
            chemistry: evalItem?.ratings?.chemistry ?? '',
            production: evalItem?.ratings?.production ?? '',
            rewatchValue: evalItem?.ratings?.rewatchValue ?? '',
            personalComment: evalItem?.personalComment ?? '',
            episodeRatingsSummary: entry.episodeRatings
              ? `${Object.keys(entry.episodeRatings).length} eps rated`
              : '',
            plannedDate: entry.plannedDate ?? '',
            createdAt: entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '',
            lastUpdatedAt: entry.lastUpdatedAt ? new Date(entry.lastUpdatedAt).toLocaleDateString() : '',
            franchiseInfo: entry.parentEntryId ? `Parent: ${parentMap.get(entry.parentEntryId) || ''}` : '',
          });
        }
      }
      return rows;
    }

    // ── Scope 2: Favorites Only ──
    if (scope === 'favorites') {
      let favList = state.favorites;
      if (tierFilter !== 'ALL') {
        favList = favList.filter((f) => f.tier === tierFilter);
      }

      return favList
        .map((fav) => {
          const entry = state.entries.find((e) => e.id === fav.entryId);
          if (!entry) return null;

          const genres = (entry.genreTagIds || []).map((id) => genreMap.get(id) || '').filter(Boolean).join(', ');
          const actors = (entry.mainActorIds || []).map((id) => actorMap.get(id) || '').filter(Boolean).join(', ');
          const top10Ranks = (top10ByEntryId.get(entry.id) || [])
            .map((t) => `${t.year} (#${t.rank})`)
            .join('; ');
          const top10Comments = (top10ByEntryId.get(entry.id) || [])
            .map((t) => (t.commentary ? `${t.year} (#${t.rank}): ${t.commentary}` : ''))
            .filter(Boolean)
            .join(' | ');

          return {
            title: formatEntryTitle(entry),
            type: entry.type,
            year: entry.year,
            country: entry.country,
            status: entry.status,
            totalEpisodes: entry.totalEpisodes ?? '',
            genres,
            actors,
            favoriteTier: formatTierLabel(fav.tier),
            overallScore: fav.overallScore != null ? fav.overallScore.toFixed(1) : '',
            storyline: fav.ratings?.storyline ?? '',
            acting: fav.ratings?.acting ?? '',
            chemistry: fav.ratings?.chemistry ?? '',
            production: fav.ratings?.production ?? '',
            rewatchValue: fav.ratings?.rewatchValue ?? '',
            personalComment: fav.personalComment || '',
            top10Rank: top10Ranks,
            top10Commentary: top10Comments,
            episodeRatingsSummary: entry.episodeRatings
              ? `${Object.keys(entry.episodeRatings).length} eps rated`
              : '',
            plannedDate: entry.plannedDate ?? '',
            createdAt: entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '',
            lastUpdatedAt: entry.lastUpdatedAt ? new Date(entry.lastUpdatedAt).toLocaleDateString() : '',
            franchiseInfo: entry.parentEntryId ? `Parent: ${parentMap.get(entry.parentEntryId) || ''}` : '',
          };
        })
        .filter((r): r is Record<string, unknown> => r !== null);
    }

    // ── Scope 3: Full Watchlist & Comprehensive ──
    let entryList = state.entries;
    if (statusFilter !== 'ALL') {
      entryList = entryList.filter((e) => e.status === statusFilter);
    }

    return entryList.map((entry) => {
      const fav = favMap.get(entry.id);
      const evalItem = fav || ratingMap.get(entry.id);
      const genres = (entry.genreTagIds || []).map((id) => genreMap.get(id) || '').filter(Boolean).join(', ');
      const actors = (entry.mainActorIds || []).map((id) => actorMap.get(id) || '').filter(Boolean).join(', ');

      const top10Ranks = (top10ByEntryId.get(entry.id) || [])
        .map((t) => `${t.year} (#${t.rank})`)
        .join('; ');
      const top10Comments = (top10ByEntryId.get(entry.id) || [])
        .map((t) => (t.commentary ? `${t.year} (#${t.rank}): ${t.commentary}` : ''))
        .filter(Boolean)
        .join(' | ');

      return {
        title: formatEntryTitle(entry),
        type: entry.type,
        year: entry.year,
        country: entry.country,
        status: entry.status,
        totalEpisodes: entry.totalEpisodes ?? '',
        genres,
        actors,
        overallScore: evalItem?.overallScore != null ? evalItem.overallScore.toFixed(1) : '',
        favoriteTier: formatTierLabel(fav?.tier),
        storyline: evalItem?.ratings?.storyline ?? '',
        acting: evalItem?.ratings?.acting ?? '',
        chemistry: evalItem?.ratings?.chemistry ?? '',
        production: evalItem?.ratings?.production ?? '',
        rewatchValue: evalItem?.ratings?.rewatchValue ?? '',
        personalComment: evalItem?.personalComment ?? '',
        top10Rank: top10Ranks,
        top10Commentary: top10Comments,
        episodeRatingsSummary: entry.episodeRatings
          ? `${Object.keys(entry.episodeRatings).length} eps rated`
          : '',
        plannedDate: entry.plannedDate ?? '',
        createdAt: entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '',
        lastUpdatedAt: entry.lastUpdatedAt ? new Date(entry.lastUpdatedAt).toLocaleDateString() : '',
        franchiseInfo: entry.parentEntryId ? `Parent: ${parentMap.get(entry.parentEntryId) || ''}` : '',
      };
    });
  }, [
    scope,
    statusFilter,
    tierFilter,
    top10YearFilter,
    state.entries,
    state.favorites,
    state.ratings,
    state.top10Drawers,
    state.genreTags,
    state.actors,
  ]);

  // Execute export download
  const handleExportNow = useCallback(() => {
    if (resolvedExportData.length === 0 || activeFields.length === 0) return;

    const dateStr = new Date().toISOString().split('T')[0];
    const scopePrefix =
      scope === 'favorites'
        ? 'bl-favorites'
        : scope === 'top10'
        ? 'bl-top10-rankings'
        : scope === 'comprehensive'
        ? 'bl-full-data'
        : 'bl-watchlist';

    const filename = `${scopePrefix}-${dateStr}.${format}`;

    // Filter each row to only contain the activeFields
    const filteredRows = resolvedExportData.map((row) => {
      const obj: Record<string, unknown> = {};
      for (const field of activeFields) {
        obj[field.key] = row[field.key] ?? '';
      }
      return obj;
    });

    if (format === 'json') {
      const jsonContent = JSON.stringify(filteredRows, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // CSV format
      const escapeCsvCell = (val: unknown): string => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const headerLine = activeFields.map((f) => escapeCsvCell(f.label)).join(',');
      const dataLines = filteredRows.map((row) =>
        activeFields.map((f) => escapeCsvCell(row[f.key])).join(','),
      );

      // Prepend UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility
      const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    onClose();
  }, [resolvedExportData, activeFields, scope, format, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-[#111] text-white border-white/[0.08] p-0 overflow-hidden rounded-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-white/[0.08] bg-[#141414]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E50914]/10 border border-[#E50914]/20 flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-[#E50914]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">Custom Export System</DialogTitle>
              <DialogDescription className="text-xs text-[#888] mt-0.5">
                Export your watchlist, favorites, or Top 10 rankings to CSV or JSON with custom fields.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* ── 1. Select Collection / Scope ── */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#AAA] uppercase tracking-wider">
              1. Choose Data Collection
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'watchlist', label: 'Watchlist', icon: Film, count: state.entries.length },
                { id: 'favorites', label: 'Favorites', icon: Heart, count: state.favorites.length },
                {
                  id: 'top10',
                  label: 'Top 10 Rankings',
                  icon: Star,
                  count: state.top10Drawers.reduce((acc, d) => acc + d.entries.length, 0),
                },
                { id: 'comprehensive', label: 'Full Data', icon: Layers, count: state.entries.length },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = scope === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setScope(item.id as ExportScope)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all tap-active ${
                      isSelected
                        ? 'bg-[#E50914]/10 border-[#E50914] text-white shadow-sm'
                        : 'bg-white/[0.03] border-white/[0.06] text-[#888] hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-[#E50914]' : 'text-[#666]'}`} />
                    <span className="text-xs font-semibold">{item.label}</span>
                    <span className="text-[10px] text-[#666] mt-0.5">{item.count} items</span>
                  </button>
                );
              })}
            </div>

            {/* Scope Sub-filters */}
            {scope === 'watchlist' && (
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="text-[#777] font-medium">Filter by Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'ALL' | Status)}
                  className="bg-[#1a1a1a] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:border-[#E50914] outline-none"
                >
                  <option value="ALL">All Statuses ({state.entries.length})</option>
                  <option value="COMPLETE">
                    Completed Only ({state.entries.filter((e) => e.status === 'COMPLETE').length})
                  </option>
                  <option value="ONGOING">
                    Ongoing Only ({state.entries.filter((e) => e.status === 'ONGOING').length})
                  </option>
                  <option value="PLANNED">
                    Planned Only ({state.entries.filter((e) => e.status === 'PLANNED').length})
                  </option>
                  <option value="DROPPED">
                    Dropped Only ({state.entries.filter((e) => e.status === 'DROPPED').length})
                  </option>
                </select>
              </div>
            )}

            {scope === 'favorites' && (
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="text-[#777] font-medium">Filter Tier:</span>
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value as 'ALL' | FavoriteTier)}
                  className="bg-[#1a1a1a] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:border-[#E50914] outline-none"
                >
                  <option value="ALL">All Tiers ({state.favorites.length})</option>
                  <option value="topTier">
                    Top Tier ({state.favorites.filter((f) => f.tier === 'topTier').length})
                  </option>
                  <option value="highTier">
                    High Tier ({state.favorites.filter((f) => f.tier === 'highTier').length})
                  </option>
                  <option value="comfortTier">
                    Comfort Tier ({state.favorites.filter((f) => f.tier === 'comfortTier').length})
                  </option>
                </select>
              </div>
            )}

            {scope === 'top10' && top10Years.length > 0 && (
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="text-[#777] font-medium">Filter Year:</span>
                <select
                  value={top10YearFilter}
                  onChange={(e) =>
                    setTop10YearFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
                  }
                  className="bg-[#1a1a1a] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:border-[#E50914] outline-none"
                >
                  <option value="ALL">All Years</option>
                  {top10Years.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr} Ranking
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ── 2. Select Export Format ── */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#AAA] uppercase tracking-wider">
              2. Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all tap-active ${
                  format === 'csv'
                    ? 'bg-[#E50914]/10 border-[#E50914] text-white shadow-sm'
                    : 'bg-white/[0.03] border-white/[0.06] text-[#888] hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    format === 'csv' ? 'bg-[#E50914]/20 text-[#E50914]' : 'bg-white/[0.06] text-[#666]'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">CSV Spreadsheet (.csv)</p>
                  <p className="text-[11px] text-[#777] mt-0.5">
                    Ready for Excel, Google Sheets, Notion & Numbers (UTF-8)
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('json')}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all tap-active ${
                  format === 'json'
                    ? 'bg-[#E50914]/10 border-[#E50914] text-white shadow-sm'
                    : 'bg-white/[0.03] border-white/[0.06] text-[#888] hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    format === 'json' ? 'bg-[#E50914]/20 text-[#E50914]' : 'bg-white/[0.06] text-[#666]'
                  }`}
                >
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">JSON Data (.json)</p>
                  <p className="text-[11px] text-[#777] mt-0.5">
                    Structured array of records formatted with 2-space indentation
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* ── 3. Selective Export Toggle ── */}
          <div className="space-y-3 pt-2 border-t border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#E50914]" />
                <div>
                  <p className="text-xs font-bold text-white">Selective Export</p>
                  <p className="text-[11px] text-[#777]">
                    Choose specific columns and data points to include
                  </p>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                type="button"
                role="switch"
                aria-checked={selectiveExport}
                onClick={() => setSelectiveExport(!selectiveExport)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  selectiveExport ? 'bg-[#E50914]' : 'bg-white/20'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    selectiveExport ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Field Selection Checklist (when Selective Export is ON) */}
            {selectiveExport && (
              <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <span className="text-[11px] font-semibold text-[#888]">
                    {selectedFields.size} of {ALL_FIELDS.length} fields selected
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllFields}
                      className="text-[11px] font-medium text-red-400 hover:text-red-300"
                    >
                      Select All
                    </button>
                    <span className="text-[#444]">•</span>
                    <button
                      type="button"
                      onClick={resetFieldsToDefault}
                      className="text-[11px] font-medium text-[#777] hover:text-white"
                    >
                      Reset Defaults
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {ALL_FIELDS.map((field) => {
                    const isChecked = selectedFields.has(field.key);
                    return (
                      <label
                        key={field.key}
                        onClick={() => toggleField(field.key)}
                        className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                          isChecked
                            ? 'bg-white/[0.05] text-white font-medium'
                            : 'text-[#666] hover:bg-white/[0.02]'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-[#E50914] flex-shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-[#555] flex-shrink-0" />
                        )}
                        <span className="truncate">{field.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-[#141414] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#888]">
            <Info className="w-3.5 h-3.5 text-[#666]" />
            <span>
              Exporting <strong className="text-white">{resolvedExportData.length}</strong> items with{' '}
              <strong className="text-white">{activeFields.length}</strong> fields in{' '}
              <strong className="text-white uppercase">{format}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#888] hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={resolvedExportData.length === 0 || activeFields.length === 0}
              onClick={handleExportNow}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#E50914] text-white hover:bg-[#E50914]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed tap-active shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
