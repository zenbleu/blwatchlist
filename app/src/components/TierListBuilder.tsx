import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  X,
  Search,
  MoveUp,
  MoveDown,
  RotateCcw,
  Download,
  Share2,
  Copy,
  Check,
  Sliders,
  Settings2,
  FolderPlus,
  Palette,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { Entry, Status } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const TIER_LISTS_STORAGE_KEY = 'bl_watchlist_tier_lists_v1';
const ACTIVE_TIER_LIST_ID_KEY = 'bl_watchlist_active_tier_list_id';

export interface TierDefinition {
  id: string;
  label: string;
  color: string;
  description?: string;
}

export interface TierList {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  tiers: TierDefinition[];
  tierItems: Record<string, string[]>; // tierId -> entryId[]
}

const PRESET_COLORS = [
  { label: 'Crimson Red', hex: '#E50914' },
  { label: 'Coral Orange', hex: '#FF6B35' },
  { label: 'Amber Gold', hex: '#F59E0B' },
  { label: 'Emerald Mint', hex: '#10B981' },
  { label: 'Sky Blue', hex: '#0EA5E9' },
  { label: 'Indigo Purple', hex: '#6366F1' },
  { label: 'Fuchsia Pink', hex: '#EC4899' },
  { label: 'Deep Violet', hex: '#8B5CF6' },
  { label: 'Slate Gray', hex: '#64748B' },
  { label: 'Charcoal', hex: '#334155' },
];

const TEMPLATES: { id: string; name: string; description: string; tiers: Omit<TierDefinition, 'id'>[] }[] = [
  {
    id: 'classic_s_d',
    name: 'Classic Tier List (S to D)',
    description: 'Standard 5-tier ranking from God Tier to Mid',
    tiers: [
      { label: 'S', color: '#E50914', description: 'God Tier / Absolute Masterpiece' },
      { label: 'A', color: '#FF6B35', description: 'Amazing / Highly Recommended' },
      { label: 'B', color: '#F59E0B', description: 'Great / Rewatchable' },
      { label: 'C', color: '#10B981', description: 'Good / Enjoyable' },
      { label: 'D', color: '#64748B', description: 'Mid / Not For Me' },
    ],
  },
  {
    id: 'extended_s_plus',
    name: 'Expanded 7-Tier (S+ to E)',
    description: 'Nuanced ranking with top-tier distinction',
    tiers: [
      { label: 'S+', color: '#E50914', description: 'All-Time Legendary' },
      { label: 'S', color: '#FF4757', description: 'Masterpiece' },
      { label: 'A', color: '#FF7F50', description: 'Top Tier' },
      { label: 'B', color: '#FFA502', description: 'Above Average' },
      { label: 'C', color: '#2ED573', description: 'Decent Watch' },
      { label: 'D', color: '#1E90FF', description: 'Average' },
      { label: 'E', color: '#57606F', description: 'Flawed / Dropped' },
    ],
  },
  {
    id: 'fandom_vibes',
    name: 'Fandom Vibes',
    description: 'Emotional reactions and rewatch categories',
    tiers: [
      { label: 'GOAT', color: '#E50914', description: 'The absolute greatest of all time' },
      { label: 'Comfort Show', color: '#EC4899', description: 'Rewatch every time I need serotonin' },
      { label: 'Emotional Damage', color: '#8B5CF6', description: 'Cried my eyes out, 10/10' },
      { label: 'Fun Fluff', color: '#10B981', description: 'Zero stress, pure sweetness' },
      { label: 'Guilty Pleasure', color: '#F59E0B', description: 'Messy drama but could not stop watching' },
      { label: 'Skip', color: '#475569', description: 'Not worth your time' },
    ],
  },
  {
    id: 'chemistry_rank',
    name: 'CP Chemistry Tiers',
    description: 'Rank by actor dynamic and on-screen spark',
    tiers: [
      { label: 'Insane Sparks', color: '#E50914', description: 'Electric tension that burns through the screen' },
      { label: 'Natural Partners', color: '#FF6B35', description: 'Effortless connection and emotional resonance' },
      { label: 'Sweet Romance', color: '#10B981', description: 'Wholesome, tender, and heartwarming' },
      { label: 'Awkward Energy', color: '#64748B', description: 'Felt more like polite coworkers' },
    ],
  },
];

function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function createDefaultTierList(): TierList {
  const template = TEMPLATES[0];
  const listId = generateId('tierlist');
  const tiers: TierDefinition[] = template.tiers.map((t, idx) => ({
    ...t,
    id: `tier_${idx}_${Date.now()}`,
  }));
  const tierItems: Record<string, string[]> = {};
  tiers.forEach((tier) => {
    tierItems[tier.id] = [];
  });

  return {
    id: listId,
    name: 'All-Time BL Tier List',
    description: 'My definitive ranking of BL series and movies',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tiers,
    tierItems,
  };
}

interface TierListBuilderProps {
  onSelectEntry?: (entry: Entry) => void;
}

export default function TierListBuilder({ onSelectEntry }: TierListBuilderProps) {
  const { state } = useApp();

  // Tier lists state
  const [tierLists, setTierLists] = useState<TierList[]>(() => {
    try {
      const stored = localStorage.getItem(TIER_LISTS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return [createDefaultTierList()];
  });

  const [activeListId, setActiveListId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_TIER_LIST_ID_KEY);
      if (stored) return stored;
    } catch {
      // ignore
    }
    return tierLists[0]?.id || '';
  });

  // Keep active list in sync if deleted
  const currentList = useMemo(() => {
    return tierLists.find((list) => list.id === activeListId) || tierLists[0] || createDefaultTierList();
  }, [tierLists, activeListId]);

  // Persist tier lists
  useEffect(() => {
    try {
      localStorage.setItem(TIER_LISTS_STORAGE_KEY, JSON.stringify(tierLists));
      if (activeListId) {
        localStorage.setItem(ACTIVE_TIER_LIST_ID_KEY, activeListId);
      }
    } catch {
      // ignore storage error
    }
  }, [tierLists, activeListId]);

  // Map of entries for fast lookup
  const entriesMap = useMemo(() => {
    const map = new Map<string, Entry>();
    state.entries.forEach((e) => map.set(e.id, e));
    return map;
  }, [state.entries]);

  // IDs currently ranked in ANY tier of current list
  const rankedEntryIds = useMemo(() => {
    const set = new Set<string>();
    Object.values(currentList.tierItems).forEach((ids) => {
      ids.forEach((id) => set.add(id));
    });
    return set;
  }, [currentList.tierItems]);

  // Unranked Pool filters
  const [poolSearch, setPoolSearch] = useState('');
  const [poolStatusFilter, setPoolStatusFilter] = useState<'ALL' | Status>('ALL');
  const [poolTypeFilter, setPoolTypeFilter] = useState<'ALL' | 'Series' | 'Movie'>('ALL');
  const [poolCountryFilter, setPoolCountryFilter] = useState<string>('ALL');

  const unrankedEntries = useMemo(() => {
    return state.entries.filter((entry) => {
      if (rankedEntryIds.has(entry.id)) return false;
      if (poolStatusFilter !== 'ALL' && entry.status !== poolStatusFilter) return false;
      if (poolTypeFilter !== 'ALL' && entry.type !== poolTypeFilter) return false;
      if (poolCountryFilter !== 'ALL' && entry.country !== poolCountryFilter) return false;
      if (poolSearch.trim()) {
        const query = poolSearch.trim().toLowerCase();
        const matchesTitle = entry.title.toLowerCase().includes(query);
        const matchesYear = String(entry.year).includes(query);
        if (!matchesTitle && !matchesYear) return false;
      }
      return true;
    });
  }, [state.entries, rankedEntryIds, poolStatusFilter, poolTypeFilter, poolCountryFilter, poolSearch]);

  // Countries for pool filter
  const poolCountries = useMemo(() => {
    const set = new Set<string>();
    state.entries.forEach((e) => {
      if (e.country) set.add(e.country);
    });
    return Array.from(set).sort();
  }, [state.entries]);

  // Drag and Drop state
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);
  const [dragOverTierId, setDragOverTierId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Modals state
  const [newListModalOpen, setNewListModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATES[0].id);

  const [editTierModalOpen, setEditTierModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<TierDefinition | null>(null);
  const [editTierLabel, setEditTierLabel] = useState('');
  const [editTierColor, setEditTierColor] = useState('');
  const [editTierDesc, setEditTierDesc] = useState('');

  const [addTitleModalTierId, setAddTitleModalTierId] = useState<string | null>(null);
  const [titlePickerSearch, setTitlePickerSearch] = useState('');

  const [activeCardActionEntryId, setActiveCardActionEntryId] = useState<string | null>(null);
  const [activeCardActionTierId, setActiveCardActionTierId] = useState<string | null>(null);

  const [copyToast, setCopyToast] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const tierContainerRef = useRef<HTMLDivElement>(null);

  // ----------------------------------------------------
  // Update Current List Helper
  // ----------------------------------------------------
  const updateCurrentList = useCallback(
    (updater: (prev: TierList) => TierList) => {
      setTierLists((prevLists) =>
        prevLists.map((list) => {
          if (list.id === currentList.id) {
            const updated = updater(list);
            return { ...updated, updatedAt: Date.now() };
          }
          return list;
        })
      );
    },
    [currentList.id]
  );

  // ----------------------------------------------------
  // Card Movement & Assignment
  // ----------------------------------------------------
  const moveEntryToTier = useCallback(
    (entryId: string, targetTierId: string, insertAtIndex?: number) => {
      updateCurrentList((list) => {
        const nextTierItems: Record<string, string[]> = {};

        // Remove entry from any existing tier
        Object.entries(list.tierItems).forEach(([tId, items]) => {
          nextTierItems[tId] = items.filter((id) => id !== entryId);
        });

        // Ensure target tier exists in tierItems
        if (!nextTierItems[targetTierId]) {
          nextTierItems[targetTierId] = [];
        }

        // Insert into target tier
        if (typeof insertAtIndex === 'number' && insertAtIndex >= 0) {
          nextTierItems[targetTierId].splice(insertAtIndex, 0, entryId);
        } else {
          nextTierItems[targetTierId].push(entryId);
        }

        return { ...list, tierItems: nextTierItems };
      });
    },
    [updateCurrentList]
  );

  const removeEntryFromTier = useCallback(
    (entryId: string) => {
      updateCurrentList((list) => {
        const nextTierItems: Record<string, string[]> = {};
        Object.entries(list.tierItems).forEach(([tId, items]) => {
          nextTierItems[tId] = items.filter((id) => id !== entryId);
        });
        return { ...list, tierItems: nextTierItems };
      });
    },
    [updateCurrentList]
  );

  const moveEntryWithinTier = useCallback(
    (tierId: string, entryId: string, direction: 'up' | 'down') => {
      updateCurrentList((list) => {
        const currentItems = [...(list.tierItems[tierId] || [])];
        const index = currentItems.indexOf(entryId);
        if (index === -1) return list;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= currentItems.length) return list;

        const temp = currentItems[index];
        currentItems[index] = currentItems[targetIndex];
        currentItems[targetIndex] = temp;

        return {
          ...list,
          tierItems: {
            ...list.tierItems,
            [tierId]: currentItems,
          },
        };
      });
    },
    [updateCurrentList]
  );

  const clearTier = useCallback(
    (tierId: string) => {
      updateCurrentList((list) => ({
        ...list,
        tierItems: {
          ...list.tierItems,
          [tierId]: [],
        },
      }));
    },
    [updateCurrentList]
  );

  const clearAllTiers = useCallback(() => {
    if (!window.confirm('Are you sure you want to remove all titles from all tiers in this list?')) {
      return;
    }
    updateCurrentList((list) => {
      const resetItems: Record<string, string[]> = {};
      list.tiers.forEach((t) => {
        resetItems[t.id] = [];
      });
      return { ...list, tierItems: resetItems };
    });
  }, [updateCurrentList]);

  // ----------------------------------------------------
  // Drag and Drop Event Handlers
  // ----------------------------------------------------
  const handleDragStart = (e: React.DragEvent, entryId: string, sourceTierId: string | null) => {
    setDraggedEntryId(entryId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ entryId, sourceTierId }));
  };

  const handleDragEnd = () => {
    setDraggedEntryId(null);
    setDragOverTierId(null);
    setDragOverIndex(null);
  };

  const handleTierDragOver = (e: React.DragEvent, tierId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTierId !== tierId) {
      setDragOverTierId(tierId);
    }
  };

  const handleTierDrop = (e: React.DragEvent, targetTierId: string) => {
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData('text/plain');
      if (!raw) return;
      const { entryId } = JSON.parse(raw);
      if (entryId) {
        moveEntryToTier(entryId, targetTierId, dragOverIndex ?? undefined);
      }
    } catch {
      if (draggedEntryId) {
        moveEntryToTier(draggedEntryId, targetTierId, dragOverIndex ?? undefined);
      }
    } finally {
      handleDragEnd();
    }
  };

  const handlePoolDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTierId('pool');
  };

  const handlePoolDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData('text/plain');
      if (!raw) return;
      const { entryId } = JSON.parse(raw);
      if (entryId) {
        removeEntryFromTier(entryId);
      }
    } catch {
      if (draggedEntryId) {
        removeEntryFromTier(draggedEntryId);
      }
    } finally {
      handleDragEnd();
    }
  };

  // ----------------------------------------------------
  // Tier Customization (Add, Edit, Reorder, Delete)
  // ----------------------------------------------------
  const openEditTier = (tier: TierDefinition) => {
    setEditingTier(tier);
    setEditTierLabel(tier.label);
    setEditTierColor(tier.color);
    setEditTierDesc(tier.description || '');
    setEditTierModalOpen(true);
  };

  const saveEditTier = () => {
    if (!editingTier || !editTierLabel.trim()) return;
    updateCurrentList((list) => {
      const updatedTiers = list.tiers.map((t) => {
        if (t.id === editingTier.id) {
          return {
            ...t,
            label: editTierLabel.trim(),
            color: editTierColor.trim() || '#E50914',
            description: editTierDesc.trim() || undefined,
          };
        }
        return t;
      });
      return { ...list, tiers: updatedTiers };
    });
    setEditTierModalOpen(false);
    setEditingTier(null);
  };

  const addTier = (relativeToId?: string, position: 'above' | 'below' | 'end' = 'end') => {
    const newTier: TierDefinition = {
      id: generateId('tier'),
      label: 'NEW',
      color: '#FF6B35',
      description: 'Custom Tier',
    };

    updateCurrentList((list) => {
      const nextTiers = [...list.tiers];
      if (relativeToId) {
        const index = nextTiers.findIndex((t) => t.id === relativeToId);
        if (index !== -1) {
          const insertAt = position === 'above' ? index : index + 1;
          nextTiers.splice(insertAt, 0, newTier);
        } else {
          nextTiers.push(newTier);
        }
      } else {
        nextTiers.push(newTier);
      }

      return {
        ...list,
        tiers: nextTiers,
        tierItems: {
          ...list.tierItems,
          [newTier.id]: [],
        },
      };
    });

    openEditTier(newTier);
  };

  const moveTier = (tierId: string, direction: 'up' | 'down') => {
    updateCurrentList((list) => {
      const tiers = [...list.tiers];
      const index = tiers.findIndex((t) => t.id === tierId);
      if (index === -1) return list;
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= tiers.length) return list;

      const temp = tiers[index];
      tiers[index] = tiers[target];
      tiers[target] = temp;

      return { ...list, tiers };
    });
  };

  const deleteTier = (tierId: string) => {
    if (currentList.tiers.length <= 1) {
      window.alert('A tier list must have at least one tier.');
      return;
    }
    updateCurrentList((list) => {
      const nextTiers = list.tiers.filter((t) => t.id !== tierId);
      const nextTierItems = { ...list.tierItems };
      delete nextTierItems[tierId];
      return { ...list, tiers: nextTiers, tierItems: nextTierItems };
    });
  };

  // ----------------------------------------------------
  // Batch Add Titles
  // ----------------------------------------------------
  const addAllCompletedToPool = () => {
    // Just a convenience trigger: completed items are already naturally available in unranked pool!
    setPoolStatusFilter('COMPLETE');
  };

  const handleAddTitleToTierFromModal = (entryId: string) => {
    if (addTitleModalTierId) {
      moveEntryToTier(entryId, addTitleModalTierId);
      setAddTitleModalTierId(null);
    }
  };

  // ----------------------------------------------------
  // List Management (Create, Duplicate, Delete)
  // ----------------------------------------------------
  const handleCreateList = () => {
    if (!newListName.trim()) return;
    const template = TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[0];
    const newListId = generateId('tierlist');
    const tiers: TierDefinition[] = template.tiers.map((t, idx) => ({
      ...t,
      id: `tier_${idx}_${Date.now()}`,
    }));
    const tierItems: Record<string, string[]> = {};
    tiers.forEach((tier) => {
      tierItems[tier.id] = [];
    });

    const newList: TierList = {
      id: newListId,
      name: newListName.trim(),
      description: template.description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tiers,
      tierItems,
    };

    setTierLists((prev) => [newList, ...prev]);
    setActiveListId(newListId);
    setNewListModalOpen(false);
    setNewListName('');
  };

  const handleDuplicateList = () => {
    const duplicatedId = generateId('tierlist');
    const duplicatedTiers = currentList.tiers.map((t) => ({
      ...t,
      id: generateId('tier'),
    }));
    const duplicatedItems: Record<string, string[]> = {};
    currentList.tiers.forEach((oldTier, idx) => {
      const newId = duplicatedTiers[idx].id;
      duplicatedItems[newId] = [...(currentList.tierItems[oldTier.id] || [])];
    });

    const duplicatedList: TierList = {
      ...currentList,
      id: duplicatedId,
      name: `${currentList.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tiers: duplicatedTiers,
      tierItems: duplicatedItems,
    };

    setTierLists((prev) => [duplicatedList, ...prev]);
    setActiveListId(duplicatedId);
  };

  const handleDeleteList = () => {
    if (tierLists.length <= 1) {
      window.alert('Cannot delete the only tier list. You can reset it instead.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${currentList.name}"?`)) {
      return;
    }
    const remaining = tierLists.filter((l) => l.id !== currentList.id);
    setTierLists(remaining);
    setActiveListId(remaining[0].id);
  };

  // ----------------------------------------------------
  // Export & Sharing
  // ----------------------------------------------------
  const copyTextSummary = () => {
    const lines: string[] = [`🏆 ${currentList.name}`, ''];
    currentList.tiers.forEach((tier) => {
      const entryIds = currentList.tierItems[tier.id] || [];
      const titleNames = entryIds
        .map((id) => entriesMap.get(id)?.title)
        .filter(Boolean)
        .join(', ');
      lines.push(`[${tier.label}] ${tier.description ? `(${tier.description}): ` : ': '}${titleNames || '(Empty)'}`);
    });
    lines.push('', 'Created with BL Watchlist Manager');

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2500);
    });
  };

  const exportAsImage = async () => {
    if (!tierContainerRef.current) return;
    setIsExportingImage(true);

    try {
      // Dynamic lightweight canvas renderer for crisp offline image export
      const canvas = document.createElement('canvas');
      const width = 1200;
      const rowHeight = 130;
      const headerHeight = 120;
      const totalHeight = headerHeight + currentList.tiers.length * rowHeight + 60;

      canvas.width = width;
      canvas.height = totalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Dark background
      ctx.fillStyle = '#0D0D0D';
      ctx.fillRect(0, 0, width, totalHeight);

      // Title & Header
      ctx.fillStyle = '#E50914';
      ctx.fillRect(40, 36, 6, 40);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(currentList.name, 60, 64);

      ctx.fillStyle = '#888888';
      ctx.font = '14px sans-serif';
      ctx.fillText(
        `BL Watchlist Tier List · ${rankedEntryIds.size} Titles Ranked · ${new Date().toLocaleDateString()}`,
        60,
        92
      );

      // Render each tier
      let currentY = headerHeight;
      currentList.tiers.forEach((tier) => {
        const itemIds = currentList.tierItems[tier.id] || [];

        // Tier row background
        ctx.fillStyle = '#141414';
        ctx.fillRect(40, currentY, width - 80, rowHeight - 8);

        // Tier label badge (left)
        ctx.fillStyle = tier.color || '#E50914';
        ctx.fillRect(40, currentY, 110, rowHeight - 8);

        // Tier label text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(tier.label, 95, currentY + (rowHeight - 8) / 2 + 9);

        // Titles inside tier
        ctx.textAlign = 'left';
        let cardX = 165;
        const cardY = currentY + 10;
        const cardW = 74;
        const cardH = rowHeight - 28;

        if (itemIds.length === 0) {
          ctx.fillStyle = '#444444';
          ctx.font = 'italic 14px sans-serif';
          ctx.fillText('(No titles placed in this tier)', 170, currentY + (rowHeight - 8) / 2 + 5);
        } else {
          itemIds.slice(0, 12).forEach((id) => {
            const entry = entriesMap.get(id);
            if (!entry) return;

            // Card background placeholder
            ctx.fillStyle = '#222222';
            ctx.fillRect(cardX, cardY, cardW, cardH);

            // Subtle border
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 1;
            ctx.strokeRect(cardX, cardY, cardW, cardH);

            // Title text preview inside card
            ctx.fillStyle = '#EEEEEE';
            ctx.font = 'bold 10px sans-serif';
            const displayTitle = entry.title.length > 20 ? `${entry.title.slice(0, 18)}...` : entry.title;
            ctx.fillText(displayTitle, cardX + 4, cardY + cardH - 10);

            cardX += cardW + 10;
          });

          if (itemIds.length > 12) {
            ctx.fillStyle = '#888888';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(`+${itemIds.length - 12} more`, cardX + 10, currentY + (rowHeight - 8) / 2 + 5);
          }
        }

        currentY += rowHeight;
      });

      // Footer branding
      ctx.fillStyle = '#555555';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Generated by BL Watchlist Manager · Share your tier list with fellow fans', width / 2, totalHeight - 20);

      // Download triggered
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${currentList.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_tier_list.png`;
      a.click();
    } catch {
      // Fallback
    } finally {
      setIsExportingImage(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* ── Top Bar & Controls ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#E50914]" />
            <h1 className="text-2xl font-extrabold tracking-tight">Tier List Builder</h1>
          </div>

          {/* List Selector Dropdown */}
          <div className="relative">
            <select
              value={activeListId}
              onChange={(e) => setActiveListId(e.target.value)}
              className="bg-[#181818] border border-white/10 rounded-xl px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-[#E50914] cursor-pointer"
            >
              {tierLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setNewListModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/10 text-white border border-white/10 transition-colors tap-active"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#E50914]" />
            <span>New List</span>
          </button>

          <button
            type="button"
            onClick={handleDuplicateList}
            title="Duplicate Current Tier List"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/10 text-[#aaa] hover:text-white transition-colors tap-active"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>

          <button
            type="button"
            onClick={copyTextSummary}
            title="Copy Tier List as Text"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/10 text-[#aaa] hover:text-white transition-colors tap-active"
          >
            {copyToast ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copyToast ? 'Copied!' : 'Share Text'}</span>
          </button>

          <button
            type="button"
            onClick={exportAsImage}
            disabled={isExportingImage}
            title="Export Image Snapshot"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#E50914] text-white hover:bg-[#E50914]/90 transition-colors tap-active disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExportingImage ? 'Exporting...' : 'Export PNG'}</span>
          </button>

          <button
            type="button"
            onClick={clearAllTiers}
            title="Clear all titles from tiers"
            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-red-500/15 text-[#888] hover:text-red-400 transition-colors tap-active"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {tierLists.length > 1 && (
            <button
              type="button"
              onClick={handleDeleteList}
              title="Delete current tier list"
              className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-red-500/15 text-[#888] hover:text-red-400 transition-colors tap-active"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Active Tier List Banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
        <div>
          <h2 className="text-lg font-bold text-white">{currentList.name}</h2>
          {currentList.description && (
            <p className="text-xs text-[#777] mt-0.5">{currentList.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-[#888]">
          <span>
            Ranked:{' '}
            <strong className="text-white font-bold">{rankedEntryIds.size}</strong> titles
          </span>
          <span>·</span>
          <span>
            Pool:{' '}
            <strong className="text-white font-bold">{unrankedEntries.length}</strong> available
          </span>
          <button
            type="button"
            onClick={() => addTier(undefined, 'end')}
            className="inline-flex items-center gap-1 ml-2 text-xs font-bold text-[#E50914] hover:text-[#ff4d58] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Tier
          </button>
        </div>
      </div>

      {/* ── TIER BOARD CONTAINER ── */}
      <div
        ref={tierContainerRef}
        className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#0c0c0c] p-3 sm:p-4 shadow-xl"
      >
        {currentList.tiers.map((tier, tierIdx) => {
          const entryIds = currentList.tierItems[tier.id] || [];
          const isOver = dragOverTierId === tier.id;

          return (
            <div
              key={tier.id}
              onDragOver={(e) => handleTierDragOver(e, tier.id)}
              onDrop={(e) => handleTierDrop(e, tier.id)}
              className={`flex flex-col sm:flex-row items-stretch rounded-xl overflow-hidden border transition-all ${
                isOver
                  ? 'border-[#E50914] ring-2 ring-[#E50914]/40 bg-[#161616]'
                  : 'border-white/[0.08] bg-[#121212] hover:border-white/15'
              }`}
            >
              {/* Tier Left Label Header */}
              <div
                style={{ backgroundColor: tier.color }}
                className="w-full sm:w-28 sm:min-w-[7rem] sm:max-w-[7rem] min-h-[4rem] sm:min-h-[6rem] p-3 flex sm:flex-col items-center justify-between text-white shrink-0 select-none shadow-md"
              >
                <div className="flex items-center sm:flex-col sm:justify-center flex-1 text-center">
                  <span className="text-xl sm:text-2xl font-black tracking-wide drop-shadow-md">
                    {tier.label}
                  </span>
                  {tier.description && (
                    <span className="hidden sm:block text-[9px] font-medium leading-tight opacity-90 mt-1 line-clamp-2">
                      {tier.description}
                    </span>
                  )}
                </div>

                {/* Tier Action Controls */}
                <div className="flex sm:flex-wrap items-center justify-end sm:justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditTier(tier)}
                    title="Customize Tier"
                    className="p-1 rounded bg-black/25 hover:bg-black/50 text-white transition-colors"
                  >
                    <Settings2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddTitleModalTierId(tier.id)}
                    title="Add Titles to this Tier"
                    className="p-1 rounded bg-black/25 hover:bg-black/50 text-white transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  {tierIdx > 0 && (
                    <button
                      type="button"
                      onClick={() => moveTier(tier.id, 'up')}
                      title="Move Tier Up"
                      className="p-1 rounded bg-black/25 hover:bg-black/50 text-white transition-colors"
                    >
                      <MoveUp className="w-3 h-3" />
                    </button>
                  )}
                  {tierIdx < currentList.tiers.length - 1 && (
                    <button
                      type="button"
                      onClick={() => moveTier(tier.id, 'down')}
                      title="Move Tier Down"
                      className="p-1 rounded bg-black/25 hover:bg-black/50 text-white transition-colors"
                    >
                      <MoveDown className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Tier Items Drop Zone */}
              <div className="flex-1 p-3 min-h-[5.5rem] flex flex-wrap items-center gap-2.5">
                {entryIds.length === 0 ? (
                  <div className="w-full flex items-center justify-center py-4 border border-dashed border-white/10 rounded-lg text-center text-xs text-[#555]">
                    <span>Drag and drop series here, or click &ldquo;+&rdquo; on the left</span>
                  </div>
                ) : (
                  entryIds.map((id, index) => {
                    const entry = entriesMap.get(id);
                    if (!entry) return null;
                    const isCardDragging = draggedEntryId === id;

                    return (
                      <div
                        key={id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, id, tier.id)}
                        onDragEnd={handleDragEnd}
                        className={`group relative w-16 sm:w-20 aspect-[2/3] rounded-lg overflow-hidden border border-white/10 bg-[#1e1e1e] cursor-grab active:cursor-grabbing transition-transform ${
                          isCardDragging ? 'opacity-30 scale-95' : 'hover:scale-105 hover:z-20 hover:shadow-lg'
                        }`}
                      >
                        {/* Poster Image */}
                        {entry.poster ? (
                          <img
                            src={entry.poster}
                            alt={entry.title}
                            className="w-full h-full object-cover select-none pointer-events-none"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#242424] flex items-center justify-center p-1 text-center">
                            <span className="text-[10px] font-bold text-[#888] line-clamp-3">
                              {entry.title}
                            </span>
                          </div>
                        )}

                        {/* Title pill on hover */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-1 pt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[10px] font-bold text-white truncate">{entry.title}</p>
                          <p className="text-[8px] text-[#aaa]">{entry.year}</p>
                        </div>

                        {/* Quick actions popup trigger on hover/click */}
                        <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCardActionEntryId(id);
                              setActiveCardActionTierId(tier.id);
                            }}
                            title="Card Options / Move"
                            className="p-1 rounded bg-black/80 hover:bg-[#E50914] text-white transition-colors"
                          >
                            <Sliders className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeEntryFromTier(id);
                            }}
                            title="Remove from Tier"
                            className="p-1 rounded bg-black/80 hover:bg-red-600 text-white transition-colors"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        {/* Position quick arrows */}
                        <div className="absolute top-1 left-1 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveEntryWithinTier(tier.id, id, 'up');
                              }}
                              className="p-0.5 rounded bg-black/80 hover:bg-white/20 text-white"
                            >
                              <MoveUp className="w-2.5 h-2.5" />
                            </button>
                          )}
                          {index < entryIds.length - 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveEntryWithinTier(tier.id, id, 'down');
                              }}
                              className="p-0.5 rounded bg-black/80 hover:bg-white/20 text-white"
                            >
                              <MoveDown className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>

                        {/* Click to open details */}
                        <button
                          type="button"
                          onClick={() => onSelectEntry?.(entry)}
                          className="absolute inset-0 z-10 w-full h-full text-transparent"
                          aria-label={`View ${entry.title}`}
                        >
                          View
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── UNRANKED POOL TRAY ── */}
      <div
        onDragOver={handlePoolDragOver}
        onDrop={handlePoolDrop}
        className={`rounded-2xl border transition-all ${
          dragOverTierId === 'pool'
            ? 'border-[#E50914] bg-[#E50914]/[0.05] ring-2 ring-[#E50914]/30'
            : 'border-white/[0.08] bg-[#0f0f0f]'
        } p-4 space-y-4`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Unranked BL Titles</h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/[0.08] text-[#aaa]">
                {unrankedEntries.length} available
              </span>
            </div>
            <p className="text-xs text-[#777] mt-0.5">
              Drag posters into any tier above, or click on a title to place it instantly.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addAllCompletedToPool}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[#aaa] hover:text-white transition-colors"
            >
              Filter Completed ({state.entries.filter((e) => e.status === 'COMPLETE').length})
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#666]" />
            <Input
              value={poolSearch}
              onChange={(e) => setPoolSearch(e.target.value)}
              placeholder="Search unranked..."
              className="h-9 pl-8 text-xs bg-white/[0.04] border-white/10 text-white placeholder:text-[#666]"
            />
          </div>

          <select
            value={poolStatusFilter}
            onChange={(e) => setPoolStatusFilter(e.target.value as 'ALL' | Status)}
            className="h-9 px-3 rounded-md bg-white/[0.04] border border-white/10 text-xs text-white outline-none cursor-pointer"
          >
            <option value="ALL">All Watch Statuses</option>
            <option value="COMPLETE">Completed</option>
            <option value="ONGOING">Watching / Ongoing</option>
            <option value="PLANNED">Plan to Watch</option>
            <option value="DROPPED">Dropped</option>
          </select>

          <select
            value={poolTypeFilter}
            onChange={(e) => setPoolTypeFilter(e.target.value as 'ALL' | 'Series' | 'Movie')}
            className="h-9 px-3 rounded-md bg-white/[0.04] border border-white/10 text-xs text-white outline-none cursor-pointer"
          >
            <option value="ALL">All Formats</option>
            <option value="Series">Series</option>
            <option value="Movie">Movie</option>
          </select>

          <select
            value={poolCountryFilter}
            onChange={(e) => setPoolCountryFilter(e.target.value)}
            className="h-9 px-3 rounded-md bg-white/[0.04] border border-white/10 text-xs text-white outline-none cursor-pointer"
          >
            <option value="ALL">All Countries</option>
            {poolCountries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Unranked Grid */}
        {unrankedEntries.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-white/10 rounded-xl">
            <Layers className="w-8 h-8 text-[#444] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#888]">No unranked titles found</p>
            <p className="text-xs text-[#555] mt-1">
              All matching titles have either been placed in your tier list or filtered out.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
            {unrankedEntries.map((entry) => {
              const isCardDragging = draggedEntryId === entry.id;

              return (
                <div
                  key={entry.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, entry.id, null)}
                  onDragEnd={handleDragEnd}
                  onClick={() => {
                    setActiveCardActionEntryId(entry.id);
                    setActiveCardActionTierId(null);
                  }}
                  className={`group relative aspect-[2/3] rounded-lg overflow-hidden border border-white/10 bg-[#161616] cursor-grab active:cursor-grabbing transition-all ${
                    isCardDragging ? 'opacity-30 scale-95' : 'hover:scale-105 hover:border-white/30 hover:z-10'
                  }`}
                >
                  {entry.poster ? (
                    <img
                      src={entry.poster}
                      alt={entry.title}
                      className="w-full h-full object-cover select-none pointer-events-none"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#1e1e1e] flex items-center justify-center p-1 text-center">
                      <span className="text-[10px] font-bold text-[#777] line-clamp-3">
                        {entry.title}
                      </span>
                    </div>
                  )}

                  {/* Quick Overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-1 pt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] font-bold text-white truncate">{entry.title}</p>
                    <p className="text-[8px] text-[#aaa]">
                      {entry.year} · {entry.type}
                    </p>
                  </div>

                  {/* Add badge button */}
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#E50914] text-white text-[10px] font-black shadow">
                      +
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL: Create New Tier List ── */}
      <Dialog open={newListModalOpen} onOpenChange={setNewListModalOpen}>
        <DialogContent className="bg-[#121212] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-[#E50914]" />
              Create New Tier List
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#aaa] mb-1">Tier List Title</label>
              <Input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g. 2024 Thai BL Tier List, Best Comfort BLs..."
                className="bg-white/[0.04] border-white/10 text-white placeholder:text-[#666]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#aaa] mb-2">Preset Template</label>
              <div className="space-y-2">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedTemplateId === tpl.id
                        ? 'border-[#E50914] bg-[#E50914]/10 ring-1 ring-[#E50914]'
                        : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                    }`}
                  >
                    <p className="text-sm font-bold text-white">{tpl.name}</p>
                    <p className="text-xs text-[#888] mt-0.5">{tpl.description}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      {tpl.tiers.map((t, i) => (
                        <span
                          key={i}
                          style={{ backgroundColor: t.color }}
                          className="px-2 py-0.5 text-[10px] font-black rounded text-white"
                        >
                          {t.label}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setNewListModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#aaa] hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateList}
                disabled={!newListName.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#E50914] text-white hover:bg-[#E50914]/90 disabled:opacity-40"
              >
                Create Tier List
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Edit Tier Definition ── */}
      <Dialog open={editTierModalOpen} onOpenChange={setEditTierModalOpen}>
        <DialogContent className="bg-[#121212] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#E50914]" />
              Customize Tier
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#aaa] mb-1">Tier Label / Rank</label>
              <Input
                value={editTierLabel}
                onChange={(e) => setEditTierLabel(e.target.value)}
                placeholder="e.g. S, S+, God Tier, Comfort..."
                className="bg-white/[0.04] border-white/10 text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#aaa] mb-1">
                Tier Color &amp; Badge
              </label>
              <div className="grid grid-cols-5 gap-2 mb-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setEditTierColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`h-8 rounded-lg flex items-center justify-center transition-transform ${
                      editTierColor === c.hex ? 'scale-110 ring-2 ring-white' : 'hover:opacity-90'
                    }`}
                  >
                    {editTierColor === c.hex && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editTierColor}
                  onChange={(e) => setEditTierColor(e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer bg-transparent border-0"
                />
                <Input
                  value={editTierColor}
                  onChange={(e) => setEditTierColor(e.target.value)}
                  placeholder="#E50914"
                  className="bg-white/[0.04] border-white/10 text-white font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#aaa] mb-1">Description (Optional)</label>
              <Input
                value={editTierDesc}
                onChange={(e) => setEditTierDesc(e.target.value)}
                placeholder="e.g. Must-watch masterpieces, rewatch every year"
                className="bg-white/[0.04] border-white/10 text-white text-xs"
              />
            </div>

            {/* Quick Actions for this tier */}
            {editingTier && (
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      clearTier(editingTier.id);
                      setEditTierModalOpen(false);
                    }}
                    className="text-xs text-[#aaa] hover:text-white px-2.5 py-1 rounded-lg bg-white/[0.05]"
                  >
                    Clear Items
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteTier(editingTier.id);
                      setEditTierModalOpen(false);
                    }}
                    className="text-xs text-red-400 hover:text-red-300 px-2.5 py-1 rounded-lg bg-red-500/10"
                  >
                    Delete Tier
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setEditTierModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#aaa] hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEditTier}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#E50914] text-white hover:bg-[#E50914]/90"
              >
                Save Changes
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Add Title to Tier (Search Picker) ── */}
      <Dialog open={Boolean(addTitleModalTierId)} onOpenChange={() => setAddTitleModalTierId(null)}>
        <DialogContent className="bg-[#121212] border-white/10 text-white sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#E50914]" />
              Add BL Title to{' '}
              {currentList.tiers.find((t) => t.id === addTitleModalTierId)?.label || 'Tier'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2 flex-1 flex flex-col overflow-hidden">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#666]" />
              <Input
                value={titlePickerSearch}
                onChange={(e) => setTitlePickerSearch(e.target.value)}
                placeholder="Search BL series or movie..."
                className="h-10 pl-9 bg-white/[0.04] border-white/10 text-white"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[260px]">
              {state.entries
                .filter((e) => {
                  if (!titlePickerSearch.trim()) return true;
                  return e.title.toLowerCase().includes(titlePickerSearch.trim().toLowerCase());
                })
                .slice(0, 30)
                .map((entry) => {
                  const currentTierId = Object.entries(currentList.tierItems).find(([, ids]) =>
                    ids.includes(entry.id)
                  )?.[0];
                  const currentTier = currentList.tiers.find((t) => t.id === currentTierId);

                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors border border-white/[0.05]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {entry.poster ? (
                          <img
                            src={entry.poster}
                            alt=""
                            className="w-8 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-8 h-12 rounded bg-[#242424] flex items-center justify-center text-[10px]">
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

                      <div className="flex items-center gap-2">
                        {currentTier && (
                          <span
                            style={{ backgroundColor: currentTier.color }}
                            className="text-[10px] font-black px-2 py-0.5 rounded text-white"
                          >
                            In {currentTier.label}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleAddTitleToTierFromModal(entry.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#E50914] text-white hover:bg-[#E50914]/90"
                        >
                          Select
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Quick Card Action Sheet (for Mobile / 1-click move) ── */}
      <Dialog
        open={Boolean(activeCardActionEntryId)}
        onOpenChange={() => {
          setActiveCardActionEntryId(null);
          setActiveCardActionTierId(null);
        }}
      >
        <DialogContent className="bg-[#141414] border-white/10 text-white sm:max-w-sm">
          {activeCardActionEntryId && (() => {
            const entry = entriesMap.get(activeCardActionEntryId);
            if (!entry) return null;

            return (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {entry.poster && (
                    <img
                      src={entry.poster}
                      alt=""
                      className="w-12 h-16 object-cover rounded-md shadow"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-white truncate">{entry.title}</h3>
                    <p className="text-xs text-[#888]">
                      {entry.year} · {entry.country} · {entry.type}
                    </p>
                    {activeCardActionTierId && (
                      <p className="text-[11px] text-[#E50914] font-semibold mt-1">
                        Currently in Tier:{' '}
                        {currentList.tiers.find((t) => t.id === activeCardActionTierId)?.label}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[#aaa] mb-2">Move to Tier:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {currentList.tiers.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          moveEntryToTier(entry.id, t.id);
                          setActiveCardActionEntryId(null);
                          setActiveCardActionTierId(null);
                        }}
                        style={{ borderColor: t.color }}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                          activeCardActionTierId === t.id
                            ? 'bg-white/10 ring-1 ring-white'
                            : 'bg-white/[0.03] hover:bg-white/[0.08]'
                        }`}
                      >
                        <span
                          style={{ backgroundColor: t.color }}
                          className="w-6 h-6 rounded flex items-center justify-center text-xs font-black text-white shrink-0"
                        >
                          {t.label}
                        </span>
                        <span className="text-xs font-bold text-white truncate">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
                  {activeCardActionTierId ? (
                    <button
                      type="button"
                      onClick={() => {
                        removeEntryFromTier(entry.id);
                        setActiveCardActionEntryId(null);
                        setActiveCardActionTierId(null);
                      }}
                      className="text-xs font-semibold text-red-400 hover:text-red-300"
                    >
                      Remove from Tier List
                    </button>
                  ) : <span />}

                  <button
                    type="button"
                    onClick={() => {
                      onSelectEntry?.(entry);
                      setActiveCardActionEntryId(null);
                      setActiveCardActionTierId(null);
                    }}
                    className="text-xs font-semibold text-white hover:underline"
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
