import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Heart,
  Star,
  Plus,
  Search,
  Flame,
  Film,
  Trash2,
  Edit3,
  X,
  UserRound,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatEntryTitle } from '@/lib/entry';
import { formatRating } from '@/lib/rating';
import type { Actor, ActorRole, Entry, FavoriteEntry } from '@/types';
import Poster from './Poster';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const PAIRINGS_STORAGE_KEY = 'bl_watchlist_pairings_v1';

export interface BlPairingRecord {
  id: string; // cp_{actor1Id}_{actor2Id}
  actor1Id: string;
  actor2Id: string;
  shipName?: string;
  isFavorite: boolean;
  notes?: string;
  createdAt: number;
}

export interface SharedProjectCredit {
  entry: Entry;
  actor1Role: ActorRole;
  actor1Character: string;
  actor2Role: ActorRole;
  actor2Character: string;
  chemistryScore: number | null;
  hasOutstandingChemistry: boolean;
  overallRating: number | null;
}

export interface ComputedPairing {
  id: string;
  actor1: Actor;
  actor2: Actor;
  shipName: string;
  isFavorite: boolean;
  notes?: string;
  sharedProjects: SharedProjectCredit[];
  totalProjects: number;
  mainLeadProjects: number;
  totalEpisodes: number;
  averageChemistry: number | null;
  outstandingChemistryCount: number;
  averageOverallScore: number | null;
  country: string;
  isCustomTagged: boolean;
}

interface PairingsTrackerProps {
  onSelectEntry?: (entry: Entry) => void;
  onSelectActor?: (actorId: string) => void;
}

function makePairingId(id1: string, id2: string): string {
  const [a, b] = [id1, id2].sort();
  return `cp_${a}_${b}`;
}

export default function PairingsTracker({ onSelectEntry, onSelectActor }: PairingsTrackerProps) {
  const { state } = useApp();

  // Stored user tagged pairings in localStorage
  const [storedPairings, setStoredPairings] = useState<Record<string, BlPairingRecord>>(() => {
    try {
      const raw = localStorage.getItem(PAIRINGS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PAIRINGS_STORAGE_KEY, JSON.stringify(storedPairings));
    } catch {
      // ignore storage write errors
    }
  }, [storedPairings]);

  // Selected pairing for detailed view
  const [selectedPairingId, setSelectedPairingId] = useState<string | null>(null);

  // Modal for tagging / editing pairing
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [editActor1Id, setEditActor1Id] = useState('');
  const [editActor2Id, setEditActor2Id] = useState('');
  const [editShipName, setEditShipName] = useState('');
  const [editIsFavorite, setEditIsFavorite] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'favorites' | 'mainLeads' | 'highChemistry'>('all');
  const [sortBy, setSortBy] = useState<'chemistry' | 'projects' | 'name' | 'recent'>('chemistry');
  const [countryFilter, setCountryFilter] = useState<string>('ALL');

  // Fast lookups
  const entryMap = useMemo(() => new Map<string, Entry>(state.entries.map((e) => [e.id, e])), [state.entries]);
  const actorMap = useMemo(() => new Map<string, Actor>(state.actors.map((a) => [a.id, a])), [state.actors]);
  const favMap = useMemo(() => new Map<string, FavoriteEntry>(state.favorites.map((f) => [f.entryId, f])), [state.favorites]);
  const ratingMap = useMemo(() => new Map<string, FavoriteEntry>(state.ratings.map((r) => [r.entryId, r])), [state.ratings]);

  // Compute all pairs of co-stars who acted together, plus any user-tagged pairings
  const computedPairings = useMemo<ComputedPairing[]>(() => {
    const result: ComputedPairing[] = [];
    const processedIds = new Set<string>();

    const actors = state.actors;

    // 1. Detect all pairs who share at least 1 filmography credit
    for (let i = 0; i < actors.length; i++) {
      const a1 = actors[i];
      const a1FilmMap = new Map(a1.filmography.map((c) => [c.entryId, c]));

      for (let j = i + 1; j < actors.length; j++) {
        const a2 = actors[j];
        const pairId = makePairingId(a1.id, a2.id);

        const shared: SharedProjectCredit[] = [];
        for (const c2 of a2.filmography) {
          const c1 = a1FilmMap.get(c2.entryId);
          if (c1) {
            const entry = entryMap.get(c2.entryId);
            if (entry) {
              const evalItem = favMap.get(entry.id) || ratingMap.get(entry.id);
              shared.push({
                entry,
                actor1Role: c1.role,
                actor1Character: c1.character,
                actor2Role: c2.role,
                actor2Character: c2.character,
                chemistryScore: evalItem?.chemistry ?? null,
                hasOutstandingChemistry: Boolean(evalItem?.outstandingChemistry),
                overallRating: evalItem?.overallRating ?? null,
              });
            }
          }
        }

        const custom = storedPairings[pairId];
        if (shared.length > 0 || custom) {
          processedIds.add(pairId);

          // Sort shared projects chronologically
          shared.sort((x, y) => {
            if (x.entry.year !== y.entry.year) return y.entry.year - x.entry.year;
            return (y.entry.plannedDate || '').localeCompare(x.entry.plannedDate || '');
          });

          const totalProjects = shared.length;
          const mainLeadProjects = shared.filter(
            (s) => s.actor1Role === 'MAIN' && s.actor2Role === 'MAIN',
          ).length;
          const totalEpisodes = shared.reduce(
            (acc, s) => acc + (s.entry.totalEpisodes || s.entry.specialNumber || 1),
            0,
          );

          const chemScores = shared
            .map((s) => s.chemistryScore)
            .filter((c): c is number => c != null && c > 0);
          const averageChemistry =
            chemScores.length > 0
              ? Math.round((chemScores.reduce((acc, v) => acc + v, 0) / chemScores.length) * 10) /
                10
              : null;

          const outstandingChemistryCount = shared.filter((s) => s.hasOutstandingChemistry).length;

          const overallScores = shared
            .map((s) => s.overallRating)
            .filter((r): r is number => r != null && r > 0);
          const averageOverallScore =
            overallScores.length > 0
              ? Math.round((overallScores.reduce((acc, v) => acc + v, 0) / overallScores.length) * 10) / 10
              : null;

          const defaultShipName = `${a1.name.split(' ')[0]}${a2.name.split(' ')[0]}`;
          const shipName = custom?.shipName?.trim() || defaultShipName;
          const isFavorite = Boolean(custom?.isFavorite);
          const notes = custom?.notes;

          const country =
            a1.nationality === a2.nationality ? a1.nationality : `${a1.nationality} / ${a2.nationality}`;

          result.push({
            id: pairId,
            actor1: a1,
            actor2: a2,
            shipName,
            isFavorite,
            notes,
            sharedProjects: shared,
            totalProjects,
            mainLeadProjects,
            totalEpisodes,
            averageChemistry,
            outstandingChemistryCount,
            averageOverallScore,
            country,
            isCustomTagged: Boolean(custom),
          });
        }
      }
    }

    // 2. Also include any custom tagged pairings where actors may not have shared entries yet
    for (const [pairId, custom] of Object.entries(storedPairings)) {
      if (!processedIds.has(pairId)) {
        const a1 = actorMap.get(custom.actor1Id);
        const a2 = actorMap.get(custom.actor2Id);
        if (a1 && a2) {
          const defaultShipName = `${a1.name.split(' ')[0]}${a2.name.split(' ')[0]}`;
          result.push({
            id: pairId,
            actor1: a1,
            actor2: a2,
            shipName: custom.shipName?.trim() || defaultShipName,
            isFavorite: Boolean(custom.isFavorite),
            notes: custom.notes,
            sharedProjects: [],
            totalProjects: 0,
            mainLeadProjects: 0,
            totalEpisodes: 0,
            averageChemistry: null,
            outstandingChemistryCount: 0,
            averageOverallScore: null,
            country:
              a1.nationality === a2.nationality
                ? a1.nationality
                : `${a1.nationality} / ${a2.nationality}`,
            isCustomTagged: true,
          });
        }
      }
    }

    return result;
  }, [state.actors, entryMap, favMap, ratingMap, storedPairings, actorMap]);

  // Countries available in pairings
  const availableCountries = useMemo(() => {
    return Array.from(new Set(computedPairings.map((p) => p.country))).sort();
  }, [computedPairings]);

  // Filtered & sorted pairings
  const filteredPairings = useMemo(() => {
    return computedPairings
      .filter((p) => {
        // Mode filter
        if (filterMode === 'favorites' && !p.isFavorite) return false;
        if (filterMode === 'mainLeads' && p.mainLeadProjects === 0) return false;
        if (filterMode === 'highChemistry' && (p.averageChemistry == null || p.averageChemistry < 8.0)) return false;

        // Country filter
        if (countryFilter !== 'ALL' && p.country !== countryFilter) return false;

        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLocaleLowerCase();
          const matchShip = p.shipName.toLocaleLowerCase().includes(q);
          const matchA1 = p.actor1.name.toLocaleLowerCase().includes(q);
          const matchA2 = p.actor2.name.toLocaleLowerCase().includes(q);
          const matchTitles = p.sharedProjects.some((s) =>
            formatEntryTitle(s.entry).toLocaleLowerCase().includes(q),
          );
          return matchShip || matchA1 || matchA2 || matchTitles;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'chemistry') {
          const chemA = a.averageChemistry ?? -1;
          const chemB = b.averageChemistry ?? -1;
          if (chemB !== chemA) return chemB - chemA;
          return b.totalProjects - a.totalProjects;
        }
        if (sortBy === 'projects') {
          if (b.totalProjects !== a.totalProjects) return b.totalProjects - a.totalProjects;
          return (b.averageChemistry ?? 0) - (a.averageChemistry ?? 0);
        }
        if (sortBy === 'name') {
          return a.shipName.localeCompare(b.shipName);
        }
        if (sortBy === 'recent') {
          const yearA = a.sharedProjects[0]?.entry.year ?? 0;
          const yearB = b.sharedProjects[0]?.entry.year ?? 0;
          return yearB - yearA;
        }
        return 0;
      });
  }, [computedPairings, filterMode, countryFilter, searchQuery, sortBy]);

  // Active selected pairing
  const activePairing = useMemo(() => {
    if (!selectedPairingId) return null;
    return computedPairings.find((p) => p.id === selectedPairingId) || null;
  }, [computedPairings, selectedPairingId]);

  // Metrics summary
  const metrics = useMemo(() => {
    const total = computedPairings.length;
    const favorites = computedPairings.filter((p) => p.isFavorite).length;

    // Highest chemistry pairing
    const ratedPairs = computedPairings.filter((p) => p.averageChemistry != null);
    ratedPairs.sort((a, b) => (b.averageChemistry ?? 0) - (a.averageChemistry ?? 0));
    const topChemistryPair = ratedPairs[0] || null;

    // Most frequent duo
    const sortedByProjects = [...computedPairings].sort((a, b) => b.totalProjects - a.totalProjects);
    const topDuo = sortedByProjects[0]?.totalProjects > 0 ? sortedByProjects[0] : null;

    return { total, favorites, topChemistryPair, topDuo };
  }, [computedPairings]);

  // Toggle favorite for a pairing
  const toggleFavorite = useCallback((pairing: ComputedPairing) => {
    setStoredPairings((prev) => {
      const existing = prev[pairing.id] || {
        id: pairing.id,
        actor1Id: pairing.actor1.id,
        actor2Id: pairing.actor2.id,
        shipName: pairing.shipName,
        isFavorite: false,
        notes: pairing.notes,
        createdAt: Date.now(),
      };
      return {
        ...prev,
        [pairing.id]: {
          ...existing,
          isFavorite: !existing.isFavorite,
        },
      };
    });
  }, []);

  // Open modal to create or tag pairing
  const openNewPairingModal = () => {
    setEditActor1Id('');
    setEditActor2Id('');
    setEditShipName('');
    setEditIsFavorite(false);
    setEditNotes('');
    setFormError('');
    setTagModalOpen(true);
  };

  // Open modal to edit an existing pairing
  const openEditPairingModal = (pairing: ComputedPairing) => {
    setEditActor1Id(pairing.actor1.id);
    setEditActor2Id(pairing.actor2.id);
    setEditShipName(pairing.shipName);
    setEditIsFavorite(pairing.isFavorite);
    setEditNotes(pairing.notes || '');
    setFormError('');
    setTagModalOpen(true);
  };

  // Save tagged pairing
  const handleSavePairing = () => {
    if (!editActor1Id || !editActor2Id) {
      setFormError('Please select both actors.');
      return;
    }
    if (editActor1Id === editActor2Id) {
      setFormError('Please choose two distinct actors.');
      return;
    }

    const a1 = actorMap.get(editActor1Id);
    const a2 = actorMap.get(editActor2Id);
    if (!a1 || !a2) {
      setFormError('Actor could not be found.');
      return;
    }

    const id = makePairingId(editActor1Id, editActor2Id);
    const defaultShipName = `${a1.name.split(' ')[0]}${a2.name.split(' ')[0]}`;

    setStoredPairings((prev) => ({
      ...prev,
      [id]: {
        id,
        actor1Id: editActor1Id,
        actor2Id: editActor2Id,
        shipName: editShipName.trim() || defaultShipName,
        isFavorite: editIsFavorite,
        notes: editNotes.trim(),
        createdAt: prev[id]?.createdAt || Date.now(),
      },
    }));

    setTagModalOpen(false);
  };

  // Delete custom tag
  const handleDeleteCustomTag = (pairingId: string) => {
    setStoredPairings((prev) => {
      const next = { ...prev };
      delete next[pairingId];
      return next;
    });
    if (selectedPairingId === pairingId) {
      setSelectedPairingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Highlights / Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#141414] border border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#777]">
              Tracked Pairings
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">{metrics.total}</div>
            <div className="text-[10px] text-[#666] mt-0.5">On-screen duos</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[#E50914]">
            <Heart className="w-4 h-4 fill-[#E50914]" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141414] border border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#777]">
              Favorite CPs
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-400 mt-0.5">
              {metrics.favorites}
            </div>
            <div className="text-[10px] text-[#666] mt-0.5">Starred favorites</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Star className="w-4 h-4 fill-rose-400" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141414] border border-white/[0.08] flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#777]">
              Top Chemistry
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5 truncate">
              {metrics.topChemistryPair ? (
                <span>★ {formatRating(metrics.topChemistryPair.averageChemistry!)}</span>
              ) : (
                '—'
              )}
            </div>
            <div className="text-[10px] text-[#666] mt-0.5 truncate">
              {metrics.topChemistryPair ? metrics.topChemistryPair.shipName : 'No rated CP yet'}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Flame className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141414] border border-white/[0.08] flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#777]">
              Most Projects
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5 truncate">
              {metrics.topDuo ? `${metrics.topDuo.totalProjects} Titles` : '—'}
            </div>
            <div className="text-[10px] text-[#666] mt-0.5 truncate">
              {metrics.topDuo ? metrics.topDuo.shipName : 'No co-stars'}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Film className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ── Action and Filter Header ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#666] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pairing name, actor, or title..."
            className="w-full bg-[#141414] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#E50914]"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={openNewPairingModal}
            className="inline-flex items-center gap-2 rounded-xl bg-[#E50914] hover:bg-[#c90811] px-4 py-2 text-xs font-bold text-white shadow-lg transition-colors tap-active"
          >
            <Plus className="w-4 h-4" />
            <span>Tag New CP</span>
          </button>
        </div>
      </div>

      {/* ── Filter & Sort Segmented Bar ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-[#141414] border border-white/[0.06]">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              { id: 'all', label: `All Pairs (${computedPairings.length})` },
              { id: 'favorites', label: `Favorites (${metrics.favorites})` },
              { id: 'mainLeads', label: 'Both Main Leads' },
              { id: 'highChemistry', label: 'High Chemistry (≥8.0)' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterMode(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors tap-active ${
                filterMode === tab.id
                  ? 'bg-white/[0.12] text-white shadow-sm'
                  : 'text-[#777] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort and Country Dropdowns */}
        <div className="flex items-center gap-2 text-xs self-start md:self-auto">
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="bg-[#1a1a1a] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#E50914]"
          >
            <option value="ALL">All Countries</option>
            {availableCountries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-[#1a1a1a] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#E50914]"
          >
            <option value="chemistry">Chemistry Score (Highest)</option>
            <option value="projects">Shared Projects (Most)</option>
            <option value="recent">Latest Project (Recent)</option>
            <option value="name">Ship Name (A → Z)</option>
          </select>
        </div>
      </div>

      {/* ── Pairings Cards Grid ── */}
      {filteredPairings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPairings.map((pairing) => {
            const hasChemistry = pairing.averageChemistry != null;

            return (
              <div
                key={pairing.id}
                className="group p-5 rounded-2xl bg-[#141414] border border-white/[0.08] hover:border-white/25 hover:bg-[#181818] transition-all flex flex-col justify-between shadow-lg"
              >
                <div>
                  {/* Card Header: Dual Avatars & Star / Favorite Action */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    {/* Interlocking Avatar Duo */}
                    <div className="flex items-center -space-x-3 shrink-0">
                      <div
                        onClick={() => onSelectActor?.(pairing.actor1.id)}
                        className="w-12 h-12 rounded-full border-2 border-[#141414] overflow-hidden bg-[#222] shadow cursor-pointer hover:scale-105 transition-transform"
                        title={pairing.actor1.name}
                      >
                        {pairing.actor1.photo ? (
                          <img
                            src={pairing.actor1.photo}
                            alt={pairing.actor1.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#555]">
                            <UserRound className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      <div
                        onClick={() => onSelectActor?.(pairing.actor2.id)}
                        className="w-12 h-12 rounded-full border-2 border-[#141414] overflow-hidden bg-[#222] shadow cursor-pointer hover:scale-105 transition-transform"
                        title={pairing.actor2.name}
                      >
                        {pairing.actor2.photo ? (
                          <img
                            src={pairing.actor2.photo}
                            alt={pairing.actor2.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#555]">
                            <UserRound className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Favorite and Options */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleFavorite(pairing)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                          pairing.isFavorite
                            ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                            : 'bg-white/[0.04] border-white/[0.06] text-[#666] hover:text-white'
                        }`}
                        title={pairing.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Heart
                          className={`w-4 h-4 ${pairing.isFavorite ? 'fill-rose-400' : ''}`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditPairingModal(pairing)}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.04] border border-white/[0.06] text-[#666] hover:text-white transition-colors"
                        title="Edit CP details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Ship Name & Actors */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3
                        onClick={() => setSelectedPairingId(pairing.id)}
                        className="text-lg font-extrabold text-white group-hover:text-rose-400 cursor-pointer transition-colors truncate"
                      >
                        {pairing.shipName}
                      </h3>
                      {pairing.isFavorite && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Favorite CP
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-[#888] truncate">
                      {pairing.actor1.name} &amp; {pairing.actor2.name}
                    </p>

                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#666]">
                      <span>{pairing.country}</span>
                      <span>·</span>
                      <span>{pairing.totalProjects} shared projects</span>
                      {pairing.mainLeadProjects > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-[#aaa] font-medium">
                            {pairing.mainLeadProjects} as Main Leads
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Chemistry & Score Badge Highlights */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {/* Chemistry Metric */}
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center gap-1 text-[10px] text-[#777] uppercase font-semibold">
                        <Flame className="w-3 h-3 text-amber-400" />
                        <span>Avg Chemistry</span>
                      </div>
                      <div className="text-base font-black text-white mt-0.5">
                        {hasChemistry ? (
                          <span className="text-amber-400">★ {formatRating(pairing.averageChemistry!)}</span>
                        ) : (
                          <span className="text-[#666] text-xs font-normal">Not evaluated</span>
                        )}
                      </div>
                      {pairing.outstandingChemistryCount > 0 && (
                        <div className="text-[10px] text-emerald-400 mt-0.5">
                          {pairing.outstandingChemistryCount} Outstanding bonuses
                        </div>
                      )}
                    </div>

                    {/* Episodes & Projects */}
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center gap-1 text-[10px] text-[#777] uppercase font-semibold">
                        <Film className="w-3 h-3 text-[#E50914]" />
                        <span>Episodes</span>
                      </div>
                      <div className="text-base font-black text-white mt-0.5">
                        {pairing.totalEpisodes} eps
                      </div>
                      <div className="text-[10px] text-[#666] mt-0.5">
                        {pairing.sharedProjects.length} joint titles
                      </div>
                    </div>
                  </div>

                  {/* Shared Posters Preview */}
                  {pairing.sharedProjects.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/[0.04]">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#666] mb-2">
                        Shared Filmography
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {pairing.sharedProjects.slice(0, 4).map((proj) => (
                          <div
                            key={proj.entry.id}
                            onClick={() => onSelectEntry?.(proj.entry)}
                            className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                            title={formatEntryTitle(proj.entry)}
                          >
                            <Poster
                              src={proj.entry.poster}
                              title={formatEntryTitle(proj.entry)}
                              size="sm"
                              className="w-[42px] h-[58px] rounded-md shadow"
                            />
                          </div>
                        ))}
                        {pairing.sharedProjects.length > 4 && (
                          <div className="w-[42px] h-[58px] rounded-md bg-[#222] border border-white/10 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                            +{pairing.sharedProjects.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                  <span className="text-[11px] text-[#777]">
                    {pairing.isCustomTagged ? 'Official CP Tag' : 'Auto-detected Co-stars'}
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedPairingId(pairing.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-white/80 hover:text-white transition-colors"
                  >
                    <span>View CP Profile &rarr;</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="p-8 sm:p-12 rounded-2xl bg-[#141414] border border-dashed border-white/10 text-center space-y-3">
          <Heart className="w-8 h-8 text-[#555] mx-auto" />
          <h3 className="text-sm font-bold text-white">No Pairings Match Criteria</h3>
          <p className="text-xs text-[#888] max-w-md mx-auto leading-relaxed">
            {searchQuery
              ? 'Try adjusting your search terms or clearing filters.'
              : 'Add actors to multiple series or movies in the Cast library, or click "Tag New CP" to officially create a pairing.'}
          </p>
          <button
            type="button"
            onClick={openNewPairingModal}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E50914] hover:underline pt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tag your first CP</span>
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL 1: DETAILED PAIRING PROFILE
         ═══════════════════════════════════════════════════════════ */}
      <Dialog
        open={!!selectedPairingId}
        onOpenChange={(open) => !open && setSelectedPairingId(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] bg-[#141414] border border-white/10 text-white p-0 flex flex-col overflow-hidden shadow-2xl">
          {activePairing && (
            <>
              {/* Header */}
              <div className="px-6 py-5 border-b border-white/[0.08] bg-[#111] flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                  {/* Interlocking Dual Avatars */}
                  <div className="flex items-center -space-x-3 shrink-0">
                    <div className="w-14 h-14 rounded-full border-2 border-[#111] overflow-hidden bg-[#222] shadow">
                      {activePairing.actor1.photo ? (
                        <img
                          src={activePairing.actor1.photo}
                          alt={activePairing.actor1.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#555]">
                          <UserRound className="w-7 h-7" />
                        </div>
                      )}
                    </div>
                    <div className="w-14 h-14 rounded-full border-2 border-[#111] overflow-hidden bg-[#222] shadow">
                      {activePairing.actor2.photo ? (
                        <img
                          src={activePairing.actor2.photo}
                          alt={activePairing.actor2.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#555]">
                          <UserRound className="w-7 h-7" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-white">{activePairing.shipName}</h2>
                      {activePairing.isFavorite && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Favorite CP
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#888]">
                      {activePairing.actor1.name} &amp; {activePairing.actor2.name} · {activePairing.country}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleFavorite(activePairing)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                      activePairing.isFavorite
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                        : 'bg-white/[0.04] border-white/[0.06] text-[#777] hover:text-white'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${activePairing.isFavorite ? 'fill-rose-400' : ''}`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPairingId(null)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.04] text-[#888] hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm">
                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                    <span className="text-[10px] text-[#777] uppercase font-bold block">
                      Avg Chemistry
                    </span>
                    <span className="text-lg font-black text-amber-400 mt-1 block">
                      {activePairing.averageChemistry != null
                        ? `★ ${formatRating(activePairing.averageChemistry)}`
                        : '—'}
                    </span>
                    <span className="text-[10px] text-[#666]">
                      {activePairing.outstandingChemistryCount} Outstanding
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                    <span className="text-[10px] text-[#777] uppercase font-bold block">
                      Main Lead Pair
                    </span>
                    <span className="text-lg font-black text-rose-400 mt-1 block">
                      {activePairing.mainLeadProjects}
                    </span>
                    <span className="text-[10px] text-[#666]">Headlined series</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                    <span className="text-[10px] text-[#777] uppercase font-bold block">
                      Total Projects
                    </span>
                    <span className="text-lg font-black text-white mt-1 block">
                      {activePairing.totalProjects}
                    </span>
                    <span className="text-[10px] text-[#666]">Joint credits</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                    <span className="text-[10px] text-[#777] uppercase font-bold block">
                      Episodes Together
                    </span>
                    <span className="text-lg font-black text-emerald-400 mt-1 block">
                      {activePairing.totalEpisodes}
                    </span>
                    <span className="text-[10px] text-[#666]">Total runtime</span>
                  </div>
                </div>

                {/* Notes (if any) */}
                {activePairing.notes && (
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-[#bbb] leading-relaxed">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#777] block mb-1">
                      CP Notes &amp; Highlights
                    </span>
                    {activePairing.notes}
                  </div>
                )}

                {/* Collaborative Filmography Timeline */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#888]">
                      Collaborative Filmography ({activePairing.sharedProjects.length})
                    </h3>
                  </div>

                  {activePairing.sharedProjects.length > 0 ? (
                    <div className="space-y-2.5">
                      {activePairing.sharedProjects.map((proj) => (
                        <div
                          key={proj.entry.id}
                          className="p-3.5 rounded-xl bg-[#1a1a1a] border border-white/[0.06] hover:border-white/20 transition-all flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <Poster
                              src={proj.entry.poster}
                              title={formatEntryTitle(proj.entry)}
                              size="sm"
                              className="w-[45px] h-[60px] rounded-lg shrink-0 shadow"
                            />

                            <div className="min-w-0 flex-1">
                              <h4
                                onClick={() => {
                                  setSelectedPairingId(null);
                                  onSelectEntry?.(proj.entry);
                                }}
                                className="text-sm font-bold text-white hover:text-rose-400 cursor-pointer transition-colors truncate"
                              >
                                {formatEntryTitle(proj.entry)}
                              </h4>

                              <div className="text-[11px] text-[#888] mt-0.5">
                                <span>{proj.entry.year}</span>
                                <span className="mx-1">·</span>
                                <span>{proj.entry.country}</span>
                                <span className="mx-1">·</span>
                                <span>{proj.entry.type}</span>
                              </div>

                              {/* Characters played */}
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                <span className="text-[#ccc]">
                                  {activePairing.actor1.name.split(' ')[0]}:{' '}
                                  <strong className="text-white">
                                    {proj.actor1Character || '—'}
                                  </strong>{' '}
                                  <span className="text-[10px] text-[#777]">({proj.actor1Role})</span>
                                </span>
                                <span className="text-[#555]">·</span>
                                <span className="text-[#ccc]">
                                  {activePairing.actor2.name.split(' ')[0]}:{' '}
                                  <strong className="text-white">
                                    {proj.actor2Character || '—'}
                                  </strong>{' '}
                                  <span className="text-[10px] text-[#777]">({proj.actor2Role})</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Chemistry Score & Action */}
                          <div className="text-right shrink-0">
                            {proj.chemistryScore != null && (
                              <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20 mb-1.5">
                                <Flame className="w-3 h-3" />
                                <span>★ {formatRating(proj.chemistryScore)}</span>
                              </div>
                            )}

                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPairingId(null);
                                  onSelectEntry?.(proj.entry);
                                }}
                                className="text-xs font-semibold text-white/70 hover:text-white"
                              >
                                View Entry &rarr;
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center text-xs text-[#777]">
                      No collaborative entries linked yet in their filmographies.
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/[0.08] bg-[#111] flex items-center justify-between flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleDeleteCustomTag(activePairing.id)}
                  className="text-xs text-red-400 hover:text-red-300 inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove CP Tag</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPairingId(null);
                    openEditPairingModal(activePairing);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white/[0.08] hover:bg-white/[0.15] text-white transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit CP Metadata</span>
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          MODAL 2: TAG / EDIT PAIRING MODAL
         ═══════════════════════════════════════════════════════════ */}
      <Dialog open={tagModalOpen} onOpenChange={setTagModalOpen}>
        <DialogContent className="max-w-md bg-[#141414] border border-white/10 text-white p-6 shadow-2xl">
          <DialogHeader className="p-0 mb-4">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Heart className="w-5 h-5 text-[#E50914] fill-[#E50914]" />
              <span>{editShipName ? 'Edit Pairing (CP)' : 'Tag On-Screen Pairing'}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            {/* Actor 1 & Actor 2 pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#888] font-semibold uppercase tracking-wider text-[10px] block mb-1">
                  Actor 1
                </label>
                <select
                  value={editActor1Id}
                  onChange={(e) => setEditActor1Id(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#E50914]"
                >
                  <option value="">Select Actor 1</option>
                  {state.actors.map((actor) => (
                    <option key={actor.id} value={actor.id}>
                      {actor.name} ({actor.nationality})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#888] font-semibold uppercase tracking-wider text-[10px] block mb-1">
                  Actor 2
                </label>
                <select
                  value={editActor2Id}
                  onChange={(e) => setEditActor2Id(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#E50914]"
                >
                  <option value="">Select Actor 2</option>
                  {state.actors
                    .filter((a) => a.id !== editActor1Id)
                    .map((actor) => (
                      <option key={actor.id} value={actor.id}>
                        {actor.name} ({actor.nationality})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Ship Name */}
            <div>
              <label className="text-[#888] font-semibold uppercase tracking-wider text-[10px] block mb-1">
                Ship / Pairing Name
              </label>
              <input
                type="text"
                value={editShipName}
                onChange={(e) => setEditShipName(e.target.value)}
                placeholder="e.g. ZeeNuNew, GeminiFourth, MileApo..."
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#E50914]"
              />
              <span className="text-[10px] text-[#666] mt-1 block">
                Leave blank to auto-combine their first names.
              </span>
            </div>

            {/* Favorite toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div>
                <span className="font-semibold text-white block">Favorite Pairing</span>
                <span className="text-[10px] text-[#777]">Star this duo in your CP tracker</span>
              </div>
              <button
                type="button"
                onClick={() => setEditIsFavorite(!editIsFavorite)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                  editIsFavorite
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                    : 'bg-white/[0.04] border-white/10 text-[#666]'
                }`}
              >
                <Heart className={`w-4 h-4 ${editIsFavorite ? 'fill-rose-400' : ''}`} />
              </button>
            </div>

            {/* Personal Notes */}
            <div>
              <label className="text-[#888] font-semibold uppercase tracking-wider text-[10px] block mb-1">
                Notes &amp; Highlights (Optional)
              </label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Official partner pair since 2022, incredible natural skinship..."
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#E50914] resize-none"
              />
            </div>

            {formError && (
              <p className="text-xs text-red-400 font-medium">{formError}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setTagModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#888] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePairing}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#E50914] hover:bg-[#c90811] text-white shadow"
              >
                Save Pairing
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
