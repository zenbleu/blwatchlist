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

function totalActivity(data: AnnualActivityData): number {
  return data.totalEntriesAdded +
    data.completedTitles.length +
    data.statusCompletions.length +
    data.droppedTitles.length +
    data.plannedTitles.length +
    data.ongoingStarted.length +
    data.ongoingContinued.length +
    data.favoritesAdded.length +
    data.ratingsGiven +
    data.top10Updates +
    data.milestonesUnlocked.length;
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

function uniqueEntries(entries: AnnualTrackedEntry[]): AnnualTrackedEntry[] {
  const seen = new Set<string>();
  return entries.filter(entry => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
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
  const completed = [...d.completedTitles, ...d.statusCompletions];
  const countries = counts(d.countriesWatched);
  const genres = counts(d.genresWatched);
  const allRated = Object.values(d.ratingByEntry);
  const highest = allRated.reduce<(typeof allRated)[number] | null>(
    (best, current) => !best || current.rating > best.rating ? current : best,
    null,
  );
  const total = totalActivity(d);

  if (total === 0) {
    return [
      slide('intro', { year, totalActivity: 0 }),
      slide('quiet', { year }, getAnnualNarratorComment('quiet', year)),
      slide('ending', { year }, getAnnualNarratorComment('ending', year)),
    ];
  }

  const slides: AnnualWrappedSlide[] = [
    slide('intro', { year, totalActivity: total }),
    slide(
      'activity',
      { count: total, label: 'moments in your BL year' },
      getAnnualNarratorComment('activity', year),
    ),
  ];

  if (d.totalEntriesAdded > 0) {
    slides.push(slide(
      'growth',
      { count: d.totalEntriesAdded, label: d.totalEntriesAdded === 1 ? 'title added' : 'titles added' },
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
        entries: completed.slice(0, 4),
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
        entries: d.favoritesAdded.slice(0, 4),
      },
      getAnnualNarratorComment('favorites', year),
    ));
  }
  if (d.plannedTitles.length > 0) {
    slides.push(slide(
      'activity',
      { count: d.plannedTitles.length, label: d.plannedTitles.length === 1 ? 'BL added to your plan' : 'BLs added to your plan', entries: d.plannedTitles.slice(0, 4) },
      'Your next chapters were already lining up.',
    ));
  }
  if (d.droppedTitles.length > 0) {
    slides.push(slide(
      'activity',
      { count: d.droppedTitles.length, label: d.droppedTitles.length === 1 ? 'story left unfinished' : 'stories left unfinished', entries: d.droppedTitles.slice(0, 4) },
      'Not every story made it to the finale — and that is okay.',
    ));
  }
  if (d.ratingsGiven > 0) {
    slides.push(slide(
      'ratings',
      { count: d.ratingsGiven, label: d.ratingsGiven === 1 ? 'rating given' : 'ratings given', entries: allRated.slice(0, 4) },
    ));
    const average = d.ratingValues.length > 0
      ? d.ratingValues.reduce((sum, rating) => sum + rating, 0) / d.ratingValues.length
      : 0;
    if (average > 0) {
      slides.push(slide(
        'ratings',
        { count: Math.round(average * 100) / 100, label: 'your average rating this year' },
        'Every score helped shape the bigger picture of your year.',
      ));
    }
  }
  if (highest && highest.rating > 0) {
    slides.push(slide(
      'highest-rated',
      { title: highest.title, country: highest.country, type: highest.type, rating: highest.rating, entryId: highest.id },
      'This one clearly left a mark.',
    ));
  }
  if (countries.length > 0) {
    slides.push(slide(
      'countries',
      {
        name: countries[0][0],
        count: countries[0][1],
        all: countries.slice(0, 5),
        entries: completed.filter(entry => entry.country === countries[0][0]).slice(0, 4),
      },
      getAnnualNarratorComment('countries', year),
    ));
  }
  if (genres.length > 0) {
    slides.push(slide(
      'genres',
      {
        name: genres[0][0],
        count: genres[0][1],
        all: genres.slice(0, 5),
        entries: completed
          .filter(entry => entry.genres?.includes(genres[0][0]))
          .slice(0, 4),
      },
      getAnnualNarratorComment('genres', year),
    ));
  }
  const ongoingCount = d.ongoingStarted.length + d.ongoingContinued.length;
  if (ongoingCount > 0) {
    slides.push(slide(
      'ongoing',
      {
        count: ongoingCount,
        label: ongoingCount === 1 ? 'ongoing BL followed' : 'ongoing BLs followed',
        entries: [...d.ongoingStarted, ...d.ongoingContinued].slice(0, 4),
      },
      getAnnualNarratorComment('ongoing', year),
    ));
  }
  const ranking = Object.entries(d.top10Rankings)
    .sort(([a], [b]) => Number(b) - Number(a))[0];
  if (ranking && ranking[1].length > 0) {
    slides.push(slide(
      'top10',
      { entries: ranking[1].sort((a, b) => a.rank - b.rank), drawerYear: Number(ranking[0]) },
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
    slides.push(slide('rank', { rank: snapshot.rankAtEnd, emoji: snapshot.rankEmojiAtEnd ?? '📺' }));
  }
  slides.push(slide('ending', { year }, getAnnualNarratorComment('ending', year)));
  return slides;
}