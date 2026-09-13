// ── Monthly BL Wrapped — Snapshot Generation & Slide Builder ─────────────────

import type {
  MonthlyActivityData,
  MonthlyWrappedSnapshot,
  WrappedSlide,
  SlideType,
} from '@/types/wrapped';
import { monthKeyToMonthName } from '@/lib/wrappedDB';
import { getNarratorComment } from '@/lib/narratorComments';

// ── Watcher title lookup (mirrors StatisticsTab logic) ────────────────────────

const WATCHER_TITLES = [
  { min: 0,   max: 4,   name: 'BL Newcomer',          emoji: '🌱' },
  { min: 5,   max: 9,   name: 'BL Explorer',           emoji: '🔍' },
  { min: 10,  max: 19,  name: 'BL Enthusiast',         emoji: '📺' },
  { min: 20,  max: 34,  name: 'BL Devotee',            emoji: '💫' },
  { min: 35,  max: 49,  name: 'BL Connoisseur',        emoji: '🎭' },
  { min: 50,  max: 74,  name: 'BL Veteran',            emoji: '⚔️'  },
  { min: 75,  max: 99,  name: 'BL Champion',           emoji: '🏆' },
  { min: 100, max: 149, name: 'BL Master',             emoji: '🎓' },
  { min: 150, max: 199, name: 'BL Sage',               emoji: '🧙' },
  { min: 200, max: 299, name: 'BL Legend',             emoji: '👑' },
  { min: 300, max: Infinity, name: 'BL Immortal',      emoji: '✨' },
];

export function getWatcherTitle(completedCount: number): { name: string; emoji: string } | null {
  const t = WATCHER_TITLES.find(t => completedCount >= t.min && completedCount <= t.max);
  return t ? { name: t.name, emoji: t.emoji } : null;
}

// ── Snapshot generation ───────────────────────────────────────────────────────

export function generateSnapshot(
  activity: MonthlyActivityData,
  currentCollectionSize: number,
  currentCompletedCount: number,
): MonthlyWrappedSnapshot {
  const [year, monthNum] = activity.month.split('-').map(Number);
  const watcher = getWatcherTitle(currentCompletedCount);

  return {
    month: activity.month,
    year,
    monthNumber: monthNum,
    generatedAt: Date.now(),
    isViewed: false,
    data: activity,
    collectionSizeAtEnd: currentCollectionSize,
    rankAtEnd:      watcher?.name   ?? activity.rankAtLastUpdate,
    rankEmojiAtEnd: watcher?.emoji  ?? activity.rankEmojiAtLastUpdate,
    avgRatingAllTime: null,
  };
}

// ── Slide builder ─────────────────────────────────────────────────────────────

function slide(
  type: SlideType,
  payload: WrappedSlide['payload'],
  narratorComment?: string,
): WrappedSlide {
  return {
    id: `${type}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    narratorComment,
  };
}

/** Top-N country counts from a list of country strings */
function topCountries(countries: string[]): [string, number][] {
  const map: Record<string, number> = {};
  for (const c of countries) map[c] = (map[c] ?? 0) + 1;
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

export function buildSlides(snapshot: MonthlyWrappedSnapshot): WrappedSlide[] {
  const d = snapshot.data;
  const month = snapshot.month;
  const monthName = monthKeyToMonthName(month);
  const year = snapshot.year;
  const allRated = Object.entries(d.ratingByEntry).map(([id, entry]) => ({
    ...entry,
    id,
    type: entry.type as 'Movie' | 'Series',
  }));

  // ── Quiet month ───────────────────────────────────────────────────────────
  const isQuiet =
    d.completedTitles.length === 0 &&
    d.statusCompletions.length === 0 &&
    d.droppedTitles.length === 0 &&
    d.favoritesAdded.length === 0 &&
    d.ratingsGiven === 0 &&
    d.top10Updates === 0 &&
    d.ongoingStarted.length === 0 &&
    d.plannedTitles.length === 0 &&
    d.totalEntriesAdded === 0;

  if (isQuiet) {
    return [
      slide('intro',  { month, year, monthName }, undefined),
      slide('quiet',  { month, year, monthName }, getNarratorComment('quiet', month)),
      slide('ending', { monthName, year, totalCompleted: 0 }, getNarratorComment('ending', month)),
    ];
  }

  const slides: WrappedSlide[] = [];

  // 1. Intro
  slides.push(slide('intro', { month, year, monthName }));

  // 2. Completed BLs (ADD_ENTRY as COMPLETE or status→COMPLETE)
  const allCompleted = [...d.completedTitles, ...d.statusCompletions];
  if (allCompleted.length > 0) {
    slides.push(slide(
      'completed',
      {
        count: allCompleted.length,
        label: allCompleted.length === 1 ? 'BL completed' : 'BLs completed',
        titles: allCompleted.slice(0, 5).map(t => t.title),
        entries: allCompleted.slice(0, 4),
      },
      getNarratorComment('completed', month),
    ));
  }

  // 3. Ongoing started
  if (d.ongoingStarted.length > 0) {
    slides.push(slide(
      'ongoing',
      {
        count: d.ongoingStarted.length,
        label: d.ongoingStarted.length === 1 ? 'new BL started' : 'new BLs started',
        titles: d.ongoingStarted.slice(0, 4).map(t => t.title),
        entries: d.ongoingStarted.slice(0, 4),
      },
      getNarratorComment('ongoing', month),
    ));
  }

  // 4. Planned
  if (d.plannedTitles.length > 0) {
    slides.push(slide(
      'planned',
      {
        count: d.plannedTitles.length,
        label: d.plannedTitles.length === 1 ? 'BL added to plan' : 'BLs added to plan',
        titles: d.plannedTitles.slice(0, 4).map(t => t.title),
        entries: d.plannedTitles.slice(0, 4),
      },
      getNarratorComment('planned', month),
    ));
  }

  // 5. Dropped
  if (d.droppedTitles.length > 0) {
    slides.push(slide(
      'dropped',
      {
        count: d.droppedTitles.length,
        label: d.droppedTitles.length === 1 ? 'BL dropped' : 'BLs dropped',
        titles: d.droppedTitles.slice(0, 3).map(t => t.title),
        entries: d.droppedTitles.slice(0, 4),
      },
      getNarratorComment('dropped', month),
    ));
  }

  // 6. Favorites
  if (d.favoritesAdded.length > 0) {
    slides.push(slide(
      'favorites',
      {
        count: d.favoritesAdded.length,
        label: d.favoritesAdded.length === 1 ? 'favorite added' : 'favorites added',
        titles: d.favoritesAdded.slice(0, 4).map(t => t.title),
        entries: d.favoritesAdded.slice(0, 4),
      },
      getNarratorComment('favorites', month),
    ));
  }

  // 7. Ratings
  if (d.ratingsGiven > 0) {
    slides.push(slide(
      'ratings',
      {
        count: d.ratingsGiven,
        label: d.ratingsGiven === 1 ? 'rating given' : 'ratings given',
        entries: allRated.slice(0, 4),
      },
      getNarratorComment('ratings', month),
    ));
  }

  // 8. Highest rated this month
  if (allRated.length > 0) {
    const highest = allRated.reduce((best, cur) => cur.rating > best.rating ? cur : best);
    if (highest.rating > 0) {
      slides.push(slide(
        'highest-rated',
        { title: highest.title, country: highest.country, type: highest.type, rating: highest.rating, entryId: highest.id },
        getNarratorComment('highestRated', month),
      ));
    }

    // 9. Average rating (only if >= 2 ratings)
    if (allRated.length >= 2) {
      const avg = allRated.reduce((s, r) => s + r.rating, 0) / allRated.length;
      slides.push(slide(
        'avg-rating',
        { count: Math.round(avg * 100) / 100, label: 'avg rating this month' },
        getNarratorComment('avgRating', month),
      ));
    }
  }

  // 10. Most-watched country
  const countries = topCountries(d.countriesWatched);
  if (countries.length > 0) {
    const [topCountry, topCount] = countries[0];
    slides.push(slide(
      'country',
      {
        country: topCountry,
        count: topCount,
        allCountries: countries.slice(0, 5),
        entries: [...d.completedTitles, ...d.statusCompletions]
          .filter(entry => entry.country === topCountry)
          .slice(0, 4),
      },
      getNarratorComment('country', month),
    ));
  }

  // 11. Top 10 updates
  if (d.top10Updates > 0) {
    slides.push(slide(
      'top10',
      { count: d.top10Updates, label: d.top10Updates === 1 ? 'Top 10 update' : 'Top 10 updates' },
      getNarratorComment('top10', month),
    ));
  }

  // 12. Achievements
  if (d.milestonesUnlocked.length > 0) {
    slides.push(slide(
      'achievement',
      { achievements: d.milestonesUnlocked.map(m => ({ title: m.title, type: m.type })) },
      getNarratorComment('achievement', month),
    ));
  }

  // 13. Collection growth
  if (d.netCollectionGrowth > 0) {
    slides.push(slide(
      'growth',
      { count: d.netCollectionGrowth, label: d.netCollectionGrowth === 1 ? 'title added' : 'titles added' },
      getNarratorComment('growth', month),
    ));
  }

  // 14. Rank
  if (snapshot.rankAtEnd) {
    slides.push(slide(
      'rank',
      {
        rank:  snapshot.rankAtEnd,
        emoji: snapshot.rankEmojiAtEnd ?? '📺',
        isNew: false,
      },
      getNarratorComment('rank', month),
    ));
  }

  // 15. Ending
  slides.push(slide(
    'ending',
    { monthName, year, totalCompleted: allCompleted.length },
    getNarratorComment('ending', month),
  ));

  return slides;
}
