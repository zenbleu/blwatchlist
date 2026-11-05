import { useState, useMemo, useCallback } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileCode,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Layers,
  Star,
  Heart,
  Film,
  Info,
  X,
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
import {
  formatRating,
  getBonusCount,
  getEpisodeAverage,
  getEffectiveStorylineRating,
} from '@/lib/rating';
import type { Entry, Status, FavoriteEntry } from '@/types';

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
  | 'overallRating'
  | 'isFavorite'
  | 'storyline'
  | 'acting'
  | 'chemistry'
  | 'production'
  | 'music'
  | 'rewatchValue'
  | 'bonusCount'
  | 'top10Rank'
  | 'episodeRatingsSummary'
  | 'plannedDate'
  | 'plannedTime'
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
  // Core Info
  { key: 'title', label: 'Title', category: 'core', defaultEnabled: true },
  { key: 'type', label: 'Type (Movie/Series)', category: 'core', defaultEnabled: true },
  { key: 'year', label: 'Release Year', category: 'core', defaultEnabled: true },
  { key: 'country', label: 'Country', category: 'core', defaultEnabled: true },
  { key: 'status', label: 'Watch Status', category: 'core', defaultEnabled: true },
  { key: 'totalEpisodes', label: 'Total Episodes', category: 'core', defaultEnabled: true },
  // People & Tags
  { key: 'genres', label: 'Genres', category: 'people', defaultEnabled: true },
  { key: 'actors', label: 'Main Cast / Actors', category: 'people', defaultEnabled: true },
  // Ratings & Review
  { key: 'overallRating', label: 'Overall Rating (1–10)', category: 'ratings', defaultEnabled: true },
  { key: 'isFavorite', label: 'In Favorites (Yes/No)', category: 'ratings', defaultEnabled: true },
  { key: 'storyline', label: 'Storyline Score', category: 'ratings', defaultEnabled: true },
  { key: 'acting', label: 'Acting Score', category: 'ratings', defaultEnabled: true },
  { key: 'chemistry', label: 'Chemistry Score', category: 'ratings', defaultEnabled: true },
  { key: 'production', label: 'Production Score', category: 'ratings', defaultEnabled: true },
  { key: 'music', label: 'Music Score', category: 'ratings', defaultEnabled: true },
  { key: 'rewatchValue', label: 'Rewatch Value (Bonus)', category: 'ratings', defaultEnabled: false },
  { key: 'bonusCount', label: 'Bonus Category Count', category: 'ratings', defaultEnabled: false },
  { key: 'episodeRatingsSummary', label: 'Episode Ratings Summary', category: 'ratings', defaultEnabled: false },
  // Rankings & Franchise
  { key: 'top10Rank', label: 'Top 10 Rankings (Year & Rank)', category: 'rankings', defaultEnabled: true },
  { key: 'franchiseInfo', label: 'Franchise & Season Info', category: 'rankings', defaultEnabled: false },
  // Metadata & Dates
  { key: 'plannedDate', label: 'Planned Air Date', category: 'meta', defaultEnabled: false },
  { key: 'plannedTime', label: 'Planned Air Time', category: 'meta', defaultEnabled: false },
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
  const [favTypeFilter, setFavTypeFilter] = useState<'ALL' | 'Movie' | 'Series'>('ALL');
  const [top10YearFilter, setTop10YearFilter] = useState<'ALL' | number>('ALL');

  const [format, setFormat] = useState<ExportFormat>('csv');
  const [selectiveExport, setSelectiveExport] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<FieldKey>>(
    () => new Set(DEFAULT_ENABLED_KEYS),
  );

  // Years available in Top 10 drawers
  const top10Years = useMemo(() => {
    return Array.from(new Set(state.top10Drawers.map((d) => d.year))).sort((a, b) => b - a);
  }, [state.top10Drawers]);

  // Handle individual field toggle
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

  // Bulk selectors
  const selectAllFields = useCallback(() => {
    setSelectedFields(new Set(ALL_FIELDS.map((f) => f.key)));
  }, []);

  const deselectAllFields = useCallback(() => {
    setSelectedFields(new Set());
  }, []);

  // Compute active fields based on selective export toggle & scope
  const activeFields = useMemo(() => {
    if (!selectiveExport) {
      if (scope === 'favorites') {
        return ALL_FIELDS.filter((f) =>
          [
            'title',
            'type',
            'year',
            'country',
            'overallRating',
            'storyline',
            'acting',
            'chemistry',
            'production',
            'music',
            'rewatchValue',
            'genres',
            'actors',
            'top10Rank',
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
            'overallRating',
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
    const genreMap = new Map<string, string>(state.genreTags.map((g) => [g.id, g.name]));
    const parentMap = new Map<string, string>(state.entries.map((e) => [e.id, e.title]));
    const favMap = new Map<string, FavoriteEntry>(state.favorites.map((f) => [f.entryId, f]));
    const ratingMap = new Map<string, FavoriteEntry>(state.ratings.map((r) => [r.entryId, r]));

    // Map actors to entry IDs
    const actorsByEntryId = new Map<string, string[]>();
    for (const actor of state.actors) {
      for (const cred of actor.filmography || []) {
        const list = actorsByEntryId.get(cred.entryId) || [];
        list.push(actor.name);
        actorsByEntryId.set(cred.entryId, list);
      }
    }

    // Top 10 map: entryId -> { year: number; rank: number }[]
    const top10ByEntryId = new Map<string, { year: number; rank: number }[]>();
    for (const drawer of state.top10Drawers) {
      for (const item of drawer.entries) {
        const existing = top10ByEntryId.get(item.entryId) || [];
        existing.push({ year: drawer.year, rank: item.rank });
        top10ByEntryId.set(item.entryId, existing);
      }
    }

    const buildRow = (
      entry: Entry,
      evalItem?: FavoriteEntry,
      isFav?: boolean,
      customTop10Rank?: string,
    ): Record<FieldKey, string | number> => {
      const genres = (entry.genres || [])
        .map((id) => genreMap.get(id) || id)
        .filter(Boolean)
        .join(', ');
      const actors = (actorsByEntryId.get(entry.id) || []).join(', ');
      const top10Ranks =
        customTop10Rank ??
        (top10ByEntryId.get(entry.id) || [])
          .map((t) => `${t.year} (#${t.rank})`)
          .join('; ');
      const epAverage = getEpisodeAverage(entry.episodeRatings);
      const epCount = entry.episodeRatings ? Object.keys(entry.episodeRatings).length : 0;
      const epSummary =
        epCount > 0
          ? `${epCount} eps rated (Avg: ${epAverage !== null ? formatRating(epAverage) : 'N/A'})`
          : '';
      const effStoryline = evalItem?.storyline ?? getEffectiveStorylineRating(entry);

      return {
        title: formatEntryTitle(entry),
        type: entry.type,
        year: entry.year,
        country: entry.country,
        status: entry.status,
        totalEpisodes: entry.totalEpisodes ?? '',
        genres,
        actors,
        overallRating: evalItem?.overallRating != null ? formatRating(evalItem.overallRating) : '',
        isFavorite: isFav ? 'Yes' : favMap.has(entry.id) ? 'Yes' : 'No',
        storyline: effStoryline != null ? formatRating(effStoryline) : '',
        acting: evalItem?.acting != null ? formatRating(evalItem.acting) : '',
        chemistry: evalItem?.chemistry != null ? formatRating(evalItem.chemistry) : '',
        production: evalItem?.production != null ? formatRating(evalItem.production) : '',
        music: evalItem?.music != null ? formatRating(evalItem.music) : '',
        rewatchValue: evalItem?.rewatchValue ? 'Yes' : evalItem ? 'No' : '',
        bonusCount: evalItem ? getBonusCount(evalItem) : '',
        episodeRatingsSummary: epSummary,
        top10Rank: top10Ranks,
        franchiseInfo: entry.parentEntryId
          ? `Parent: ${parentMap.get(entry.parentEntryId) || entry.parentEntryId}`
          : '',
        plannedDate: entry.plannedDate ?? '',
        plannedTime: entry.plannedTime ?? '',
        createdAt: entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '',
        lastUpdatedAt: entry.lastUpdatedAt ? new Date(entry.lastUpdatedAt).toLocaleDateString() : '',
      };
    };

    // ── Scope 1: Top 10 specific export ──
    if (scope === 'top10') {
      const rows: Record<FieldKey, string | number>[] = [];
      for (const drawer of state.top10Drawers) {
        if (top10YearFilter !== 'ALL' && drawer.year !== top10YearFilter) continue;

        for (const item of drawer.entries) {
          const entry = state.entries.find((e) => e.id === item.entryId);
          if (!entry) continue;

          const fav = favMap.get(entry.id);
          const evalItem = fav || ratingMap.get(entry.id);
          rows.push(buildRow(entry, evalItem, Boolean(fav), `${drawer.year} Rank #${item.rank}`));
        }
      }
      return rows;
    }

    // ── Scope 2: Favorites Only ──
    if (scope === 'favorites') {
      const rows: Record<FieldKey, string | number>[] = [];
      for (const fav of state.favorites) {
        const entry = state.entries.find((e) => e.id === fav.entryId);
        if (!entry) continue;
        if (favTypeFilter !== 'ALL' && entry.type !== favTypeFilter) continue;
        rows.push(buildRow(entry, fav, true));
      }
      return rows;
    }

    // ── Scope 3: Full Watchlist & Scope 4: Comprehensive ──
    let entryList = state.entries;
    if (scope === 'watchlist' && statusFilter !== 'ALL') {
      entryList = entryList.filter((e) => e.status === statusFilter);
    }

    return entryList.map((entry) => {
      const fav = favMap.get(entry.id);
      const evalItem = fav || ratingMap.get(entry.id);
      return buildRow(entry, evalItem, Boolean(fav));
    });
  }, [
    scope,
    statusFilter,
    favTypeFilter,
    top10YearFilter,
    state.entries,
    state.favorites,
    state.ratings,
    state.top10Drawers,
    state.genreTags,
    state.actors,
  ]);

  // Download Trigger
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
      const obj: Record<string, string | number> = {};
      for (const field of activeFields) {
        obj[field.key] = row[field.key] ?? '';
      }
      return obj;
    });

    if (format === 'json') {
      const jsonContent = JSON.stringify(
        {
          exportMetadata: {
            scope,
            format,
            date: new Date().toISOString(),
            totalRecords: filteredRows.length,
            selectedFields: activeFields.map((f) => f.key),
          },
          data: filteredRows,
        },
        null,
        2,
      );
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
      // CSV format with RFC 4180 escaping and UTF-8 BOM
      const escapeCsvCell = (val: unknown): string => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const headers = activeFields.map((f) => escapeCsvCell(f.label)).join(',');
      const csvLines = filteredRows.map((row) =>
        activeFields.map((f) => escapeCsvCell(row[f.key])).join(','),
      );
      // Prepend UTF-8 BOM (\uFEFF) so Excel opens UTF-8 characters without mojibake
      const csvContent = '\uFEFF' + [headers, ...csvLines].join('\r\n');
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
  }, [resolvedExportData, activeFields, scope, format]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] bg-[#141414] border border-white/10 text-white p-0 flex flex-col overflow-hidden shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#E50914]/15 border border-[#E50914]/30 flex items-center justify-center text-[#E50914]">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight text-white">
                  Custom Data Export
                </DialogTitle>
                <DialogDescription className="text-xs text-[#888]">
                  Export watchlist, favorites, or rankings to CSV or JSON
                </DialogDescription>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#888] hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-sm">
          {/* 1. Scope Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#888] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#E50914]" />
              Export Scope
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setScope('watchlist')}
                className={`p-3 rounded-xl border text-left transition-colors tap-active flex flex-col gap-1 ${
                  scope === 'watchlist'
                    ? 'bg-[#E50914]/15 border-[#E50914] text-white'
                    : 'bg-[#1a1a1a] border-white/[0.08] text-[#999] hover:text-white hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Film className="w-4 h-4" />
                  <span className="text-[11px] font-mono text-[#777]">
                    {state.entries.length}
                  </span>
                </div>
                <span className="text-xs font-semibold mt-1">Watchlist</span>
                <span className="text-[10px] text-[#666] leading-tight">All catalog titles</span>
              </button>

              <button
                type="button"
                onClick={() => setScope('favorites')}
                className={`p-3 rounded-xl border text-left transition-colors tap-active flex flex-col gap-1 ${
                  scope === 'favorites'
                    ? 'bg-[#E50914]/15 border-[#E50914] text-white'
                    : 'bg-[#1a1a1a] border-white/[0.08] text-[#999] hover:text-white hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Heart className="w-4 h-4 text-rose-400" />
                  <span className="text-[11px] font-mono text-[#777]">
                    {state.favorites.length}
                  </span>
                </div>
                <span className="text-xs font-semibold mt-1">Favorites</span>
                <span className="text-[10px] text-[#666] leading-tight">Evaluated favorites</span>
              </button>

              <button
                type="button"
                onClick={() => setScope('top10')}
                className={`p-3 rounded-xl border text-left transition-colors tap-active flex flex-col gap-1 ${
                  scope === 'top10'
                    ? 'bg-[#E50914]/15 border-[#E50914] text-white'
                    : 'bg-[#1a1a1a] border-white/[0.08] text-[#999] hover:text-white hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span className="text-[11px] font-mono text-[#777]">
                    {state.top10Drawers.reduce((acc, d) => acc + d.entries.length, 0)}
                  </span>
                </div>
                <span className="text-xs font-semibold mt-1">Top 10</span>
                <span className="text-[10px] text-[#666] leading-tight">Annual rankings</span>
              </button>

              <button
                type="button"
                onClick={() => setScope('comprehensive')}
                className={`p-3 rounded-xl border text-left transition-colors tap-active flex flex-col gap-1 ${
                  scope === 'comprehensive'
                    ? 'bg-[#E50914]/15 border-[#E50914] text-white'
                    : 'bg-[#1a1a1a] border-white/[0.08] text-[#999] hover:text-white hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] font-mono text-[#777]">
                    {state.entries.length}
                  </span>
                </div>
                <span className="text-xs font-semibold mt-1">Comprehensive</span>
                <span className="text-[10px] text-[#666] leading-tight">Joined dataset</span>
              </button>
            </div>

            {/* Scope contextual filters */}
            {scope === 'watchlist' && (
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="text-[#777] font-medium">Filter Status:</span>
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
                <span className="text-[#777] font-medium">Filter Type:</span>
                <select
                  value={favTypeFilter}
                  onChange={(e) => setFavTypeFilter(e.target.value as 'ALL' | 'Movie' | 'Series')}
                  className="bg-[#1a1a1a] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:border-[#E50914] outline-none"
                >
                  <option value="ALL">All Types ({state.favorites.length})</option>
                  <option value="Series">Series Only</option>
                  <option value="Movie">Movies Only</option>
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
                      {yr} Drawer
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. Format Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
              Output Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-colors tap-active ${
                  format === 'csv'
                    ? 'bg-white/[0.08] border-[#E50914] text-white shadow-sm'
                    : 'bg-[#1a1a1a] border-white/[0.08] text-[#999] hover:text-white hover:border-white/20'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    format === 'csv' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.04]'
                  }`}
                >
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold">CSV Spreadsheet</div>
                  <div className="text-[11px] text-[#666]">Excel, Google Sheets (UTF-8)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('json')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-colors tap-active ${
                  format === 'json'
                    ? 'bg-white/[0.08] border-[#E50914] text-white shadow-sm'
                    : 'bg-[#1a1a1a] border-white/[0.08] text-[#999] hover:text-white hover:border-white/20'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    format === 'json' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/[0.04]'
                  }`}
                >
                  <FileCode className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold">JSON Format</div>
                  <div className="text-[11px] text-[#666]">Structured raw data</div>
                </div>
              </button>
            </div>
          </div>

          {/* 3. Selective Export Toggle */}
          <div className="p-4 rounded-xl bg-[#1a1a1a] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <SlidersHorizontal className="w-4 h-4 text-[#E50914]" />
                <div>
                  <div className="text-xs font-semibold text-white">Selective Export</div>
                  <div className="text-[11px] text-[#777]">
                    Choose specific data fields to include in your export
                  </div>
                </div>
              </div>

              {/* Custom Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={selectiveExport}
                onClick={() => setSelectiveExport(!selectiveExport)}
                className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                  selectiveExport ? 'bg-[#E50914]' : 'bg-white/20'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                    selectiveExport ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Field Checkbox Picker (When Selective Export is ON) */}
            {selectiveExport && (
              <div className="pt-3 border-t border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between text-xs text-[#888]">
                  <span>
                    Fields selected: <strong className="text-white">{selectedFields.size}</strong> /{' '}
                    {ALL_FIELDS.length}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllFields}
                      className="text-[#E50914] hover:underline text-[11px] font-semibold"
                    >
                      Select All
                    </button>
                    <span className="text-[#444]">|</span>
                    <button
                      type="button"
                      onClick={deselectAllFields}
                      className="text-[#888] hover:text-white text-[11px]"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {(
                    [
                      { id: 'core', title: 'Core Information' },
                      { id: 'people', title: 'Cast & Tags' },
                      { id: 'ratings', title: 'Ratings & Evaluation' },
                      { id: 'rankings', title: 'Rankings & Franchise' },
                      { id: 'meta', title: 'Metadata & Timestamps' },
                    ] as const
                  ).map((cat) => {
                    const fieldsInCat = ALL_FIELDS.filter((f) => f.category === cat.id);
                    if (fieldsInCat.length === 0) return null;

                    return (
                      <div key={cat.id} className="space-y-1.5">
                        <div className="text-[11px] font-semibold text-[#666] uppercase tracking-wider">
                          {cat.title}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {fieldsInCat.map((f) => {
                            const isChecked = selectedFields.has(f.key);
                            return (
                              <button
                                key={f.key}
                                type="button"
                                onClick={() => toggleField(f.key)}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left text-xs transition-colors ${
                                  isChecked
                                    ? 'bg-white/[0.06] border-white/20 text-white'
                                    : 'bg-transparent border-white/[0.04] text-[#666] hover:text-[#999]'
                                }`}
                              >
                                {isChecked ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-[#E50914] flex-shrink-0" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-[#555] flex-shrink-0" />
                                )}
                                <span className="truncate">{f.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Info Box */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-[11px] text-[#777]">
            <Info className="w-4 h-4 text-[#888] flex-shrink-0 mt-0.5" />
            <div>
              CSV files are saved with a <strong>UTF-8 BOM</strong> to ensure Asian character sets
              (Thai, Japanese, Korean, Chinese) display accurately in Microsoft Excel and Numbers.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] bg-[#111] flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-[#888]">
            Will export <strong className="text-white">{resolvedExportData.length}</strong> record
            {resolvedExportData.length !== 1 ? 's' : ''} with{' '}
            <strong className="text-white">{activeFields.length}</strong> column
            {activeFields.length !== 1 ? 's' : ''}
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
