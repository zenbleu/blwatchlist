import type {
  AnnualActivityData,
  AnnualWrappedSnapshot,
  AnnualWrappedSlide,
  MonthlyWrappedSnapshot,
  AnnualTrackedEntry,
} from '@/types/wrapped';
import { getWatcherTitle } from '@/lib/wrappedEngine';

function slide(
  type: AnnualWrappedSlide['type'],
  payload: AnnualWrappedSlide['payload'],
  narratorComment?: string,
): AnnualWrappedSlide {
  return {
    id: `annual-${type}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    narratorComment,
  };
}

function stableComment(comments: string[], year: number, category: string): string {
  let hash = year;
  for (const char of category) hash = (hash * 31 + char.charCodeAt(0)) & 0xffff;
  return comments[Math.abs(hash) % comments.length];
}

export function getAnnualNarratorComment(category: string, year: number): string {
  const comments: Record<string, string[]> = {
    activity: [
      'Looks like this year had plenty of stories worth making time for.',
      'Your BL journey kept finding new chapters this year.',
      'A whole year of stories, discoveries, and memorable moments.',
    ],
    completed: [
      'You came, you watched, you conquered.',
      'That is a lot of finales to carry in your heart.',
      'Every completed title became part of your year’s story.',
    ],
    growth: [
      'Your BL library had quite the glow-up this year.',
      'One title at a time, your collection kept growing.',
      'Your shelf is telling a bigger story now.',
    ],
    favorites: [
      'Apparently, your heart had plenty of room this year.',
      'These stories earned a permanent place in your year.',
      'Some BLs made it from the watchlist straight to your heart.',
    ],
    countries: [
      'Your BL passport got a serious workout.',
      'Your year crossed plenty of BL borders.',
      'Every country brought a different kind of story.',
    ],
    genres: [
      'You really were not afraid to explore.',
      'Your year had range.',
      'A little variety makes every BL journey more interesting.',
    ],
    ongoing: [
      'Some stories kept you coming back for the next episode.',
      'The wait was part of the journey.',
      'Your ongoing stories kept the year moving.',
    ],
    top10: [
      'After everything you watched, these are the ones that stayed with you.',
      'Your yearly ranking has some serious main-character energy.',
      'These stories made it all the way to your personal spotlight.',
    ],
    achievement: [
      'Every milestone marks a moment in the journey.',
      'This year gave your collection a few reasons to celebrate.',
      'Quiet progress counts too — and yours added up.',
    ],
    quiet: [
      'Every journey has its quiet chapters.',
      'This year was a softer chapter, and that is perfectly okay.',
      'Your next BL adventure will be waiting whenever you are ready.',
    ],
    ending: [
      'The next chapter is waiting whenever you are ready.',
      'Thank you for another year of BL. Your story continues at your own pace.',
      'And that is your BL journey for this year — every part of it counts.',
    ],
  };
  return stableComment(comments[category] ?? comments.ending, year, category);
}

function counts(values: string[]): [string, number][] {
  const map = new Map<string, number>();
  values.filter(Boolean).forEach(value => map.set(value, (map.get(value) ?? 0) + 1));
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function uniqueEntries<T extends { id: string }>(entries: T[]): T[] {
  const seen = new Set<string>();
  return entries.filter(entry => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

function totalActivity(data: AnnualActivityData): number {
  const completedCount = uniqueEntries([...data.completedTitles, ...data.statusCompletions]).length;
  const ongoingCount = uniqueEntries([...data.ongoingStarted, ...data.ongoingContinued]).length;
  return data.totalEntriesAdded +
    completedCount +
    data.droppedTitles.length +
    data.plannedTitles.length +
    ongoingCount +
    data.favoritesAdded.length +
    data.ratingsGiven +
    data.top10Updates +
    data.milestonesUnlocked.length;
}

export interface ReconcilableEntry {
  id: string;
  title: string;
  country: string;
  type: 'Movie' | 'Series';
  status: 'COMPLETE' | 'ONGOING' | 'DROPPED' | 'PLANNED';
  genres?: string[];
}

function toReconciledTracked(
  entry: ReconcilableEntry,
  genreNameById?: Map<string, string>,
): AnnualTrackedEntry {
  const resolvedGenres = (entry.genres ?? [])
    .map(id => genreNameById?.get(id) ?? id)
    .filter(Boolean);
  return {
    id: entry.id,
    title: entry.title,
    country: entry.country,
    type: entry.type,
    ...(resolvedGenres.length > 0 ? { genres: resolvedGenres } : {}),
  };
}

/**
 * Reconciles recorded annual activity against the user's current collection
 * statuses at snapshot/preview time:
 * - Planned/Ongoing entries are only eligible for "Planned" or "Ongoing" slides
 *   if they are STILL Planned or Ongoing.
 * - Entries that started Planned/Ongoing earlier in the year and transitioned
 *   to Complete or Dropped are moved out of Planned/Ongoing into Completed or Dropped.
 */
export function reconcileAnnualActivityWithEntries(
  activity: AnnualActivityData,
  currentEntries: ReconcilableEntry[],
  genreNameById?: Map<string, string>,
): AnnualActivityData {
  const entryById = new Map(currentEntries.map(entry => [entry.id, entry]));

  const enrich = (item: AnnualTrackedEntry): AnnualTrackedEntry => {
    const current = entryById.get(item.id);
    if (!current) return item;
    return toReconciledTracked(current, genreNameById);
  };

  // Start with only still-existing entries in their current matching status buckets
  const completedTitles = uniqueEntries(
    activity.completedTitles
      .filter(item => entryById.get(item.id)?.status === 'COMPLETE')
      .map(enrich),
  );
  let statusCompletions = uniqueEntries(
    activity.statusCompletions
      .filter(item => {
        const cur = entryById.get(item.id);
        return cur?.status === 'COMPLETE';
      })
      .map(enrich),
  );
  let droppedTitles = uniqueEntries(
    activity.droppedTitles
      .filter(item => entryById.get(item.id)?.status === 'DROPPED')
      .map(enrich),
  );
  const plannedTitles = uniqueEntries(
    activity.plannedTitles
      .filter(item => entryById.get(item.id)?.status === 'PLANNED')
      .map(enrich),
  );

  // Entries that were recorded as Planned before and transitioned to Ongoing are eligible for Ongoing
  const promotedToOngoing = activity.plannedTitles
    .filter(item => entryById.get(item.id)?.status === 'ONGOING')
    .map(item => toReconciledTracked(entryById.get(item.id)!, genreNameById));

  const ongoingStarted = uniqueEntries([
    ...activity.ongoingStarted
      .filter(item => entryById.get(item.id)?.status === 'ONGOING')
      .map(enrich),
    ...promotedToOngoing,
  ]);
  const ongoingContinued = uniqueEntries(
    activity.ongoingContinued
      .filter(item => entryById.get(item.id)?.status === 'ONGOING')
      .map(enrich),
  );

  // If an entry that used to be Planned/Ongoing is now COMPLETE or DROPPED,
  // ensure it appears in Completed or Dropped rather than disappearing or staying in Planned/Ongoing.
  const priorPlannedOrOngoingIds = new Set([
    ...activity.plannedTitles.map(item => item.id),
    ...activity.ongoingStarted.map(item => item.id),
    ...activity.ongoingContinued.map(item => item.id),
  ]);
  const alreadyCompletedIds = new Set([
    ...completedTitles.map(item => item.id),
    ...statusCompletions.map(item => item.id),
  ]);
  const alreadyDroppedIds = new Set(droppedTitles.map(item => item.id));

  let countriesWatched = [...activity.countriesWatched];
  let genresWatched = [...activity.genresWatched];

  for (const id of priorPlannedOrOngoingIds) {
    const current = entryById.get(id);
    if (!current) continue;
    if (current.status === 'COMPLETE' && !alreadyCompletedIds.has(id)) {
      const tracked = toReconciledTracked(current, genreNameById);
      statusCompletions = uniqueEntries([...statusCompletions, tracked]);
      alreadyCompletedIds.add(id);
      if (current.country && !countriesWatched.includes(current.country)) {
        countriesWatched = [...countriesWatched, current.country];
      }
      if (tracked.genres?.length) {
        for (const g of tracked.genres) {
          if (!genresWatched.includes(g)) genresWatched = [...genresWatched, g];
        }
      }
    } else if (current.status === 'DROPPED' && !alreadyDroppedIds.has(id)) {
      droppedTitles = uniqueEntries([...droppedTitles, toReconciledTracked(current, genreNameById)]);
      alreadyDroppedIds.add(id);
    }
  }

  // Deduplicate between completedTitles and statusCompletions
  const completedIdSet = new Set(completedTitles.map(item => item.id));
  statusCompletions = statusCompletions.filter(item => !completedIdSet.has(item.id));

  // Filter ratingByEntry for deleted or dropped entries and enrich metadata
  const nextRatingByEntry: AnnualActivityData['ratingByEntry'] = {};
  for (const [id, item] of Object.entries(activity.ratingByEntry)) {
    const current = entryById.get(id);
    if (!current || current.status === 'DROPPED') continue;
    nextRatingByEntry[id] = {
      ...item,
      ...toReconciledTracked(current, genreNameById),
      rating: item.rating,
      ...(item.ratedAt !== undefined ? { ratedAt: item.ratedAt } : {}),
    };
  }

  return {
    ...activity,
    completedTitles,
    statusCompletions,
    droppedTitles,
    plannedTitles,
    ongoingStarted,
    ongoingContinued,
    countriesWatched,
    genresWatched,
    ratingByEntry: nextRatingByEntry,
  };
}

/**
 * Returns all entries rated between [minRating, 10] specifically within targetYear.
 * An entry released in an earlier year (e.g. 2019) IS eligible if rated in targetYear,
 * whereas an entry rated in an earlier year (ratedAt year !== targetYear) is excluded.
 */
export function getEligibleHighestRatedEntries(
  ratingByEntry: AnnualActivityData['ratingByEntry'],
  targetYear: number,
  minRating: number = 9.5,
): Array<AnnualTrackedEntry & { rating: number; ratedAt?: number }> {
  return Object.values(ratingByEntry)
    .filter((entry) => {
      if (!Number.isFinite(entry.rating) || entry.rating < minRating || entry.rating > 10) {
        return false;
      }
      if (entry.ratedAt !== undefined) {
        return new Date(entry.ratedAt).getFullYear() === targetYear;
      }
      // Entries stored inside annualActivity[targetYear] without an explicit timestamp
      // were tracked during targetYear.
      return true;
    })
    .sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      const ratedDiff = (b.ratedAt ?? 0) - (a.ratedAt ?? 0);
      if (ratedDiff !== 0) return ratedDiff;
      return a.title.localeCompare(b.title);
    });
}

export function generateAnnualSnapshot(
  activity: AnnualActivityData,
  currentCollectionSize?: number,
  currentCompletedCount?: number,
): AnnualWrappedSnapshot {
  const watcher = currentCompletedCount === undefined
    ? null
    : getWatcherTitle(currentCompletedCount);

  return {
    year: activity.year,
    generatedAt: Date.now(),
    isViewed: false,
    data: { ...activity },
    collectionSizeAtEnd: activity.collectionSizeAtLastUpdate ?? currentCollectionSize ?? null,
    rankAtEnd: watcher?.name ?? activity.rankAtLastUpdate,
    rankEmojiAtEnd: watcher?.emoji ?? activity.rankEmojiAtLastUpdate,
    version: 1,
  };
}

/**
 * Backfills annual activity from durable monthly snapshots created before
 * annual tracking existed. Live annual events remain the source of truth for
 * everything recorded after the feature is installed.
 */
export function mergeMonthlySnapshotsIntoAnnual(
  activity: AnnualActivityData,
  monthlySnapshots: MonthlyWrappedSnapshot[],
): AnnualActivityData {
  if (monthlySnapshots.length === 0) return activity;
  const merged = { ...activity };
  const all = monthlySnapshots.map(snapshot => snapshot.data);
  const entries = <K extends keyof AnnualActivityData>(key: K, source: keyof typeof all[number]) => {
    const values = all.flatMap(item => item[source] as AnnualTrackedEntry[]);
    (merged[key] as AnnualTrackedEntry[]) = uniqueEntries([
      ...(merged[key] as AnnualTrackedEntry[]),
      ...values,
    ]);
  };

  entries('completedTitles', 'completedTitles');
  entries('statusCompletions', 'statusCompletions');
  entries('droppedTitles', 'droppedTitles');
  entries('plannedTitles', 'plannedTitles');
  entries('ongoingStarted', 'ongoingStarted');
  entries('favoritesAdded', 'favoritesAdded');
  merged.totalEntriesAdded = Math.max(
    merged.totalEntriesAdded,
    all.reduce((sum, item) => sum + item.totalEntriesAdded, 0),
  );
  merged.ratingsGiven = Math.max(
    merged.ratingsGiven,
    all.reduce((sum, item) => sum + item.ratingsGiven, 0),
  );
  merged.top10Updates = Math.max(
    merged.top10Updates,
    all.reduce((sum, item) => sum + item.top10Updates, 0),
  );
  merged.top10DrawersCreated = Math.max(
    merged.top10DrawersCreated,
    all.reduce((sum, item) => sum + item.top10DrawersCreated, 0),
  );
  merged.favoritesRemoved = Math.max(
    merged.favoritesRemoved,
    all.reduce((sum, item) => sum + item.favoritesRemoved, 0),
  );
  merged.netCollectionGrowth = all.reduce(
    (sum, item) => sum + item.netCollectionGrowth,
    merged.netCollectionGrowth,
  );
  merged.countriesWatched = [...new Set([
    ...merged.countriesWatched,
    ...all.flatMap(item => item.countriesWatched),
  ])];
  merged.milestonesUnlocked = [
    ...merged.milestonesUnlocked,
    ...all.flatMap(item => item.milestonesUnlocked),
  ].filter((milestone, index, list) =>
    list.findIndex(candidate => candidate.id === milestone.id) === index,
  );
  for (const item of all) {
    Object.assign(merged.ratingByEntry, item.ratingByEntry);
  }
  return merged;
}

export function buildAnnualSlides(snapshot: AnnualWrappedSnapshot): AnnualWrappedSlide[] {
  const d = snapshot.data;
  const year = snapshot.year;
  const completed = uniqueEntries([...d.completedTitles, ...d.statusCompletions]);
  const ongoingEntries = uniqueEntries([...d.ongoingStarted, ...d.ongoingContinued]);
  const countries = counts(d.countriesWatched);
  const genres = counts(d.genresWatched);
  const allRated = Object.values(d.ratingByEntry);
  const highestRatedEntries = getEligibleHighestRatedEntries(d.ratingByEntry, year, 9.5);
  const total = totalActivity(d);

  if (total === 0) {
    return [
      slide('intro', {
        year,
        totalActivity: 0,
        completedCount: 0,
        collectionSize: snapshot.collectionSizeAtEnd,
      }),
      slide('quiet', { year }, getAnnualNarratorComment('quiet', year)),
      slide('ending', {
        year,
        completedCount: 0,
        favoritesCount: 0,
        countriesCount: 0,
        topRating: null,
        collectionSize: snapshot.collectionSizeAtEnd,
      }, getAnnualNarratorComment('ending', year)),
    ];
  }

  const slides: AnnualWrappedSlide[] = [
    slide('intro', {
      year,
      totalActivity: total,
      completedCount: completed.length,
      collectionSize: snapshot.collectionSizeAtEnd,
    }),
    slide(
      'activity',
      { count: total, label: 'moments in your BL year', entries: completed.slice(0, 10) },
      getAnnualNarratorComment('activity', year),
    ),
  ];

  if (d.totalEntriesAdded > 0) {
    slides.push(slide(
      'growth',
      {
        count: d.totalEntriesAdded,
        label: d.totalEntriesAdded === 1 ? 'title added' : 'titles added',
        entries: uniqueEntries([...completed, ...ongoingEntries, ...d.plannedTitles]).slice(0, 12),
      },
      getAnnualNarratorComment('growth', year),
    ));
  }
  if (completed.length > 0) {
    slides.push(slide(
      'completed',
      {
        count: completed.length,
        label: completed.length === 1 ? 'BL completed' : 'BLs completed',
        titles: completed.slice(0, 5).map(e => e.title),
        entries: completed.slice(0, 14),
      },
      getAnnualNarratorComment('completed', year),
    ));
  }
  if (d.favoritesAdded.length > 0) {
    slides.push(slide(
      'favorites',
      {
        count: d.favoritesAdded.length,
        label: d.favoritesAdded.length === 1 ? 'new favorite' : 'new favorites',
        titles: d.favoritesAdded.slice(0, 5).map(e => e.title),
        entries: d.favoritesAdded.slice(0, 14),
      },
      getAnnualNarratorComment('favorites', year),
    ));
  }
  if (d.plannedTitles.length > 0) {
    slides.push(slide(
      'activity',
      {
        count: d.plannedTitles.length,
        label: d.plannedTitles.length === 1 ? 'BL in your next-year plan' : 'BLs in your next-year plan',
        entries: d.plannedTitles.slice(0, 14),
      },
      'Your next chapters are already waiting for the year ahead.',
    ));
  }
  if (d.droppedTitles.length > 0) {
    slides.push(slide(
      'activity',
      {
        count: d.droppedTitles.length,
        label: d.droppedTitles.length === 1 ? 'story left unfinished' : 'stories left unfinished',
        entries: d.droppedTitles.slice(0, 14),
      },
      'Not every story made it to the finale — and that is okay.',
    ));
  }
  if (d.ratingsGiven > 0) {
    slides.push(slide(
      'ratings',
      { count: d.ratingsGiven, label: d.ratingsGiven === 1 ? 'rating given' : 'ratings given', entries: allRated.slice(0, 14) },
    ));
    const average = d.ratingValues.length > 0
      ? d.ratingValues.reduce((sum, rating) => sum + rating, 0) / d.ratingValues.length
      : 0;
    if (average > 0) {
      slides.push(slide(
        'ratings',
        { count: Math.round(average * 100) / 100, label: 'your average rating this year', entries: allRated.slice(0, 10) },
        'Every score helped shape the bigger picture of your year.',
      ));
    }
  }
  if (highestRatedEntries.length > 0) {
    const top = highestRatedEntries[0];
    slides.push(slide(
      'highest-rated',
      {
        year,
        entries: highestRatedEntries,
        title: top.title,
        country: top.country,
        type: top.type,
        rating: top.rating,
        entryId: top.id,
      },
      highestRatedEntries.length > 1
        ? `${highestRatedEntries.length} masterpieces earned a 9.5–10 rating in ${year}.`
        : 'This one clearly left a mark.',
    ));
  }
  if (countries.length > 0) {
    const topCountryEntries = completed.filter(entry => entry.country === countries[0][0]);
    const fallbackCountryEntries = uniqueEntries([...completed, ...d.favoritesAdded, ...ongoingEntries])
      .filter(entry => entry.country === countries[0][0]);
    slides.push(slide(
      'countries',
      {
        name: countries[0][0],
        count: countries[0][1],
        all: countries.slice(0, 5),
        entries: (topCountryEntries.length > 0 ? topCountryEntries : fallbackCountryEntries).slice(0, 14),
      },
      getAnnualNarratorComment('countries', year),
    ));
  }
  if (genres.length > 0) {
    const topGenreEntries = completed.filter(entry => entry.genres?.includes(genres[0][0]));
    const fallbackGenreEntries = uniqueEntries([...completed, ...d.favoritesAdded, ...ongoingEntries])
      .filter(entry => entry.genres?.includes(genres[0][0]));
    slides.push(slide(
      'genres',
      {
        name: genres[0][0],
        count: genres[0][1],
        all: genres.slice(0, 5),
        entries: (topGenreEntries.length > 0 ? topGenreEntries : fallbackGenreEntries).slice(0, 14),
      },
      getAnnualNarratorComment('genres', year),
    ));
  }
  if (ongoingEntries.length > 0) {
    slides.push(slide(
      'ongoing',
      {
        count: ongoingEntries.length,
        label: ongoingEntries.length === 1 ? 'ongoing BL carried into the new year' : 'ongoing BLs carried into the new year',
        entries: ongoingEntries.slice(0, 14),
      },
      getAnnualNarratorComment('ongoing', year),
    ));
  }
  const ranking = Object.entries(d.top10Rankings)
    .sort(([a], [b]) => Number(b) - Number(a))[0];
  if (ranking && ranking[1].length > 0) {
    slides.push(slide(
      'top10',
      { entries: [...ranking[1]].sort((a, b) => a.rank - b.rank), drawerYear: Number(ranking[0]) },
      getAnnualNarratorComment('top10', year),
    ));
  }
  if (d.milestonesUnlocked.length > 0) {
    slides.push(slide(
      'achievement',
      { achievements: d.milestonesUnlocked.map(m => ({ title: m.title, type: m.type })) },
      getAnnualNarratorComment('achievement', year),
    ));
  }
  if (snapshot.rankAtEnd) {
    slides.push(slide('rank', {
      rank: snapshot.rankAtEnd,
      emoji: snapshot.rankEmojiAtEnd ?? '📺',
      completedCount: completed.length,
      collectionSize: snapshot.collectionSizeAtEnd,
    }));
  }
  slides.push(slide('ending', {
    year,
    completedCount: completed.length,
    favoritesCount: d.favoritesAdded.length,
    countriesCount: countries.length,
    topRating: highestRatedEntries[0]?.rating ?? null,
    collectionSize: snapshot.collectionSizeAtEnd,
  }, getAnnualNarratorComment('ending', year)));
  return slides;
}