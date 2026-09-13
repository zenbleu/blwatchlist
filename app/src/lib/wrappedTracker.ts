// ── Monthly BL Wrapped — Activity Tracker ────────────────────────────────────
// Called from AppContext's dispatchWithTracking to incrementally record
// monthly events. All operations are async fire-and-forget.

import type { AppAction, AppState, Entry } from '@/types';
import {
  loadMonthlyActivity,
  saveMonthlyActivity,
  currentMonthKey,
  loadAnnualActivity,
  saveAnnualActivity,
} from '@/lib/wrappedDB';
import type { MonthlyActivityData, AnnualActivityData, AnnualTrackedEntry, AnnualRankingEntry } from '@/types/wrapped';
import { getWatcherTitle } from '@/lib/wrappedEngine';
import { calculateOverallRating } from '@/lib/rating';

function entryToTracked(e: Entry, rating?: number) {
  return {
    id: e.id,
    title: e.title,
    country: e.country,
    type: e.type,
    ...(rating !== undefined ? { rating } : {}),
  };
}

function entryToAnnualTracked(e: Entry, rating?: number): AnnualTrackedEntry {
  return entryToTracked(e, rating);
}

function unique<T extends { id: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  return arr.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function addUnique(values: string[], value: string): string[] {
  return values.includes(value) ? values : [...values, value];
}

/** Capture rank from current completed count */
function captureRank(state: AppState): { name: string | null; emoji: string | null } {
  const completedCount = state.entries.filter(e => e.status === 'COMPLETE').length;
  const watcher = getWatcherTitle(completedCount);
  return { name: watcher?.name ?? null, emoji: watcher?.emoji ?? null };
}

export async function trackWrappedEvent(action: AppAction, state: AppState): Promise<void> {
  try {
    // Only track actions that represent meaningful user activity
    const relevantTypes = [
      'ADD_ENTRY', 'UPDATE_ENTRY', 'DELETE_ENTRY',
      'TOGGLE_FAVORITE', 'UPDATE_FAVORITE',
      'ADD_TO_TOP10', 'REMOVE_FROM_TOP10', 'REORDER_TOP10', 'ADD_DRAWER',
      'PUSH_MILESTONE', 'UPDATE_ONGOING',
    ];
    if (!relevantTypes.includes(action.type)) return;

    const month = currentMonthKey();
    const year = Number(month.slice(0, 4));
    const [activity, annualActivity] = await Promise.all([
      loadMonthlyActivity(month),
      loadAnnualActivity(year),
    ]);
    const updated = processAction(action, state, activity);
    const updatedAnnual = processAnnualAction(action, state, annualActivity);
    await Promise.all([
      updated !== activity ? saveMonthlyActivity(updated) : Promise.resolve(),
      updatedAnnual !== annualActivity ? saveAnnualActivity(updatedAnnual) : Promise.resolve(),
    ]);
  } catch {
    // Never interrupt the main app
  }
}

function processAnnualAction(
  action: AppAction,
  state: AppState,
  activity: AnnualActivityData,
): AnnualActivityData {
  const rank = captureRank(state);
  const base: Partial<AnnualActivityData> = {
    rankAtLastUpdate: rank.name,
    rankEmojiAtLastUpdate: rank.emoji,
    collectionSizeAtLastUpdate: state.entries.length,
  };

  switch (action.type) {
    case 'ADD_ENTRY': {
      const entry = action.payload;
      const tracked = entryToAnnualTracked(entry);
      const patch: Partial<AnnualActivityData> = {
        totalEntriesAdded: activity.totalEntriesAdded + 1,
        netCollectionGrowth: activity.netCollectionGrowth + 1,
        moviesWatched: activity.moviesWatched + (entry.type === 'Movie' ? 1 : 0),
        seriesWatched: activity.seriesWatched + (entry.type === 'Series' ? 1 : 0),
      };
      if (entry.status === 'COMPLETE') {
        patch.completedTitles = unique([...activity.completedTitles, tracked]);
        patch.countriesWatched = addUnique(activity.countriesWatched, entry.country);
      }
      if (entry.status === 'ONGOING') patch.ongoingStarted = unique([...activity.ongoingStarted, tracked]);
      if (entry.status === 'PLANNED') patch.plannedTitles = unique([...activity.plannedTitles, tracked]);
      if (entry.status === 'DROPPED') patch.droppedTitles = unique([...activity.droppedTitles, tracked]);
      return { ...activity, ...base, ...patch };
    }

    case 'UPDATE_ENTRY': {
      const entry = action.payload;
      const oldEntry = state.entries.find(e => e.id === entry.id);
      if (!oldEntry || oldEntry.status === entry.status) return { ...activity, ...base };
      const tracked = entryToAnnualTracked(entry);
      if (entry.status === 'COMPLETE') {
        return {
          ...activity,
          ...base,
          statusCompletions: unique([...activity.statusCompletions, tracked]),
          countriesWatched: addUnique(activity.countriesWatched, entry.country),
        };
      }
      if (entry.status === 'DROPPED') {
        return { ...activity, ...base, droppedTitles: unique([...activity.droppedTitles, tracked]) };
      }
      if (entry.status === 'ONGOING') {
        return { ...activity, ...base, ongoingStarted: unique([...activity.ongoingStarted, tracked]) };
      }
      if (entry.status === 'PLANNED') {
        return { ...activity, ...base, plannedTitles: unique([...activity.plannedTitles, tracked]) };
      }
      return { ...activity, ...base };
    }

    case 'DELETE_ENTRY':
      return { ...activity, ...base, netCollectionGrowth: activity.netCollectionGrowth - 1 };

    case 'TOGGLE_FAVORITE': {
      const entryId = action.payload;
      const entry = state.entries.find(e => e.id === entryId);
      if (!entry) return { ...activity, ...base };
      const alreadyFavorited = state.favorites.some(f => f.entryId === entryId);
      return alreadyFavorited
        ? { ...activity, ...base, favoritesRemoved: activity.favoritesRemoved + 1 }
        : { ...activity, ...base, favoritesAdded: unique([...activity.favoritesAdded, entryToAnnualTracked(entry)]) };
    }

    case 'UPDATE_FAVORITE': {
      const fav = action.payload;
      const entry = state.entries.find(e => e.id === fav.entryId);
      if (!entry) return { ...activity, ...base };
      const rating = fav.overallRating;
      const existing = activity.ratingByEntry[fav.entryId];
      return {
        ...activity,
        ...base,
        ratingsGiven: existing ? activity.ratingsGiven : activity.ratingsGiven + 1,
        ratingsEdited: existing ? activity.ratingsEdited + 1 : activity.ratingsEdited,
        ratingValues: existing ? activity.ratingValues : [...activity.ratingValues, rating],
        ratingByEntry: {
          ...activity.ratingByEntry,
          [fav.entryId]: { ...entryToAnnualTracked(entry), rating },
        },
      };
    }

    case 'UPDATE_ONGOING': {
      const entry = state.entries.find(e => e.id === action.payload.entryId);
      return entry
        ? { ...activity, ...base, ongoingContinued: unique([...activity.ongoingContinued, entryToAnnualTracked(entry)]) }
        : { ...activity, ...base };
    }

    case 'ADD_TO_TOP10':
    case 'REMOVE_FROM_TOP10':
    case 'REORDER_TOP10': {
      const year = action.type === 'REORDER_TOP10' ? action.payload.year : action.payload.year;
      const drawer = state.top10Drawers.find(d => d.year === year);
      let entries = action.type === 'REORDER_TOP10'
        ? action.payload.entries
        : drawer?.entries ?? [];
      if (action.type === 'ADD_TO_TOP10' && !entries.some(entry => entry.entryId === action.payload.entryId)) {
        entries = [...entries, { entryId: action.payload.entryId, rank: entries.length + 1 }];
      }
      if (action.type === 'REMOVE_FROM_TOP10') {
        entries = entries
          .filter(entry => entry.entryId !== action.payload.entryId)
          .map((entry, index) => ({ ...entry, rank: index + 1 }));
      }
      const rankings: AnnualRankingEntry[] = entries.map(e => {
        const entry = state.entries.find(item => item.id === e.entryId);
        return entry
          ? { ...entryToAnnualTracked(entry), rank: e.rank, drawerYear: year }
          : null;
      }).filter(Boolean) as AnnualRankingEntry[];
      return {
        ...activity,
        ...base,
        top10Updates: activity.top10Updates + 1,
        top10Rankings: { ...activity.top10Rankings, [String(year)]: rankings },
      };
    }

    case 'ADD_DRAWER':
      return { ...activity, ...base, top10DrawersCreated: activity.top10DrawersCreated + 1 };

    case 'PUSH_MILESTONE': {
      const milestone = action.payload;
      const id = `${milestone.type}-${milestone.value}`;
      if (activity.milestonesUnlocked.some(m => m.id === id)) return { ...activity, ...base };
      return {
        ...activity,
        ...base,
        milestonesUnlocked: [
          ...activity.milestonesUnlocked,
          { id, title: milestone.title, type: milestone.type, value: milestone.value },
        ],
      };
    }

    default:
      return { ...activity, ...base };
  }
}

function processAction(
  action: AppAction,
  state: AppState,
  activity: MonthlyActivityData,
): MonthlyActivityData {
  const rank = captureRank(state);
  const base: Partial<MonthlyActivityData> = {
    rankAtLastUpdate: rank.name,
    rankEmojiAtLastUpdate: rank.emoji,
  };

  switch (action.type) {
    case 'ADD_ENTRY': {
      const entry = action.payload;
      const tracked = entryToTracked(entry);
      let patch: Partial<MonthlyActivityData> = {
        totalEntriesAdded: activity.totalEntriesAdded + 1,
        netCollectionGrowth: activity.netCollectionGrowth + 1,
      };
      if (entry.status === 'COMPLETE') {
        patch = { ...patch, completedTitles: unique([...activity.completedTitles, tracked]) };
        if (!activity.countriesWatched.includes(entry.country)) {
          patch = { ...patch, countriesWatched: [...activity.countriesWatched, entry.country] };
        }
      } else if (entry.status === 'ONGOING') {
        patch = { ...patch, ongoingStarted: unique([...activity.ongoingStarted, tracked]) };
      } else if (entry.status === 'PLANNED') {
        patch = { ...patch, plannedTitles: unique([...activity.plannedTitles, tracked]) };
      } else if (entry.status === 'DROPPED') {
        patch = { ...patch, droppedTitles: unique([...activity.droppedTitles, tracked]) };
      }
      return { ...activity, ...base, ...patch };
    }

    case 'UPDATE_ENTRY': {
      const entry = action.payload;
      const oldEntry = state.entries.find(e => e.id === entry.id);
      if (!oldEntry || oldEntry.status === entry.status) return { ...activity, ...base };

      // Status changed
      const tracked = entryToTracked(entry);
      let patch: Partial<MonthlyActivityData> = {};

      if (entry.status === 'COMPLETE') {
        patch = {
          statusCompletions: unique([...activity.statusCompletions, tracked]),
          countriesWatched: activity.countriesWatched.includes(entry.country)
            ? activity.countriesWatched
            : [...activity.countriesWatched, entry.country],
        };
      } else if (entry.status === 'DROPPED') {
        patch = { droppedTitles: unique([...activity.droppedTitles, tracked]) };
      } else if (entry.status === 'ONGOING') {
        // Only track if it wasn't already tracked this month as ongoing
        if (!activity.ongoingStarted.find(t => t.id === entry.id)) {
          patch = { ongoingStarted: [...activity.ongoingStarted, tracked] };
        }
      } else if (entry.status === 'PLANNED') {
        if (!activity.plannedTitles.find(t => t.id === entry.id)) {
          patch = { plannedTitles: [...activity.plannedTitles, tracked] };
        }
      }
      return { ...activity, ...base, ...patch };
    }

    case 'DELETE_ENTRY': {
      return {
        ...activity,
        ...base,
        netCollectionGrowth: activity.netCollectionGrowth - 1,
      };
    }

    case 'TOGGLE_FAVORITE': {
      const entryId = action.payload;
      const alreadyFavorited = state.favorites.some(f => f.entryId === entryId);
      const entry = state.entries.find(e => e.id === entryId);
      if (!entry) return { ...activity, ...base };

      if (alreadyFavorited) {
        // Removing
        return { ...activity, ...base, favoritesRemoved: activity.favoritesRemoved + 1 };
      } else {
        // Adding
        const tracked = entryToTracked(entry);
        return {
          ...activity,
          ...base,
          favoritesAdded: unique([...activity.favoritesAdded, tracked]),
        };
      }
    }

    case 'UPDATE_FAVORITE': {
      const fav = action.payload;
      const entry = state.entries.find(e => e.id === fav.entryId);
      if (!entry) return { ...activity, ...base };

      const existingRating = activity.ratingByEntry[fav.entryId];
      const isEdit = !!existingRating;

      const newRating = calculateOverallRating(fav);

      const newRatingByEntry = {
        ...activity.ratingByEntry,
        [fav.entryId]: { ...entryToTracked(entry), rating: newRating },
      };

      return {
        ...activity,
        ...base,
        ratingsGiven:  isEdit ? activity.ratingsGiven  : activity.ratingsGiven + 1,
        ratingsEdited: isEdit ? activity.ratingsEdited + 1 : activity.ratingsEdited,
        ratingValues:  isEdit ? activity.ratingValues  : [...activity.ratingValues, newRating],
        ratingByEntry: newRatingByEntry,
      };
    }

    case 'ADD_TO_TOP10':
    case 'REMOVE_FROM_TOP10':
    case 'REORDER_TOP10':
      return { ...activity, ...base, top10Updates: activity.top10Updates + 1 };

    case 'ADD_DRAWER':
      return { ...activity, ...base, top10DrawersCreated: activity.top10DrawersCreated + 1 };

    case 'PUSH_MILESTONE': {
      const milestone = action.payload;
      const alreadyTracked = activity.milestonesUnlocked.some(m => m.id === `${milestone.type}-${milestone.value}`);
      if (alreadyTracked) return { ...activity, ...base };
      return {
        ...activity,
        ...base,
        milestonesUnlocked: [
          ...activity.milestonesUnlocked,
          { id: `${milestone.type}-${milestone.value}`, title: milestone.title, type: milestone.type, value: milestone.value },
        ],
      };
    }

    default:
      return activity;
  }
}
