import { useState, useMemo, useCallback } from 'react';
import {
  GitBranch,
  Calendar,
  Layers,
  ArrowRight,
  CheckCircle2,
  Star,
  Users,
  Search,
  BookOpen,
  Eye,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatEntryTitle, getEntryRelationshipLabel } from '@/lib/entry';
import { formatRating } from '@/lib/rating';
import type { Entry, Status } from '@/types';
import Poster from './Poster';
import StatusBadge from './StatusBadge';

export interface FranchiseUniverse {
  id: string;
  title: string;
  type: 'saga' | 'anthology' | 'adaptation' | 'series';
  country: string;
  entries: Entry[];
  yearStart: number;
  yearEnd: number;
  leadPoster: string | null;
  allPosters: string[];
  totalEpisodes: number;
  stats: {
    total: number;
    completed: number;
    ongoing: number;
    planned: number;
    dropped: number;
    percent: number;
  };
  averageRating: number | null;
  recurringActors: string[];
}

interface FranchiseTimelineProps {
  onSelectEntry: (entry: Entry) => void;
}

export default function FranchiseTimeline({ onSelectEntry }: FranchiseTimelineProps) {
  const { state } = useApp();

  // Primary view mode: 'universes' (grouped story worlds) or 'chronology' (all titles master timeline)
  const [timelineMode, setTimelineMode] = useState<'universes' | 'chronology'>('universes');

  // Selected universe for deep inspection
  const [selectedUniverseId, setSelectedUniverseId] = useState<string | null>(null);

  // Ordering in deep universe inspection: 'release' or 'watch'
  const [universeOrder, setUniverseOrder] = useState<'release' | 'watch'>('watch');

  // Search & Filters for universes
  const [universeSearch, setUniverseSearch] = useState('');
  const [universeFilterType, setUniverseFilterType] = useState<'all' | 'saga' | 'anthology' | 'adaptation'>('all');

  // Search & Filters for master chronology
  const [chronoSearch, setChronoSearch] = useState('');
  const [chronoStatus, setChronoStatus] = useState<'ALL' | Status>('ALL');
  const [chronoType, setChronoType] = useState<'ALL' | 'Movie' | 'Series'>('ALL');
  const [chronoCountry, setChronoCountry] = useState<string>('ALL');
  const [chronoFranchiseOnly, setChronoFranchiseOnly] = useState<boolean>(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Map actors by entryId for quick recurring-actor detection
  const actorsByEntryId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const actor of state.actors) {
      for (const credit of actor.filmography || []) {
        const list = map.get(credit.entryId) || [];
        list.push(actor.name);
        map.set(credit.entryId, list);
      }
    }
    return map;
  }, [state.actors]);

  // Map ratings/favorites by entryId
  const ratingsByEntryId = useMemo(() => {
    const map = new Map<string, number>();
    for (const fav of state.favorites) {
      if (fav.overallRating != null) {
        map.set(fav.entryId, fav.overallRating);
      }
    }
    for (const rating of state.ratings) {
      if (!map.has(rating.entryId) && rating.overallRating != null) {
        map.set(rating.entryId, rating.overallRating);
      }
    }
    return map;
  }, [state.favorites, state.ratings]);

  // ─────────────────────────────────────────────────────────────
  // UNIVERSE DETECTION ENGINE
  // Automatically clusters entries into connected story worlds via:
  // 1. parentEntryId graph components
  // 2. anthologyName groups
  // 3. common base title across multi-seasons
  // ─────────────────────────────────────────────────────────────
  const universes = useMemo<FranchiseUniverse[]>(() => {
    const entries = state.entries;
    if (entries.length === 0) return [];

    const entryMap = new Map<string, Entry>(entries.map((e) => [e.id, e]));

    // Graph adjacency for linked releases (undirected)
    const adj = new Map<string, Set<string>>();
    for (const e of entries) {
      if (!adj.has(e.id)) adj.set(e.id, new Set());
      if (e.parentEntryId && entryMap.has(e.parentEntryId)) {
        if (!adj.has(e.parentEntryId)) adj.set(e.parentEntryId, new Set());
        adj.get(e.id)!.add(e.parentEntryId);
        adj.get(e.parentEntryId)!.add(e.id);
      }
    }

    // Also link entries sharing the exact same non-empty anthologyName
    const anthologyGroups = new Map<string, string[]>();
    for (const e of entries) {
      if (e.anthologyName && e.anthologyName.trim()) {
        const norm = e.anthologyName.trim().toLocaleLowerCase();
        const list = anthologyGroups.get(norm) || [];
        list.push(e.id);
        anthologyGroups.set(norm, list);
      }
    }
    for (const group of anthologyGroups.values()) {
      if (group.length > 1) {
        for (let i = 0; i < group.length - 1; i++) {
          adj.get(group[i])?.add(group[i + 1]);
          adj.get(group[i + 1])?.add(group[i]);
        }
      }
    }

    // Also link entries sharing the same normalized base title with explicit seasons
    // e.g. "TharnType" with season: 1 and "TharnType" with season: 2
    const titleRootGroups = new Map<string, string[]>();
    for (const e of entries) {
      if (e.season != null && e.season > 0) {
        const normTitle = e.title
          .replace(/season\s*\d+/gi, '')
          .replace(/s\d+/gi, '')
          .replace(/[:\-–—].*$/, '')
          .trim()
          .toLocaleLowerCase();
        if (normTitle.length >= 3) {
          const list = titleRootGroups.get(normTitle) || [];
          list.push(e.id);
          titleRootGroups.set(normTitle, list);
        }
      }
    }
    for (const group of titleRootGroups.values()) {
      if (group.length > 1) {
        for (let i = 0; i < group.length - 1; i++) {
          adj.get(group[i])?.add(group[i + 1]);
          adj.get(group[i + 1])?.add(group[i]);
        }
      }
    }

    // Traverse connected components
    const visited = new Set<string>();
    const clusters: Entry[][] = [];

    for (const entry of entries) {
      if (visited.has(entry.id)) continue;

      const cluster: Entry[] = [];
      const queue: string[] = [entry.id];
      visited.add(entry.id);

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const currentEntry = entryMap.get(currentId);
        if (currentEntry) cluster.push(currentEntry);

        const neighbors = adj.get(currentId) || new Set();
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push(neighborId);
          }
        }
      }

      // Only treat as a universe if it contains 2 or more connected titles
      if (cluster.length >= 2) {
        clusters.push(cluster);
      }
    }

    // Format each cluster into a FranchiseUniverse
    const result: FranchiseUniverse[] = clusters.map((cluster) => {
      // Sort cluster by release year ascending initially
      cluster.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return (a.plannedDate || '').localeCompare(b.plannedDate || '');
      });

      // Find root or primary entry
      // Prefer entry with no parentEntryId or season === 1 or original
      const rootEntry =
        cluster.find(
          (e) =>
            !e.parentEntryId && (e.relationshipType === 'original' || e.season === 1 || !e.season),
        ) || cluster[0];

      // Determine universe title
      let title = rootEntry.anthologyName
        ? `${rootEntry.anthologyName} Anthology`
        : `${rootEntry.title} Universe`;

      // If all entries share an anthology name
      const commonAnthology = cluster.every(
        (e) => e.anthologyName && e.anthologyName === rootEntry.anthologyName,
      );
      if (commonAnthology && rootEntry.anthologyName) {
        title = `${rootEntry.anthologyName} Anthology`;
      }

      // Determine universe type
      let type: FranchiseUniverse['type'] = 'saga';
      if (commonAnthology) {
        type = 'anthology';
      } else if (cluster.some((e) => e.relationshipType === 'adaptation')) {
        type = 'adaptation';
      } else if (cluster.every((e) => e.season != null)) {
        type = 'series';
      }

      // Year span
      const yearStart = Math.min(...cluster.map((e) => e.year));
      const yearEnd = Math.max(...cluster.map((e) => e.year));

      // Posters
      const leadPoster =
        rootEntry.poster || cluster.find((e) => e.poster)?.poster || null;
      const allPosters = cluster
        .map((e) => e.poster)
        .filter((p): p is string => Boolean(p));

      // Episodes
      const totalEpisodes = cluster.reduce(
        (acc, e) => acc + (e.totalEpisodes || e.specialNumber || 1),
        0,
      );

      // Countries
      const countries = Array.from(new Set(cluster.map((e) => e.country)));
      const country = countries.length === 1 ? countries[0] : 'International / Multi-Country';

      // Completion statistics
      const completed = cluster.filter((e) => e.status === 'COMPLETE').length;
      const ongoing = cluster.filter((e) => e.status === 'ONGOING').length;
      const planned = cluster.filter((e) => e.status === 'PLANNED').length;
      const dropped = cluster.filter((e) => e.status === 'DROPPED').length;
      const percent = Math.round((completed / cluster.length) * 100);

      // Average rating
      const ratedScores = cluster
        .map((e) => ratingsByEntryId.get(e.id))
        .filter((s): s is number => s != null);
      const averageRating =
        ratedScores.length > 0
          ? Math.round(
              (ratedScores.reduce((sum, val) => sum + val, 0) / ratedScores.length) * 10,
            ) / 10
          : null;

      // Recurring actors in universe
      const actorCounts = new Map<string, number>();
      for (const e of cluster) {
        const actorList = actorsByEntryId.get(e.id) || [];
        for (const actorName of actorList) {
          actorCounts.set(actorName, (actorCounts.get(actorName) || 0) + 1);
        }
      }
      const recurringActors = Array.from(actorCounts.entries())
        .filter(([, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name)
        .slice(0, 4);

      return {
        id: `universe_${rootEntry.id}`,
        title,
        type,
        country,
        entries: cluster,
        yearStart,
        yearEnd,
        leadPoster,
        allPosters,
        totalEpisodes,
        stats: {
          total: cluster.length,
          completed,
          ongoing,
          planned,
          dropped,
          percent,
        },
        averageRating,
        recurringActors,
      };
    });

    // Sort universes by total entries descending, then recent year
    return result.sort((a, b) => {
      if (b.entries.length !== a.entries.length) {
        return b.entries.length - a.entries.length;
      }
      return b.yearEnd - a.yearEnd;
    });
  }, [state.entries, actorsByEntryId, ratingsByEntryId]);

  // Universe map by entryId to easily link any entry to its franchise
  const entryToUniverseMap = useMemo(() => {
    const map = new Map<string, FranchiseUniverse>();
    for (const u of universes) {
      for (const e of u.entries) {
        map.set(e.id, u);
      }
    }
    return map;
  }, [universes]);

  // Currently active selected universe object
  const activeUniverse = useMemo(() => {
    if (!selectedUniverseId) return null;
    return universes.find((u) => u.id === selectedUniverseId) || null;
  }, [universes, selectedUniverseId]);

  // Sorted entries for the active universe depending on order mode
  const orderedUniverseEntries = useMemo(() => {
    if (!activeUniverse) return [];
    const list = [...activeUniverse.entries];

    if (universeOrder === 'release') {
      return list.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return (a.plannedDate || '').localeCompare(b.plannedDate || '');
      });
    }

    // In-universe watch order:
    // 1. Prequels
    // 2. Original / Season 1
    // 3. Season 2, Season 3, etc.
    // 4. Sequels
    // 5. Side Stories / Special Episodes
    // 6. Adaptations
    const getOrderRank = (e: Entry) => {
      if (e.spinOffDirection === 'prequel') return 10;
      if (e.relationshipType === 'original' || (e.season === 1 && !e.parentEntryId)) return 20;
      if (e.season != null && e.season > 0) return 30 + e.season;
      if (e.spinOffDirection === 'sequel') return 60;
      if (e.relationshipType === 'sideStory') return 70;
      if (e.relationshipType === 'specialEpisode') return 75;
      if (e.relationshipType === 'adaptation') return 90;
      return 50;
    };

    return list.sort((a, b) => {
      const rankA = getOrderRank(a);
      const rankB = getOrderRank(b);
      if (rankA !== rankB) return rankA - rankB;
      return a.year - b.year;
    });
  }, [activeUniverse, universeOrder]);

  // Filtered universes list
  const filteredUniverses = useMemo(() => {
    return universes.filter((u) => {
      if (universeFilterType !== 'all' && u.type !== universeFilterType) {
        return false;
      }
      if (universeSearch.trim()) {
        const query = universeSearch.trim().toLocaleLowerCase();
        const matchesTitle = u.title.toLocaleLowerCase().includes(query);
        const matchesEntries = u.entries.some((e) =>
          formatEntryTitle(e).toLocaleLowerCase().includes(query),
        );
        const matchesActors = u.recurringActors.some((a) =>
          a.toLocaleLowerCase().includes(query),
        );
        return matchesTitle || matchesEntries || matchesActors;
      }
      return true;
    });
  }, [universes, universeFilterType, universeSearch]);

  // ─────────────────────────────────────────────────────────────
  // MASTER CHRONOLOGY (ALL TITLES)
  // ─────────────────────────────────────────────────────────────
  const availableYears = useMemo(() => {
    return Array.from(new Set(state.entries.map((e) => e.year))).sort((a, b) => b - a);
  }, [state.entries]);

  const availableCountries = useMemo(() => {
    return Array.from(new Set(state.entries.map((e) => e.country))).sort();
  }, [state.entries]);

  const filteredChronoEntries = useMemo(() => {
    return state.entries
      .filter((e) => {
        if (chronoStatus !== 'ALL' && e.status !== chronoStatus) return false;
        if (chronoType !== 'ALL' && e.type !== chronoType) return false;
        if (chronoCountry !== 'ALL' && e.country !== chronoCountry) return false;
        if (chronoFranchiseOnly && !entryToUniverseMap.has(e.id)) return false;
        if (selectedYear != null && e.year !== selectedYear) return false;
        if (chronoSearch.trim()) {
          const q = chronoSearch.trim().toLocaleLowerCase();
          return (
            formatEntryTitle(e).toLocaleLowerCase().includes(q) ||
            e.country.toLocaleLowerCase().includes(q) ||
            (e.anthologyName || '').toLocaleLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return (b.plannedDate || '').localeCompare(a.plannedDate || '');
      });
  }, [
    state.entries,
    chronoStatus,
    chronoType,
    chronoCountry,
    chronoFranchiseOnly,
    selectedYear,
    chronoSearch,
    entryToUniverseMap,
  ]);

  // Group chronological entries by year
  const chronoByYear = useMemo(() => {
    const map = new Map<number, Entry[]>();
    for (const e of filteredChronoEntries) {
      const list = map.get(e.year) || [];
      list.push(e);
      map.set(e.year, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [filteredChronoEntries]);

  // Helper to open universe view for an entry
  const handleOpenUniverseFromEntry = useCallback(
    (entryId: string) => {
      const universe = entryToUniverseMap.get(entryId);
      if (universe) {
        setSelectedUniverseId(universe.id);
        setTimelineMode('universes');
      }
    },
    [entryToUniverseMap],
  );

  return (
    <div className="space-y-6">
      {/* ── Sub-Navigation Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <GitBranch className="w-5 h-5 text-[#E50914]" />
            <span>Franchise Universes &amp; Timelines</span>
          </h2>
          <p className="mt-1 text-xs text-[#888]">
            Interactive chronological roadmaps of multi-season BL sagas, anthologies, and release timelines
          </p>
        </div>

        {/* View Mode Segmented Control */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#141414] border border-white/[0.08] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setTimelineMode('universes');
              setSelectedUniverseId(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all tap-active ${
              timelineMode === 'universes'
                ? 'bg-[#E50914] text-white shadow-sm'
                : 'text-[#888] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Story Worlds &amp; Sagas ({universes.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTimelineMode('chronology')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all tap-active ${
              timelineMode === 'chronology'
                ? 'bg-[#E50914] text-white shadow-sm'
                : 'text-[#888] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Master Release Chronology</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MODE 1: FRANCHISE UNIVERSES & STORY WORLDS
         ═══════════════════════════════════════════════════════════ */}
      {timelineMode === 'universes' && (
        <>
          {/* DEEP UNIVERSE INSPECTION VIEW */}
          {activeUniverse ? (
            <div className="space-y-6">
              {/* Back to all universes */}
              <button
                type="button"
                onClick={() => setSelectedUniverseId(null)}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#888] hover:text-white transition-colors"
              >
                <span>&larr; Back to all story worlds</span>
              </button>

              {/* Active Universe Hero Card */}
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141414] p-5 sm:p-7">
                <div className="flex flex-col md:flex-row gap-5 items-start">
                  {/* Lead poster / collage */}
                  <div className="relative shrink-0">
                    <Poster
                      src={activeUniverse.leadPoster}
                      title={activeUniverse.title}
                      size="lg"
                      className="border border-white/10 shadow-2xl rounded-xl"
                    />
                  </div>

                  {/* Universe Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#888] mb-1.5">
                      <span className="font-semibold text-[#E50914] uppercase tracking-wider text-[10px]">
                        {activeUniverse.type === 'anthology'
                          ? 'Anthology Universe'
                          : activeUniverse.type === 'adaptation'
                          ? 'Cross-Country Franchise'
                          : 'Multi-Part Saga'}
                      </span>
                      <span>·</span>
                      <span>{activeUniverse.country}</span>
                      <span>·</span>
                      <span>
                        {activeUniverse.yearStart === activeUniverse.yearEnd
                          ? activeUniverse.yearStart
                          : `${activeUniverse.yearStart} – ${activeUniverse.yearEnd}`}
                      </span>
                      <span>·</span>
                      <span>{activeUniverse.totalEpisodes} total episodes</span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      {activeUniverse.title}
                    </h1>

                    {/* Completion progress bar */}
                    <div className="mt-4 max-w-md space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-[#aaa]">
                        <span className="font-medium">
                          Universe Progress: {activeUniverse.stats.completed} of{' '}
                          {activeUniverse.stats.total} titles completed
                        </span>
                        <span className="font-bold text-white">
                          {activeUniverse.stats.percent}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#E50914] to-rose-400 rounded-full transition-all duration-500"
                          style={{ width: `${activeUniverse.stats.percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Recurring Stars & Ratings */}
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[#888]">
                      {activeUniverse.averageRating != null && (
                        <div className="flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-white font-semibold">
                            {formatRating(activeUniverse.averageRating)}
                          </span>
                          <span className="text-[#666]">Avg Score</span>
                        </div>
                      )}

                      {activeUniverse.recurringActors.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#888]" />
                          <span>Key Leads:</span>
                          <span className="text-[#ccc] font-medium">
                            {activeUniverse.recurringActors.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Mode Switcher */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/[0.08] shrink-0 self-start md:self-auto">
                    <button
                      type="button"
                      onClick={() => setUniverseOrder('watch')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        universeOrder === 'watch'
                          ? 'bg-white/[0.12] text-white'
                          : 'text-[#777] hover:text-white'
                      }`}
                    >
                      <BookOpen className="w-3 h-3 text-[#E50914]" />
                      <span>Watch Order</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUniverseOrder('release')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        universeOrder === 'release'
                          ? 'bg-white/[0.12] text-white'
                          : 'text-[#777] hover:text-white'
                      }`}
                    >
                      <Calendar className="w-3 h-3 text-[#E50914]" />
                      <span>Release Year</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Interactive Timeline Stream */}
              <div className="relative pl-6 sm:pl-10 before:absolute before:left-3 sm:before:left-5 before:top-4 before:bottom-4 before:w-[2px] before:bg-gradient-to-b before:from-[#E50914] before:via-white/20 before:to-white/5 space-y-6">
                {orderedUniverseEntries.map((entry, idx) => {
                  const relLabel = getEntryRelationshipLabel(entry) || (entry.season ? `Season ${entry.season}` : 'Original');
                  const rating = ratingsByEntryId.get(entry.id);
                  const isCompleted = entry.status === 'COMPLETE';
                  const isOngoing = entry.status === 'ONGOING';

                  return (
                    <div key={entry.id} className="relative group">
                      {/* Timeline Node Bullet */}
                      <div
                        className={`absolute -left-6 sm:-left-10 top-5 w-6 h-6 rounded-full flex items-center justify-center -translate-x-1/2 border-2 transition-transform group-hover:scale-110 ${
                          isCompleted
                            ? 'bg-[#E50914] border-white text-white shadow-[0_0_12px_rgba(229,9,20,0.5)]'
                            : isOngoing
                            ? 'bg-blue-600 border-white text-white animate-pulse'
                            : 'bg-[#1a1a1a] border-white/30 text-[#888]'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <span className="text-[10px] font-bold">{idx + 1}</span>
                        )}
                      </div>

                      {/* Timeline Entry Card */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-[#141414] border border-white/[0.08] hover:border-white/25 transition-all group-hover:bg-[#181818] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <Poster
                            src={entry.poster}
                            title={formatEntryTitle(entry)}
                            size="md"
                            className="rounded-lg shadow-md shrink-0"
                          />

                          <div className="min-w-0 flex-1">
                            {/* Sequence & Relationship Label */}
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-[11px] font-bold tracking-wide text-[#E50914] uppercase">
                                {relLabel}
                              </span>
                              <span className="text-[#555]">·</span>
                              <span className="text-xs text-[#888] font-mono">{entry.year}</span>
                              <span className="text-[#555]">·</span>
                              <span className="text-xs text-[#888]">{entry.country}</span>
                            </div>

                            {/* Title */}
                            <h3 className="text-base font-bold text-white group-hover:text-rose-400 transition-colors truncate">
                              {formatEntryTitle(entry)}
                            </h3>

                            {/* Metadata Line */}
                            <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs text-[#777]">
                              <span>{entry.type}</span>
                              <span>·</span>
                              <span>
                                {entry.totalEpisodes
                                  ? `${entry.totalEpisodes} Episodes`
                                  : entry.specialNumber
                                  ? `Special #${entry.specialNumber}`
                                  : '1 Episode'}
                              </span>

                              {rating != null && (
                                <>
                                  <span>·</span>
                                  <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                                    <Star className="w-3 h-3 fill-amber-400" />
                                    {formatRating(rating)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status & Action */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.04]">
                          <StatusBadge status={entry.status} />

                          <button
                            type="button"
                            onClick={() => onSelectEntry(entry)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.1] px-3 py-1.5 rounded-lg border border-white/[0.08] transition-colors tap-active"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#E50914]" />
                            <span>View Details</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* UNIVERSES OVERVIEW / GALLERY */
            <div className="space-y-6">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-[#666] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={universeSearch}
                    onChange={(e) => setUniverseSearch(e.target.value)}
                    placeholder="Search saga, anthology, or actor..."
                    className="w-full bg-[#141414] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#E50914]"
                  />
                </div>

                {/* Filter Type Tabs */}
                <div className="flex items-center gap-1 p-1 bg-[#141414] border border-white/[0.06] rounded-xl self-start sm:self-auto">
                  {(
                    [
                      { id: 'all', label: 'All Universes' },
                      { id: 'saga', label: 'Multi-Part Sagas' },
                      { id: 'anthology', label: 'Anthologies' },
                      { id: 'adaptation', label: 'Adaptations' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setUniverseFilterType(tab.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        universeFilterType === tab.id
                          ? 'bg-white/[0.1] text-white font-semibold'
                          : 'text-[#777] hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Universes Grid */}
              {filteredUniverses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUniverses.map((universe) => (
                    <button
                      key={universe.id}
                      type="button"
                      onClick={() => setSelectedUniverseId(universe.id)}
                      className="group p-5 rounded-2xl bg-[#141414] border border-white/[0.08] hover:border-[#E50914]/50 hover:bg-[#181818] transition-all text-left flex flex-col justify-between tap-active shadow-lg"
                    >
                      <div>
                        {/* Poster Collage / Header */}
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div className="flex -space-x-5 overflow-hidden py-1">
                            {universe.entries.slice(0, 3).map((entry, i) => (
                              <div
                                key={entry.id}
                                className="relative rounded-lg overflow-hidden border-2 border-[#141414] shadow-md transition-transform group-hover:-translate-y-1"
                                style={{ zIndex: 3 - i }}
                              >
                                <Poster
                                  src={entry.poster}
                                  title={entry.title}
                                  size="sm"
                                  className="w-[45px] h-[60px]"
                                />
                              </div>
                            ))}
                            {universe.entries.length > 3 && (
                              <div className="w-[45px] h-[60px] rounded-lg bg-[#222] border-2 border-[#141414] flex items-center justify-center text-[11px] font-bold text-white z-0">
                                +{universe.entries.length - 3}
                              </div>
                            )}
                          </div>

                          {/* Completion Badge */}
                          <div className="text-right">
                            <span className="text-xs font-extrabold text-[#E50914]">
                              {universe.stats.percent}%
                            </span>
                            <div className="text-[10px] text-[#666]">
                              {universe.stats.completed}/{universe.stats.total} Watched
                            </div>
                          </div>
                        </div>

                        {/* Title and metadata */}
                        <span className="text-[10px] font-semibold text-[#888] uppercase tracking-wider block mb-1">
                          {universe.country} · {universe.yearStart} – {universe.yearEnd}
                        </span>
                        <h3 className="text-base font-bold text-white group-hover:text-rose-400 transition-colors line-clamp-1">
                          {universe.title}
                        </h3>

                        {/* Titles preview list */}
                        <div className="mt-3 space-y-1">
                          {universe.entries.slice(0, 3).map((e, idx) => (
                            <div
                              key={e.id}
                              className="text-xs text-[#aaa] flex items-center gap-1.5 truncate"
                            >
                              <span className="text-[10px] font-mono text-[#666]">{idx + 1}.</span>
                              <span className="truncate">{formatEntryTitle(e)}</span>
                              <span className="text-[10px] text-[#666] shrink-0 font-mono">
                                ({e.year})
                              </span>
                            </div>
                          ))}
                          {universe.entries.length > 3 && (
                            <div className="text-[11px] text-[#666] pl-3 italic">
                              +{universe.entries.length - 3} more connected releases...
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="mt-5 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs">
                        <span className="text-[#888] flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-[#E50914]" />
                          <span>{universe.entries.length} connected titles</span>
                        </span>

                        <span className="inline-flex items-center gap-1 text-white/70 font-semibold group-hover:text-white transition-colors">
                          <span>Explore Roadmap</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                /* No Universes Found */
                <div className="p-8 sm:p-12 rounded-2xl bg-[#141414] border border-dashed border-white/10 text-center space-y-3">
                  <GitBranch className="w-8 h-8 text-[#555] mx-auto" />
                  <h3 className="text-sm font-bold text-white">No Connected Universes Found</h3>
                  <p className="text-xs text-[#888] max-w-md mx-auto leading-relaxed">
                    Link multi-season titles, sequels, prequels, spin-offs, or anthologies by opening an entry
                    in the <strong>BL Series</strong> tab and setting the <strong>Relationship Link</strong> or <strong>Anthology Name</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTimelineMode('chronology')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E50914] hover:underline pt-2"
                  >
                    <span>Switch to Master Release Chronology instead</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODE 2: MASTER CHRONOLOGICAL RELEASE TIMELINE
         ═══════════════════════════════════════════════════════════ */}
      {timelineMode === 'chronology' && (
        <div className="space-y-6">
          {/* Quick-Jump Year Bar */}
          {availableYears.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedYear(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedYear === null
                    ? 'bg-[#E50914] text-white shadow-sm'
                    : 'bg-[#141414] border border-white/[0.06] text-[#888] hover:text-white'
                }`}
              >
                All Years ({state.entries.length})
              </button>
              {availableYears.map((yr) => {
                const count = state.entries.filter((e) => e.year === yr).length;
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setSelectedYear(selectedYear === yr ? null : yr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      selectedYear === yr
                        ? 'bg-[#E50914] text-white shadow-sm'
                        : 'bg-[#141414] border border-white/[0.06] text-[#888] hover:text-white'
                    }`}
                  >
                    <span>{yr}</span>
                    <span className="text-[10px] opacity-60">({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#141414] border border-white/[0.06]">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-[#666] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={chronoSearch}
                onChange={(e) => setChronoSearch(e.target.value)}
                placeholder="Search by title, country..."
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#E50914]"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Status */}
              <select
                value={chronoStatus}
                onChange={(e) => setChronoStatus(e.target.value as 'ALL' | Status)}
                className="bg-[#1a1a1a] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#E50914]"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETE">Completed</option>
                <option value="ONGOING">Ongoing</option>
                <option value="PLANNED">Planned</option>
                <option value="DROPPED">Dropped</option>
              </select>

              {/* Type */}
              <select
                value={chronoType}
                onChange={(e) => setChronoType(e.target.value as 'ALL' | 'Movie' | 'Series')}
                className="bg-[#1a1a1a] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#E50914]"
              >
                <option value="ALL">All Formats</option>
                <option value="Series">Series</option>
                <option value="Movie">Movies</option>
              </select>

              {/* Country */}
              <select
                value={chronoCountry}
                onChange={(e) => setChronoCountry(e.target.value)}
                className="bg-[#1a1a1a] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#E50914]"
              >
                <option value="ALL">All Countries</option>
                {availableCountries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Franchises only toggle */}
              <button
                type="button"
                onClick={() => setChronoFranchiseOnly(!chronoFranchiseOnly)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors ${
                  chronoFranchiseOnly
                    ? 'bg-[#E50914]/15 border-[#E50914] text-white font-semibold'
                    : 'bg-[#1a1a1a] border-white/10 text-[#888] hover:text-white'
                }`}
              >
                <GitBranch className="w-3 h-3 text-[#E50914]" />
                <span>Franchises Only</span>
              </button>
            </div>
          </div>

          {/* Master Chronology Stream by Year */}
          {chronoByYear.length > 0 ? (
            <div className="space-y-8">
              {chronoByYear.map(([year, yearEntries]) => (
                <div key={year} className="space-y-3">
                  {/* Year Header Marker */}
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-white font-mono bg-white/[0.05] border border-white/10 px-3 py-1 rounded-xl">
                      {year}
                    </span>
                    <span className="text-xs text-[#777] font-medium">
                      {yearEntries.length} {yearEntries.length === 1 ? 'release' : 'releases'}
                    </span>
                    <span className="h-px flex-1 bg-white/[0.06]" />
                  </div>

                  {/* Year Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {yearEntries.map((entry) => {
                      const universe = entryToUniverseMap.get(entry.id);
                      const rating = ratingsByEntryId.get(entry.id);
                      const relLabel = getEntryRelationshipLabel(entry);

                      return (
                        <div
                          key={entry.id}
                          className="group p-3 rounded-2xl bg-[#141414] border border-white/[0.08] hover:border-white/20 hover:bg-[#181818] transition-all flex items-start gap-3.5"
                        >
                          <Poster
                            src={entry.poster}
                            title={formatEntryTitle(entry)}
                            size="md"
                            className="rounded-lg shadow shrink-0"
                          />

                          <div className="min-w-0 flex-1 flex flex-col justify-between h-full">
                            <div>
                              {/* Release label or universe tag */}
                              {universe ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenUniverseFromEntry(entry.id)}
                                  className="text-[10px] font-bold text-[#E50914] hover:underline flex items-center gap-1 mb-1 truncate text-left"
                                >
                                  <GitBranch className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{universe.title}</span>
                                </button>
                              ) : relLabel ? (
                                <span className="text-[10px] font-semibold text-[#888] uppercase block mb-1">
                                  {relLabel}
                                </span>
                              ) : null}

                              {/* Title */}
                              <h4
                                onClick={() => onSelectEntry(entry)}
                                className="text-sm font-bold text-white hover:text-rose-400 cursor-pointer transition-colors line-clamp-1"
                              >
                                {formatEntryTitle(entry)}
                              </h4>

                              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#777]">
                                <span>{entry.type}</span>
                                <span>·</span>
                                <span>{entry.country}</span>
                                {rating != null && (
                                  <>
                                    <span>·</span>
                                    <span className="text-amber-400 font-semibold inline-flex items-center gap-0.5">
                                      <Star className="w-2.5 h-2.5 fill-amber-400" />
                                      {formatRating(rating)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/[0.04]">
                              <StatusBadge status={entry.status} />

                              <button
                                type="button"
                                onClick={() => onSelectEntry(entry)}
                                className="text-[11px] font-semibold text-[#888] hover:text-white transition-colors"
                              >
                                Details &rarr;
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 sm:p-12 rounded-2xl bg-[#141414] border border-dashed border-white/10 text-center space-y-2">
              <Calendar className="w-8 h-8 text-[#555] mx-auto" />
              <p className="text-sm font-semibold text-white">No Releases Match Filters</p>
              <p className="text-xs text-[#777]">Try clearing your search query or adjusting status filters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
