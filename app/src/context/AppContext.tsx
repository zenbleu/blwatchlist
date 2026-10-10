import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef, useState } from 'react';
import type {
  AppState,
  AppAction,
  Entry,
  Actor,
  ActorCredit,
  ActorRole,
  OngoingEntry,
  FavoriteEntry,
  Top10Drawer,
  AirDay,
  OngoingTrackingMode,
  LinkedReleaseMode,
  EntryRelationshipType,
  GenreTag,
  SpecialEpisode,
  EpisodeRating,
} from '@/types';
import { DEFAULT_GENRE_TAGS, normalizeGenreName } from '@/lib/genres';
import { saveToIndexedDB, loadFromIndexedDB } from '@/hooks/useIndexedDB';
import type { Milestone, MilestoneType } from '@/components/MilestoneModal';
import { trackWrappedEvent } from '@/lib/wrappedTracker';
import { calculateEvaluationDeduction, calculateOverallRating, getEpisodeAverage, getEpisodeProgress } from '@/lib/rating';
import { isEligibleForFavoriteOrTop10, isSameEntryIdentity } from '@/lib/entry';
import { isDateOnlyOnOrBefore } from '@/lib/episodeSchedule';

const AIR_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

function getCurrentDay(): string {
  const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  return AIR_DAYS.includes(day as typeof AIR_DAYS[number]) ? day : 'Monday';
}

/* ============================================================
   Milestone Definitions
   ============================================================ */

const MILESTONE_THRESHOLDS: Record<string, number[]> = {
  COLLECTION_SIZE: [50, 100, 150, 200, 250, 300, 500],
  FAVORITES_MILESTONE: [10, 25, 50, 75, 100],
};

function getMilestoneTitle(type: MilestoneType, value: number): string {
  switch (type) {
    case 'COLLECTION_SIZE': return `${value} Titles Collected!`;
    case 'FAVORITES_MILESTONE': return `${value} Favorites!`;
    case 'PERFECT_RATING': return 'First Perfect 10.0!';
    case 'TOP10_COMPLETE': return 'Top 10 Complete!';
    case 'ANNIVERSARY': return `${value}-Year Anniversary!`;
    default: return 'Milestone Reached!';
  }
}

function getMilestoneMessage(type: MilestoneType, value: number): string {
  switch (type) {
    case 'COLLECTION_SIZE': return `Your collection has grown to ${value} titles. Incredible dedication!`;
    case 'FAVORITES_MILESTONE': return `You've curated ${value} favorites. Your taste is impeccable!`;
    case 'PERFECT_RATING': return 'You gave your first perfect 10.0 rating. A true masterpiece!';
    case 'TOP10_COMPLETE': return 'You filled a Top 10 drawer for the first time. What a year!';
    case 'ANNIVERSARY': return `You've been watching BL for ${value} years. Here's to many more!`;
    default: return 'Keep up the amazing work!';
  }
}

export const initialState: AppState = {
  entries: [],
  genreTags: [...DEFAULT_GENRE_TAGS],
  actors: [],
  ongoing: [],
  favorites: [],
  ratings: [],
  top10Drawers: [],
  ongoingYear: new Date().getFullYear(),
  watchingSince: null,
  importMode: false,
  milestoneQueue: [],
  celebratedMilestones: [],
};

/** Migrate legacy status values and ensure entry timestamps exist */
function migrateEntry(e: Record<string, unknown>): Entry {
  let status = (e.status as string) || 'COMPLETE';
  // Legacy: INCOMPLETE -> COMPLETE
  if (status === 'INCOMPLETE') {
    status = 'COMPLETE';
  }
  // Ensure valid status
  if (!['COMPLETE', 'ONGOING', 'DROPPED', 'PLANNED'].includes(status)) {
    status = 'COMPLETE';
  }

  const season = typeof e.season === 'number' && Number.isInteger(e.season) && e.season >= 1
    ? e.season
    : undefined;
  const parentEntryId = typeof e.parentEntryId === 'string' && e.parentEntryId
    ? e.parentEntryId
    : undefined;
  const linkedReleaseMode = parentEntryId
    && (e.linkedReleaseMode === 'independent' || e.linkedReleaseMode === 'included')
    ? e.linkedReleaseMode as LinkedReleaseMode
    : undefined;
  const relationshipTypeValues: EntryRelationshipType[] = [
    'original',
    'continuation',
    'specialEpisode',
    'season',
    'spinOff',
    'sideStory',
  ];
  const relationshipType = parentEntryId
    ? relationshipTypeValues.includes(e.relationshipType as EntryRelationshipType)
      && e.relationshipType !== 'original'
      ? e.relationshipType as EntryRelationshipType
      : season == null ? 'continuation' : 'season'
    : season == null ? 'original' : 'season';

  const episodeRatings = e.episodeRatings && typeof e.episodeRatings === 'object'
    ? Object.entries(e.episodeRatings as Record<string, unknown>).reduce<Record<string, EpisodeRating>>((result, [episode, raw]) => {
      if (!/^\d+$/.test(episode) || !raw || typeof raw !== 'object') return result;
      const data = raw as Record<string, unknown>;
      const legacyRating = typeof data.rating === 'number'
        ? Math.min(10, Math.max(1, data.rating))
        : null;
      const legacyCategoryValues = [
        'pacingFlow',
        'contentScript',
        'performanceChemistry',
        'plausibilityLogic',
      ]
        .map((field) => data[field])
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
      const legacyOverall = legacyRating ?? (
        legacyCategoryValues.length > 0
          ? legacyCategoryValues.reduce((sum, value) => sum + value, 0) / legacyCategoryValues.length
          : null
      );
      const yourRating = typeof data.yourRating === 'number'
        ? Math.min(10, Math.max(1, data.yourRating))
        : legacyOverall === null ? null : Math.min(10, Math.max(1, legacyOverall));
      if (yourRating === null) return result;
      result[episode] = {
        yourRating,
        ...(typeof data.commentary === 'string' && data.commentary.trim()
          ? { commentary: data.commentary.trim() }
          : {}),
      };
      return result;
    }, {})
    : undefined;

  return {
    ...(e as unknown as Entry),
    status: status as Entry['status'],
    poster: (e.poster as string) ?? null,
    type: (e.type as 'Movie' | 'Series') || 'Series',
    season,
    relationshipType,
    specialNumber: typeof e.specialNumber === 'number' && Number.isInteger(e.specialNumber) && e.specialNumber > 0
      ? e.specialNumber
      : undefined,
    year: typeof e.year === 'number' ? e.year : new Date().getFullYear(),
    country: (e.country as string) || 'Unknown',
    title: (e.title as string) || 'Untitled',
    id: (e.id as string) || `bl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: typeof e.createdAt === 'number' ? e.createdAt : Date.now(),
    lastUpdatedAt: typeof e.lastUpdatedAt === 'number'
      ? e.lastUpdatedAt
      : (typeof e.createdAt === 'number' ? e.createdAt : Date.now()),
    parentEntryId,
    linkedReleaseMode,
    genres: Array.isArray(e.genres)
      ? [...new Set(e.genres.filter((genre): genre is string => typeof genre === 'string'))]
      : undefined,
    ...(episodeRatings && Object.keys(episodeRatings).length > 0 ? { episodeRatings } : {}),
    ...(typeof e.plannedTime === 'string' && /^\d{2}:\d{2}$/.test(e.plannedTime)
      ? { plannedTime: e.plannedTime }
      : {}),
  };
}

export function migrateGenreTags(raw: unknown): GenreTag[] {
  const defaultIds = new Set(DEFAULT_GENRE_TAGS.map((tag) => tag.id));
  const defaultNames = new Set(DEFAULT_GENRE_TAGS.map((tag) => normalizeGenreName(tag.name)));
  const customTags: GenreTag[] = [];
  const seenNames = new Set(defaultNames);
  const seenIds = new Set(defaultIds);

  if (Array.isArray(raw)) {
    raw.forEach((value) => {
      if (!value || typeof value !== 'object') return;
      const tag = value as Record<string, unknown>;
      const id = typeof tag.id === 'string' ? tag.id.trim() : '';
      const name = typeof tag.name === 'string' ? tag.name.trim() : '';
      const category = typeof tag.category === 'string' && tag.category.trim()
        ? tag.category.trim()
        : 'Custom';
      const color = typeof tag.color === 'string'
        && (/^#[0-9a-f]{6}$/i.test(tag.color) || /^hsl\(\d{1,3}\s+\d{1,3}%\s+\d{1,3}%\)$/i.test(tag.color))
        ? tag.color
        : '';
      if (!id || !name || !color || defaultIds.has(id)) return;
      const normalizedName = normalizeGenreName(name);
      if (seenIds.has(id) || seenNames.has(normalizedName)) return;
      seenIds.add(id);
      seenNames.add(normalizedName);
      customTags.push({ id, name, category, color, custom: true });
    });
  }

  return [...DEFAULT_GENRE_TAGS, ...customTags];
}

function migrateSpecialEpisode(raw: unknown, index: number): SpecialEpisode | null {
  if (!raw || typeof raw !== 'object') return null;
  const special = raw as Record<string, unknown>;
  const releaseDate = typeof special.releaseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(special.releaseDate)
    ? special.releaseDate
    : '';
  const specialNumber = typeof special.specialNumber === 'number'
    ? Math.max(1, Math.floor(special.specialNumber))
    : 0;
  const title = typeof special.title === 'string' ? special.title.trim() : '';
  if (!releaseDate || !specialNumber || !title) return null;

  return {
    id: typeof special.id === 'string' && special.id
      ? special.id
      : `special_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
    specialNumber,
    title,
    releaseDate,
    ...(typeof special.releaseTime === 'string' && /^\d{2}:\d{2}$/.test(special.releaseTime)
      ? { releaseTime: special.releaseTime }
      : {}),
    watched: Boolean(special.watched),
  };
}

function migrateActor(raw: unknown, index: number): Actor | null {
  if (!raw || typeof raw !== 'object') return null;
  const actor = raw as Record<string, unknown>;
  const name = typeof actor.name === 'string' ? actor.name.trim() : '';
  if (!name) return null;

  const filmography = Array.isArray(actor.filmography)
    ? actor.filmography
      .filter((credit): credit is Record<string, unknown> => Boolean(credit) && typeof credit === 'object')
      .map((credit) => {
        const entryId = typeof credit.entryId === 'string' ? credit.entryId : '';
        if (!entryId) return null;
        const role = credit.role === 'SUPPORTING' ? 'SUPPORTING' : 'MAIN';
        return {
          entryId,
          character: typeof credit.character === 'string' ? credit.character.trim() : '',
          role,
        } satisfies ActorCredit;
      })
      .filter((credit): credit is ActorCredit => credit !== null)
    : [];

  return {
    id: typeof actor.id === 'string' && actor.id
      ? actor.id
      : `actor_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`,
    photo: typeof actor.photo === 'string' ? actor.photo : null,
    name,
    nationality: typeof actor.nationality === 'string' && actor.nationality.trim()
      ? actor.nationality.trim()
      : 'Other',
    birthDate: typeof actor.birthDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(actor.birthDate)
      ? actor.birthDate
      : '',
    filmography,
  };
}

export function migrateOngoing(o: Record<string, unknown>): OngoingEntry | null {
  if (typeof o.entryId !== 'string' || !o.entryId) return null;

  const airDays = Array.isArray(o.airDays)
    ? o.airDays.filter((day): day is AirDay => AIR_DAYS.includes(day as AirDay))
    : [];

  return {
    entryId: o.entryId,
    currentEpisode: typeof o.currentEpisode === 'number' ? Math.max(0, o.currentEpisode) : 0,
    totalEpisodes: typeof o.totalEpisodes === 'number' ? Math.max(1, o.totalEpisodes) : 1,
    airDays: airDays.length > 0 ? airDays : ['Monday'],
    ...(typeof o.firstAirDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.firstAirDate)
      ? { firstAirDate: o.firstAirDate }
      : {}),
    ...(typeof o.airTime === 'string' && /^\d{2}:\d{2}$/.test(o.airTime)
      ? { airTime: o.airTime }
      : {}),
    premiereEpisodeCount: typeof o.premiereEpisodeCount === 'number'
      ? Math.max(1, Math.floor(o.premiereEpisodeCount))
      : 1,
    trackingMode: o.trackingMode === 'calendar' ? 'calendar' as OngoingTrackingMode : 'recurring',
    releaseDates: Array.isArray(o.releaseDates)
      ? o.releaseDates.filter(
          (date): date is string =>
            typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date),
        ).sort()
      : [],
    specialEpisodes: Array.isArray(o.specialEpisodes)
      ? o.specialEpisodes
        .map((special, index) => migrateSpecialEpisode(special, index))
        .filter((special): special is SpecialEpisode => special !== null)
      : [],
  };
}

function validateData(data: unknown): AppState {
  if (!data || typeof data !== 'object') return { ...initialState };
  const d = data as Record<string, unknown>;
  const entries = Array.isArray(d.entries) ? d.entries : [];
  const genreTags = migrateGenreTags(d.genreTags);
  const genreIds = new Set(genreTags.map((tag) => tag.id));
  const actors = Array.isArray(d.actors)
    ? d.actors
      .map((actor, index) => migrateActor(actor, index))
      .filter((actor): actor is Actor => actor !== null)
    : [];
  const ongoing = Array.isArray(d.ongoing) ? d.ongoing : [];
  const favorites = Array.isArray(d.favorites) ? d.favorites : [];
  // Older backups kept evaluation data inside favorites. Preserve it as the
  // initial rating set when the new independent ratings collection is absent.
  const ratings = Array.isArray(d.ratings) ? d.ratings : favorites;
  const top10Drawers = Array.isArray(d.top10Drawers) ? d.top10Drawers : [];
  const ongoingYear = typeof d.ongoingYear === 'number' ? d.ongoingYear : new Date().getFullYear();
  const watchingSince = typeof d.watchingSince === 'number' ? d.watchingSince : null;

  // Migrate milestone-related fields
  const celebratedMilestones = Array.isArray(d.celebratedMilestones) ? d.celebratedMilestones as string[] : [];

  const migratedEntriesRaw = entries.map((e: Record<string, unknown>) => {
    const entry = migrateEntry(e);
    return {
      ...entry,
      ...(entry.genres ? { genres: entry.genres.filter((genreId) => genreIds.has(genreId)) } : {}),
    };
  });
  const entriesById = new Map<string, Entry>(
    migratedEntriesRaw.map((entry) => [entry.id, entry] as const),
  );
  const migratedEntries: Entry[] = migratedEntriesRaw.map((entry): Entry =>
    entry.parentEntryId
      && entry.parentEntryId !== entry.id
      && entriesById.has(entry.parentEntryId)
      && !entriesById.get(entry.parentEntryId)?.parentEntryId
      ? entry
      : {
          ...entry,
          parentEntryId: undefined,
          linkedReleaseMode: undefined,
          relationshipType: entry.season == null ? 'original' : 'season',
        },
  );

  const migratedOngoing = ongoing
    .map((o) => migrateOngoing(o as Record<string, unknown>))
    .filter((o): o is OngoingEntry => o !== null);
  const migratedSpecialEntries: Entry[] = [];
  const convertedSpecialParentIds = new Set<string>();
  const legacySpecialSchedules: OngoingEntry[] = [];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  for (const ongoingEntry of migratedOngoing) {
    if (ongoingEntry.specialEpisodes?.length) {
      const parent = migratedEntries.find((entry) => entry.id === ongoingEntry.entryId);
      if (parent) {
        convertedSpecialParentIds.add(parent.id);
        for (const special of ongoingEntry.specialEpisodes) {
          const specialYear = Number(special.releaseDate.slice(0, 4));
          if (migratedEntries.some((entry) => isSameEntryIdentity(entry, {
            title: special.title,
            type: parent.type,
            year: specialYear,
            country: parent.country,
            season: null,
            specialNumber: special.specialNumber,
            parentEntryId: parent.id,
            relationshipType: 'specialEpisode',
          }))) continue;
          let id = `linked_special_${parent.id}_${special.id}`;
          let suffix = 1;
          while (migratedEntries.some((entry) => entry.id === id)
            || migratedSpecialEntries.some((entry) => entry.id === id)) {
            id = `linked_special_${parent.id}_${special.id}_${suffix++}`;
          }
          const status: Entry['status'] = special.watched
            ? 'COMPLETE'
            : special.releaseDate > today ? 'PLANNED' : 'ONGOING';
          const timestamp = Math.max(Date.now(), parent.createdAt || 0);
          migratedSpecialEntries.push({
            id,
            title: special.title,
            type: parent.type,
            relationshipType: 'specialEpisode',
            specialNumber: special.specialNumber,
            parentEntryId: parent.id,
            linkedReleaseMode: 'included',
            poster: parent.poster,
            year: specialYear,
            country: parent.country,
            status,
            createdAt: timestamp,
            lastUpdatedAt: timestamp,
            plannedDate: special.releaseDate,
            ...(special.releaseTime ? { plannedTime: special.releaseTime } : {}),
          });
          if (!special.watched) {
            legacySpecialSchedules.push({
              entryId: id,
              currentEpisode: 0,
              totalEpisodes: 1,
              airDays: ['Monday'],
              firstAirDate: special.releaseDate,
              ...(special.releaseTime ? { airTime: special.releaseTime } : {}),
              premiereEpisodeCount: 1,
              trackingMode: 'calendar',
              releaseDates: [special.releaseDate],
              specialEpisodes: [],
            });
          }
        }
      }
    }
  }
  const allMigratedEntries = [...migratedEntries, ...migratedSpecialEntries];
  const normalizedOngoing = migratedOngoing.map((item) =>
    convertedSpecialParentIds.has(item.entryId)
      ? { ...item, specialEpisodes: [] }
      : item,
  );

  // Clean up: remove favorites for dropped entries
  const favoritesRaw = favorites as unknown as Record<string, unknown>[];

  const validFavorites = favoritesRaw
    .filter((f) => {
      const entry = allMigratedEntries.find((e: Entry) => e.id === f.entryId);
      return entry && entry.status !== 'DROPPED';
    })
    .map((f) => ({
      entryId: (f.entryId as string) || '',
      storyline: typeof f.storyline === 'number' ? f.storyline : 5,
      acting: typeof f.acting === 'number' ? f.acting : 5,
      music: typeof f.music === 'number' ? f.music : 5,
      chemistry: typeof f.chemistry === 'number' ? f.chemistry : 5,
      production: typeof f.production === 'number'
        ? f.production
        : (typeof f.cinematography === 'number' ? f.cinematography : 5),
      cinematography: typeof f.cinematography === 'number' ? f.cinematography : 5,
      originality: Boolean(f.originality),
      characterDepth: Boolean(f.characterDepth),
      relationshipDynamics: Boolean(f.relationshipDynamics),
      outstandingChemistry: Boolean(f.outstandingChemistry),
      naturalSkinship: Boolean(f.naturalSkinship),
      secondaryCouple: Boolean(f.secondaryCouple),
      soundtrack: Boolean(f.soundtrack),
      cinematographyBonus: Boolean(f.cinematographyBonus),
      emotionalImpact: Boolean(f.emotionalImpact),
      ending: Boolean(f.ending),
      comfortAura: Boolean(f.comfortAura),
      rewatchValue: Boolean(f.rewatchValue),
      flowAndPacing: Boolean(f.flowAndPacing),
      gapPenalty: typeof f.gapPenalty === 'number' ? f.gapPenalty : 0,
      overallRating: typeof f.overallRating === 'number' ? f.overallRating : 5.0,
    })) as unknown as FavoriteEntry[];
  const recalculatedFavorites = validFavorites.map((favorite) => {
    const next = {
      ...favorite,
       storyline: getEpisodeAverage(allMigratedEntries.find((entry) => entry.id === favorite.entryId)?.episodeRatings) ?? favorite.storyline,
      gapPenalty: 0,
      overallRating: 0,
    };
    next.gapPenalty = calculateEvaluationDeduction(next);
    next.overallRating = calculateOverallRating(next);
    return next;
  });

  const validRatings = (ratings as unknown as Record<string, unknown>[])
    .filter((r) => allMigratedEntries.some((e: Entry) => e.id === r.entryId))
    .map((r) => ({
      entryId: (r.entryId as string) || '',
      storyline: typeof r.storyline === 'number' ? r.storyline : 5,
      acting: typeof r.acting === 'number' ? r.acting : 5,
      music: typeof r.music === 'number' ? r.music : 5,
      chemistry: typeof r.chemistry === 'number' ? r.chemistry : 5,
      production: typeof r.production === 'number'
        ? r.production
        : (typeof r.cinematography === 'number' ? r.cinematography : 5),
      cinematography: typeof r.cinematography === 'number' ? r.cinematography : 5,
      originality: Boolean(r.originality),
      characterDepth: Boolean(r.characterDepth),
      relationshipDynamics: Boolean(r.relationshipDynamics),
      outstandingChemistry: Boolean(r.outstandingChemistry),
      naturalSkinship: Boolean(r.naturalSkinship),
      secondaryCouple: Boolean(r.secondaryCouple),
      soundtrack: Boolean(r.soundtrack),
      cinematographyBonus: Boolean(r.cinematographyBonus),
      emotionalImpact: Boolean(r.emotionalImpact),
      ending: Boolean(r.ending),
      comfortAura: Boolean(r.comfortAura),
      rewatchValue: Boolean(r.rewatchValue),
      flowAndPacing: Boolean(r.flowAndPacing),
      gapPenalty: typeof r.gapPenalty === 'number' ? r.gapPenalty : 0,
      overallRating: typeof r.overallRating === 'number' ? r.overallRating : 5.0,
    })) as unknown as FavoriteEntry[];
  const recalculatedRatings = validRatings.map((rating) => {
    const next = {
      ...rating,
       storyline: getEpisodeAverage(allMigratedEntries.find((entry) => entry.id === rating.entryId)?.episodeRatings) ?? rating.storyline,
      gapPenalty: 0,
      overallRating: 0,
    };
    next.gapPenalty = calculateEvaluationDeduction(next);
    next.overallRating = calculateOverallRating(next);
    return next;
  });

  // Clean up: remove top10 entries for dropped entries
  const validTop10Drawers = (top10Drawers as unknown as Record<string, unknown>[]).map((td) => ({
    year: typeof td.year === 'number' ? td.year : new Date().getFullYear(),
    entries: (Array.isArray(td.entries) ? (td.entries as unknown as Record<string, unknown>[]) : [])
      .filter((e) => {
        const entry = allMigratedEntries.find((en: Entry) => en.id === e.entryId);
        return entry && entry.status !== 'DROPPED';
      })
      .map((e) => ({
        entryId: (e.entryId as string) || '',
        rank: typeof e.rank === 'number' ? e.rank : 1
      }))
  })) as unknown as Top10Drawer[];

  return {
    entries: allMigratedEntries as unknown as Entry[],
    genreTags,
    actors,
    ongoing: [...normalizedOngoing, ...legacySpecialSchedules],
    favorites: recalculatedFavorites,
    ratings: recalculatedRatings,
    top10Drawers: validTop10Drawers,
    ongoingYear,
    watchingSince,
    importMode: false,
    milestoneQueue: [],
    celebratedMilestones,
  };
}

/* ============================================================
   Milestone Checking Logic
   ============================================================ */

function checkMilestoneThreshold(
  type: MilestoneType,
  value: number,
  celebrated: string[],
): Milestone | null {
  const thresholds = MILESTONE_THRESHOLDS[type];
  if (!thresholds) return null;

  for (const threshold of thresholds) {
    if (value >= threshold) {
      const milestoneId = `${type}-${threshold}`;
      if (!celebrated.includes(milestoneId)) {
        return {
          type,
          title: getMilestoneTitle(type, threshold),
          message: getMilestoneMessage(type, threshold),
          value: threshold,
        };
      }
    }
  }
  return null;
}

function nextEntryTimestamp(entries: Entry[]): number {
  const latestTimestamp = entries.reduce(
    (latest, entry) => Math.max(latest, entry.lastUpdatedAt || entry.createdAt || 0),
    0,
  );
  return Math.max(Date.now(), latestTimestamp + 1);
}

function createOngoingFromPlanned(entry: Entry): OngoingEntry {
  return {
    entryId: entry.id,
    currentEpisode: 0,
    totalEpisodes: 1,
    airDays: [getCurrentDay() as AirDay],
    firstAirDate: entry.plannedDate,
    airTime: entry.plannedTime || '00:00',
    trackingMode: 'calendar',
    releaseDates: [entry.plannedDate as string],
    premiereEpisodeCount: 1,
  };
}

function touchEntry(entries: Entry[], entryId: string): Entry[] {
  const timestamp = nextEntryTimestamp(entries);
  return entries.map((entry) =>
    entry.id === entryId ? { ...entry, lastUpdatedAt: timestamp } : entry,
  );
}

function entryContentChanged(previous: Entry, next: Entry): boolean {
  return previous.title !== next.title
    || previous.type !== next.type
    || previous.year !== next.year
    || previous.country !== next.country
    || previous.status !== next.status
    || previous.poster !== next.poster
    || previous.season !== next.season
    || previous.relationshipType !== next.relationshipType
    || previous.specialNumber !== next.specialNumber
    || previous.parentEntryId !== next.parentEntryId
    || previous.linkedReleaseMode !== next.linkedReleaseMode
    || previous.plannedDate !== next.plannedDate
    || previous.plannedTime !== next.plannedTime
    || JSON.stringify(previous.genres || []) !== JSON.stringify(next.genres || []);
}

function evaluationChanged(previous: FavoriteEntry | undefined, next: FavoriteEntry): boolean {
  if (!previous) return true;
  return previous.storyline !== next.storyline
    || previous.acting !== next.acting
    || previous.music !== next.music
    || previous.chemistry !== next.chemistry
    || previous.production !== next.production
    || previous.cinematography !== next.cinematography
    || previous.originality !== next.originality
    || previous.characterDepth !== next.characterDepth
    || previous.relationshipDynamics !== next.relationshipDynamics
    || previous.outstandingChemistry !== next.outstandingChemistry
    || previous.naturalSkinship !== next.naturalSkinship
    || previous.secondaryCouple !== next.secondaryCouple
    || previous.soundtrack !== next.soundtrack
    || previous.cinematographyBonus !== next.cinematographyBonus
    || previous.emotionalImpact !== next.emotionalImpact
    || previous.ending !== next.ending
    || previous.comfortAura !== next.comfortAura
    || previous.rewatchValue !== next.rewatchValue
    || previous.gapPenalty !== next.gapPenalty
    || previous.overallRating !== next.overallRating;
}

function ongoingChanged(previous: OngoingEntry | undefined, next: OngoingEntry): boolean {
  if (!previous) return true;
  return previous.currentEpisode !== next.currentEpisode
    || previous.totalEpisodes !== next.totalEpisodes
    || previous.trackingMode !== next.trackingMode
    || previous.firstAirDate !== next.firstAirDate
    || previous.airTime !== next.airTime
    || previous.premiereEpisodeCount !== next.premiereEpisodeCount
    || previous.airDays.join('|') !== next.airDays.join('|')
    || (previous.releaseDates || []).join('|') !== (next.releaseDates || []).join('|')
    || JSON.stringify(previous.specialEpisodes || []) !== JSON.stringify(next.specialEpisodes || []);
}

function hasDuplicateEntry(entries: Entry[], candidate: Entry, excludeId?: string): boolean {
  return entries.some((entry) =>
    entry.id !== (excludeId || candidate.id) &&
    isSameEntryIdentity(entry, candidate),
  );
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload;

    case 'PROMOTE_PLANNED_ENTRIES': {
      const plannedEntries = state.entries.filter(
        (entry) => entry.status === 'PLANNED'
          && entry.plannedDate
          && isDateOnlyOnOrBefore(entry.plannedDate),
      );
      if (plannedEntries.length === 0) return state;

      const timestamp = nextEntryTimestamp(state.entries);
      const promotedIds = new Set(plannedEntries.map((entry) => entry.id));
      const entries = state.entries.map((entry) => {
        if (!promotedIds.has(entry.id)) return entry;
        return {
          ...entry,
          status: 'ONGOING' as const,
          lastUpdatedAt: timestamp,
        };
      });
      let ongoing = [...state.ongoing];

      plannedEntries.forEach((entry) => {
        const existing = ongoing.find((item) => item.entryId === entry.id);
        if (!existing) {
          ongoing.push(createOngoingFromPlanned(entry));
        }
      });

      return { ...state, entries, ongoing };
    }

    case 'ADD_ENTRY': {
      if (hasDuplicateEntry(state.entries, action.payload)) return state;
      if (action.payload.parentEntryId && (
        action.payload.parentEntryId === action.payload.id
        || !state.entries.some(
          (entry) => entry.id === action.payload.parentEntryId && !entry.parentEntryId,
        )
      )) return state;
      const entry = {
        ...action.payload,
        lastUpdatedAt: nextEntryTimestamp(state.entries),
      };
      let ongoing = state.ongoing;
      if (entry.status === 'ONGOING') {
        const o: OngoingEntry = {
          entryId: entry.id,
          currentEpisode: 0,
          totalEpisodes: 1,
          airDays: [getCurrentDay() as AirDay]
        };
        ongoing = [...state.ongoing, o];
      }
      return { ...state, entries: [...state.entries, entry], ongoing };
    }

    case 'ADD_GENRE_TAG': {
      const name = action.payload.name.trim();
      if (!name
        || state.genreTags.some((tag) =>
          tag.id === action.payload.id
          || normalizeGenreName(tag.name) === normalizeGenreName(name),
        )) return state;
      return {
        ...state,
        genreTags: [...state.genreTags, { ...action.payload, name }],
      };
    }

    case 'DELETE_GENRE_TAG': {
      const tag = state.genreTags.find((item) => item.id === action.payload);
      if (!tag?.custom) return state;
      const timestamp = nextEntryTimestamp(state.entries);
      return {
        ...state,
        genreTags: state.genreTags.filter((item) => item.id !== action.payload),
        entries: state.entries.map((entry) => {
          if (!entry.genres?.includes(action.payload)) return entry;
          return {
            ...entry,
            genres: (entry.genres ?? []).filter((genreId) => genreId !== action.payload),
            lastUpdatedAt: timestamp,
          };
        }),
      };
    }

    case 'ADD_ACTOR':
      if (state.actors.some((actor) => actor.name.trim().toLocaleLowerCase() === action.payload.name.trim().toLocaleLowerCase())) {
        return state;
      }
      return { ...state, actors: [...state.actors, action.payload] };

    case 'UPDATE_ACTOR':
      return {
        ...state,
        actors: state.actors.map((actor) => actor.id === action.payload.id ? action.payload : actor),
      };

    case 'DELETE_ACTOR':
      return { ...state, actors: state.actors.filter((actor) => actor.id !== action.payload) };

    case 'UPDATE_ACTOR_CREDIT': {
      const { actorId, entryId, character, role } = action.payload;
      return {
        ...state,
        actors: state.actors.map((actor) => {
          if (actor.id !== actorId) return actor;
          const existingCredit = actor.filmography.find((credit) => credit.entryId === entryId);
          const nextCredit: ActorCredit = { entryId, character: character.trim(), role: role as ActorRole };
          return {
            ...actor,
            filmography: existingCredit
              ? actor.filmography.map((credit) => credit.entryId === entryId ? nextCredit : credit)
              : [...actor.filmography, nextCredit],
          };
        }),
      };
    }

    case 'REMOVE_ACTOR_CREDIT': {
      const { actorId, entryId } = action.payload;
      return {
        ...state,
        actors: state.actors.map((actor) => actor.id === actorId
          ? { ...actor, filmography: actor.filmography.filter((credit) => credit.entryId !== entryId) }
          : actor),
      };
    }

    case 'BULK_ADD_ACTOR_CREDITS': {
      const actorIds = new Set(action.payload.actorIds);
      const entryIds = [...new Set(action.payload.entryIds)];
      return {
        ...state,
        actors: state.actors.map((actor) => {
          if (!actorIds.has(actor.id)) return actor;
          const existingEntryIds = new Set(actor.filmography.map((credit) => credit.entryId));
          const newCredits: ActorCredit[] = entryIds
            .filter((entryId) => !existingEntryIds.has(entryId))
            .map((entryId) => ({ entryId, character: '', role: action.payload.role }));
          return newCredits.length > 0
            ? { ...actor, filmography: [...actor.filmography, ...newCredits] }
            : actor;
        }),
      };
    }

    case 'UPDATE_ENTRY': {
      const oldEntry = state.entries.find(e => e.id === action.payload.id);
      if (!oldEntry) return state;
      if (hasDuplicateEntry(state.entries, action.payload, action.payload.id)) return state;
      const parentEntryId = action.payload.parentEntryId;
      if (parentEntryId && (
        parentEntryId === action.payload.id
        || !state.entries.some((candidate) =>
          candidate.id === parentEntryId && !candidate.parentEntryId,
        )
      )) return state;
      // Episode ratings have their own UPDATE_EPISODE_RATING action. Generic
      // entry edits must not overwrite them with stale or incomplete form data.
      const nextPayload = { ...action.payload, episodeRatings: oldEntry.episodeRatings };
      const changed = entryContentChanged(oldEntry, nextPayload);
      const entry = changed
        ? { ...nextPayload, lastUpdatedAt: nextEntryTimestamp(state.entries) }
        : { ...nextPayload, lastUpdatedAt: oldEntry.lastUpdatedAt };
      const entries = state.entries.map(e => e.id === entry.id ? entry : e);
      let ongoing = state.ongoing;

      // Handle status change effects
      const hadOngoing = oldEntry?.status === 'ONGOING';
      const nowOngoing = entry.status === 'ONGOING';

      if (nowOngoing) {
        if (!state.ongoing.find(o => o.entryId === entry.id)) {
          const o: OngoingEntry = {
            entryId: entry.id,
            currentEpisode: 0,
            totalEpisodes: 1,
            airDays: [getCurrentDay() as AirDay]
          };
          ongoing = [...state.ongoing, o];
        }
      } else if (hadOngoing) {
        ongoing = state.ongoing.filter(o => o.entryId !== entry.id);
      }

      // If status changed to DROPPED, remove from favorites and top10
      let favorites = state.favorites;
      let ratings = state.ratings;
      let top10Drawers = state.top10Drawers;
      if (entry.status === 'DROPPED' && oldEntry?.status !== 'DROPPED') {
        favorites = state.favorites.filter(f => f.entryId !== entry.id);
        ratings = state.ratings.filter(r => r.entryId !== entry.id);
        top10Drawers = state.top10Drawers.map(d => ({
          ...d,
          entries: d.entries.filter(e => e.entryId !== entry.id).map((e, i) => ({ ...e, rank: i + 1 }))
        }));
      }

      return { ...state, entries, ongoing, favorites, ratings, top10Drawers };
    }

    case 'DELETE_ENTRY': {
      const id = action.payload;
      return {
        ...state,
        // Keep linked releases when their parent is removed, but detach them
        // rather than leaving a broken parent reference.
        entries: state.entries
          .filter(e => e.id !== id)
          .map(e => e.parentEntryId === id
            ? {
                ...e,
                parentEntryId: undefined,
                linkedReleaseMode: undefined,
                relationshipType: e.season == null ? 'original' : 'season',
                specialNumber: undefined,
              }
            : e),
        ongoing: state.ongoing.filter(o => o.entryId !== id),
        favorites: state.favorites.filter(f => f.entryId !== id),
        ratings: state.ratings.filter(r => r.entryId !== id),
        top10Drawers: state.top10Drawers.map(d => ({
          ...d,
          entries: d.entries.filter(e => e.entryId !== id).map((e, i) => ({ ...e, rank: i + 1 }))
        }))
      };
    }

    case 'TOGGLE_FAVORITE': {
      const entryId = action.payload;
      const entry = state.entries.find(e => e.id === entryId);

      if (state.favorites.find(f => f.entryId === entryId)) {
        return {
          ...state,
          entries: touchEntry(state.entries, entryId),
          favorites: state.favorites.filter(f => f.entryId !== entryId),
        };
      }
      if (!entry || !isEligibleForFavoriteOrTop10(entry)) return state;
      const newFav: FavoriteEntry = {
        entryId,
        storyline: 5,
        acting: 5,
        music: 5,
        chemistry: 5,
        production: 5,
        cinematography: 5,
        originality: false,
        characterDepth: false,
        relationshipDynamics: false,
        outstandingChemistry: false,
        naturalSkinship: false,
        secondaryCouple: false,
        soundtrack: false,
        cinematographyBonus: false,
        emotionalImpact: false,
        ending: false,
        comfortAura: false,
        rewatchValue: false,
        flowAndPacing: false,
        gapPenalty: 0.7,
        overallRating: calculateOverallRating({
          storyline: 5,
          acting: 5,
          music: 5,
          chemistry: 5,
          production: 5,
          cinematography: 5,
          originality: false,
          characterDepth: false,
          relationshipDynamics: false,
          outstandingChemistry: false,
          naturalSkinship: false,
          secondaryCouple: false,
          soundtrack: false,
          cinematographyBonus: false,
          emotionalImpact: false,
          ending: false,
          comfortAura: false,
          rewatchValue: false,
        })
      };
      return {
        ...state,
        entries: touchEntry(state.entries, entryId),
        favorites: [...state.favorites, newFav],
      };
    }

    case 'UPDATE_FAVORITE': {
      const favoriteEntry = state.entries.find((entry) => entry.id === action.payload.entryId);
      if (!favoriteEntry || !isEligibleForFavoriteOrTop10(favoriteEntry)) return state;
      const updated = {
        ...action.payload,
        gapPenalty: calculateEvaluationDeduction(action.payload),
        overallRating: 0
      };
      updated.overallRating = calculateOverallRating(updated);
      const existing = state.favorites.find(f => f.entryId === updated.entryId);
      return {
        ...state,
        entries: evaluationChanged(existing, updated)
          ? touchEntry(state.entries, updated.entryId)
          : state.entries,
        favorites: state.favorites.map(f => f.entryId === updated.entryId ? updated : f)
      };
    }

    case 'REMOVE_FAVORITE':
      return { ...state, favorites: state.favorites.filter(f => f.entryId !== action.payload) };

    case 'UPDATE_RATING': {
      const ratedEntry = state.entries.find((entry) => entry.id === action.payload.entryId);
      if (!ratedEntry || !isEligibleForFavoriteOrTop10(ratedEntry)) return state;
      const updated = {
        ...action.payload,
        gapPenalty: calculateEvaluationDeduction(action.payload),
        overallRating: 0
      };
      updated.overallRating = calculateOverallRating(updated);
      const existing = state.ratings.find(r => r.entryId === updated.entryId);
      return {
        ...state,
        entries: evaluationChanged(existing, updated)
          ? touchEntry(state.entries, updated.entryId)
          : state.entries,
        ratings: existing
          ? state.ratings.map(r => r.entryId === updated.entryId ? updated : r)
          : [...state.ratings, updated],
      };
    }

    case 'REMOVE_RATING':
      return { ...state, ratings: state.ratings.filter(r => r.entryId !== action.payload) };

    case 'UPDATE_EPISODE_RATING': {
      const { entryId, episodeNumber, rating } = action.payload;
      if (!Number.isInteger(episodeNumber) || episodeNumber < 1) return state;
      const existingEntry = state.entries.find((entry) => entry.id === entryId);
      if (!existingEntry) return state;

      const hadEpisodeRatings = Object.keys(existingEntry.episodeRatings || {}).length > 0;
      const episodeRatings = { ...(existingEntry.episodeRatings || {}) };
      if (rating === undefined) {
        delete episodeRatings[String(episodeNumber)];
      } else {
        episodeRatings[String(episodeNumber)] = {
          yourRating: Math.min(10, Math.max(1, rating.yourRating)),
          ...(rating.commentary?.trim() ? { commentary: rating.commentary.trim() } : {}),
        };
      }

      const nextEntry = {
        ...existingEntry,
        ...(Object.keys(episodeRatings).length > 0 ? { episodeRatings } : { episodeRatings: undefined }),
        lastUpdatedAt: nextEntryTimestamp(state.entries),
      };
      const nextProgress = getEpisodeProgress(episodeRatings);
      return {
        ...state,
        entries: state.entries.map((entry) => entry.id === entryId ? nextEntry : entry),
        ongoing: state.ongoing.map((ongoing) =>
          ongoing.entryId === entryId
            ? { ...ongoing, currentEpisode: hadEpisodeRatings || nextProgress > 0 ? nextProgress : ongoing.currentEpisode }
            : ongoing,
        ),
      };
    }

    case 'UPDATE_ONGOING': {
      const existing = state.ongoing.find(o => o.entryId === action.payload.entryId);
      const entries = ongoingChanged(existing, action.payload)
        ? touchEntry(state.entries, action.payload.entryId)
        : state.entries;
      return existing
        ? {
            ...state,
            entries,
            ongoing: state.ongoing.map(o => o.entryId === action.payload.entryId ? action.payload : o),
          }
        : {
            ...state,
            entries,
            ongoing: [...state.ongoing, action.payload],
          };
    }

    case 'ADD_TO_TOP10': {
      const { year, entryId } = action.payload;
      const entry = state.entries.find(e => e.id === entryId);
      if (!entry || !isEligibleForFavoriteOrTop10(entry)) return state;

      let added = false;
      const top10Drawers = state.top10Drawers.map(d => {
          if (d.year === year && d.entries.length < 10 && !d.entries.find(e => e.entryId === entryId)) {
            const rank = d.entries.length + 1;
            added = true;
            return { ...d, entries: [...d.entries, { entryId, rank }] };
          }
          return d;
        });
      return added
        ? { ...state, entries: touchEntry(state.entries, entryId), top10Drawers }
        : state;
    }

    case 'REMOVE_FROM_TOP10': {
      const { year, entryId } = action.payload;
      return {
        ...state,
        top10Drawers: state.top10Drawers.map(d => {
          if (d.year === year) {
            const entries = d.entries.filter(e => e.entryId !== entryId).map((e, i) => ({ ...e, rank: i + 1 }));
            return { ...d, entries };
          }
          return d;
        })
      };
    }

    case 'REORDER_TOP10': {
      const { year, entries, updatedEntryId } = action.payload;
      const drawer = state.top10Drawers.find(d => d.year === year);
      if (!drawer) return state;
      const hasChanged = drawer.entries.some((entry, index) =>
        entry.entryId !== entries[index]?.entryId || entry.rank !== entries[index]?.rank,
      ) || drawer.entries.length !== entries.length;
      if (!hasChanged) return state;
      const idsToTouch = updatedEntryId
        ? [updatedEntryId]
        : entries
          .filter((entry, index) => entry.entryId !== drawer.entries[index]?.entryId)
          .map(entry => entry.entryId);
      const updatedEntries = idsToTouch.reduce(
        (currentEntries, entryId) => touchEntry(currentEntries, entryId),
        state.entries,
      );
      return {
        ...state,
        entries: updatedEntries,
        top10Drawers: state.top10Drawers.map(d =>
          d.year === year ? { ...d, entries: entries.map((e, i) => ({ ...e, rank: i + 1 })) } : d
        )
      };
    }

    case 'ADD_DRAWER': {
      const year = action.payload;
      return state.top10Drawers.find(d => d.year === year)
        ? state
        : { ...state, top10Drawers: [...state.top10Drawers, { year, entries: [] }].sort((a, b) => b.year - a.year) };
    }

    case 'DELETE_DRAWER':
      return { ...state, top10Drawers: state.top10Drawers.filter(d => d.year !== action.payload) };

    case 'IMPORT_DATA': {
      const validated = validateData(action.payload);
      return validated;
    }

    case 'SET_ONGOING_YEAR':
      return { ...state, ongoingYear: action.payload };

    case 'SET_WATCHING_SINCE':
      return { ...state, watchingSince: action.payload };

    case 'SET_IMPORT_MODE':
      return { ...state, importMode: action.payload };

    case 'PUSH_MILESTONE':
      return { ...state, milestoneQueue: [...state.milestoneQueue, action.payload] };

    case 'POP_MILESTONE':
      return { ...state, milestoneQueue: state.milestoneQueue.slice(1) };

    case 'CLEAR_MILESTONE_QUEUE':
      return { ...state, milestoneQueue: [] };

    case 'CELEBRATE_MILESTONE': {
      const milestoneId = action.payload;
      if (state.celebratedMilestones.includes(milestoneId)) return state;
      return {
        ...state,
        celebratedMilestones: [...state.celebratedMilestones, milestoneId],
      };
    }


    default:
      return state;
  }
}

// Legacy localStorage keys (for migration)
const LEGACY_STORAGE_KEY = 'bl-watchlist-data';
const LEGACY_VERSION = 1;

// Migrate data from localStorage to IndexedDB
async function migrateFromLocalStorage(): Promise<AppState | null> {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version === LEGACY_VERSION && parsed.data) {
      const migrated = validateData(parsed.data);
      await saveToIndexedDB(migrated);
      try { localStorage.removeItem(LEGACY_STORAGE_KEY); } catch { /* ignore */ }
      console.log('[Migration] Successfully migrated data from localStorage to IndexedDB');
      return migrated;
    }
  } catch (err) {
    console.warn('[Migration] Failed to migrate from localStorage:', err);
  }
  return null;
}

// Load from IndexedDB (with localStorage migration fallback)
async function loadInitialState(): Promise<AppState> {
  const indexedDBData = await loadFromIndexedDB();
  const savedGenreTags = indexedDBData?.genreTags;
  const hasCustomGenres = Array.isArray(savedGenreTags) && savedGenreTags.some((tag) => tag?.custom);
  if (indexedDBData && (
    indexedDBData.entries.length > 0
    || indexedDBData.favorites.length > 0
    || indexedDBData.ratings.length > 0
    || hasCustomGenres
  )) {
    return validateData(indexedDBData);
  }
  const migrated = await migrateFromLocalStorage();
  if (migrated) return migrated;
  return { ...initialState };
}

/* ============================================================
   Extended App Context with Milestones
   ============================================================ */

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  isLoaded: boolean;
  getEntryById: (id: string) => Entry | undefined;
  getOngoingByEntryId: (id: string) => OngoingEntry | undefined;
  getFavoriteByEntryId: (id: string) => FavoriteEntry | undefined;
  getRatingByEntryId: (id: string) => FavoriteEntry | undefined;
  isFavorited: (id: string) => boolean;
  isInTop10: (id: string) => { year: number; rank: number } | null;
  checkMilestones: (type: MilestoneType, value: number) => void;
  celebrateMilestone: (milestone: Milestone) => void;
  dismissMilestone: () => void;
  currentMilestone: Milestone | null;
  currentCompletion: Entry | null;
  dismissCompletion: () => void;
  openCompletion: (entry: Entry) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [currentMilestone, setCurrentMilestone] = useState<Milestone | null>(null);
  const [currentCompletion, setCurrentCompletion] = useState<Entry | null>(null);
  const initialized = useRef(false);
  const previousEntries = useRef<Entry[] | null>(null);

  // Wrap dispatch to track wrapped activity as a fire-and-forget side effect
  const dispatchWithTracking = useCallback((action: AppAction) => {
    trackWrappedEvent(action, state as AppState).catch(() => {});
    dispatch(action);
  }, [state]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadInitialState().then(loaded => {
      if (loaded.entries.length > 0 || loaded.actors.length > 0 || loaded.favorites.length > 0 || loaded.ratings.length > 0) {
        dispatch({ type: 'SET_STATE', payload: loaded });
      }
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      saveToIndexedDB(state).catch(err => {
        console.warn('Auto-save failed:', err);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [state, isLoaded]);

  // Planned entries with a release date become ongoing on the first render
  // after that local calendar date arrives. The interval also handles an app
  // that remains open across midnight.
  useEffect(() => {
    if (!isLoaded) return;
    const promotePlannedEntries = () => {
      dispatch({ type: 'PROMOTE_PLANNED_ENTRIES' });
    };

    promotePlannedEntries();
    const timer = window.setInterval(promotePlannedEntries, 60_000);
    return () => window.clearInterval(timer);
  }, [isLoaded, state.entries]);

  // Process milestone queue
  useEffect(() => {
    if (state.milestoneQueue.length > 0 && !currentMilestone) {
      const next = state.milestoneQueue[0];
      setCurrentMilestone(next);
      dispatch({ type: 'POP_MILESTONE' });
    }
  }, [state.milestoneQueue, currentMilestone]);

  // Completion celebrations are observed centrally so status changes from
  // every editor/search path receive the same celebration modal.
  useEffect(() => {
    if (!isLoaded) return;
    if (!previousEntries.current) {
      previousEntries.current = state.entries;
      return;
    }

    const newlyCompleted = state.entries.find((entry) => {
      if (entry.status !== 'COMPLETE') return false;
      const previous = previousEntries.current?.find((item) => item.id === entry.id);
      return !previous || previous.status !== 'COMPLETE';
    });
    previousEntries.current = state.entries;

    if (newlyCompleted) setCurrentCompletion(newlyCompleted);
  }, [state.entries, isLoaded]);

  const getEntryById = useCallback((id: string) => state.entries.find(e => e.id === id), [state.entries]);
  const getOngoingByEntryId = useCallback((id: string) => state.ongoing.find(o => o.entryId === id), [state.ongoing]);
  const getFavoriteByEntryId = useCallback((id: string) => state.favorites.find(f => f.entryId === id), [state.favorites]);
  const getRatingByEntryId = useCallback((id: string) => state.ratings.find(r => r.entryId === id), [state.ratings]);
  const isFavorited = useCallback((id: string) => state.favorites.some(f => f.entryId === id), [state.favorites]);
  const isInTop10 = useCallback((id: string) => {
    for (const drawer of state.top10Drawers) {
      const entry = drawer.entries.find(e => e.entryId === id);
      if (entry) return { year: drawer.year, rank: entry.rank };
    }
    return null;
  }, [state.top10Drawers]);

  // Check if a milestone threshold was crossed
  const checkMilestones = useCallback((type: MilestoneType, value: number) => {
    const celebrated = state.celebratedMilestones;
    let milestone: Milestone | null = null;

    if (type === 'PERFECT_RATING' && value >= 10.0) {
      const id = 'PERFECT_RATING-10';
      if (!celebrated.includes(id)) {
        milestone = {
          type: 'PERFECT_RATING',
          title: getMilestoneTitle('PERFECT_RATING', 10),
          message: getMilestoneMessage('PERFECT_RATING', 10),
          value: 10,
        };
      }
    } else if (type === 'TOP10_COMPLETE') {
      // value = the year of the drawer being completed (passed by the caller
      // who has already verified the drawer will reach 10 entries after dispatch)
      const id = `TOP10_COMPLETE-${value}`;
      if (!celebrated.includes(id)) {
        milestone = {
          type: 'TOP10_COMPLETE',
          title: getMilestoneTitle('TOP10_COMPLETE', value),
          message: getMilestoneMessage('TOP10_COMPLETE', value),
          value,
        };
      }
    } else if (type === 'ANNIVERSARY') {
      if (state.watchingSince) {
        const currentYear = new Date().getFullYear();
        const years = currentYear - state.watchingSince;
        if (years > 0) {
          const id = `ANNIVERSARY-${years}`;
          if (!celebrated.includes(id)) {
            milestone = {
              type: 'ANNIVERSARY',
              title: getMilestoneTitle('ANNIVERSARY', years),
              message: getMilestoneMessage('ANNIVERSARY', years),
              value: years,
            };
          }
        }
      }
    } else {
      milestone = checkMilestoneThreshold(type, value, celebrated);
    }

    if (milestone) {
      dispatch({ type: 'CELEBRATE_MILESTONE', payload: `${milestone.type}-${milestone.value}` });
      // Only queue for display if not in import mode and celebrations are enabled
      if (!state.importMode) {
        dispatch({ type: 'PUSH_MILESTONE', payload: milestone });
      }
    }
  }, [state.celebratedMilestones, state.importMode, state.watchingSince, state.top10Drawers]);

  const celebrateMilestone = useCallback((milestone: Milestone) => {
    dispatch({ type: 'CELEBRATE_MILESTONE', payload: `${milestone.type}-${milestone.value}` });
    if (!state.importMode) {
      dispatch({ type: 'PUSH_MILESTONE', payload: milestone });
    }
  }, [state.importMode]);

  const dismissMilestone = useCallback(() => {
    setCurrentMilestone(null);
  }, []);

  const dismissCompletion = useCallback(() => {
    setCurrentCompletion(null);
  }, []);

  const openCompletion = useCallback((entry: Entry) => {
    setCurrentCompletion(entry);
  }, []);

  return (
    <AppContext.Provider value={{
      state, dispatch: dispatchWithTracking, isLoaded,
      getEntryById, getOngoingByEntryId, getFavoriteByEntryId, getRatingByEntryId,
      isFavorited, isInTop10,
      checkMilestones,
      celebrateMilestone,
      dismissMilestone,
      currentMilestone,
      currentCompletion,
      dismissCompletion,
      openCompletion,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
