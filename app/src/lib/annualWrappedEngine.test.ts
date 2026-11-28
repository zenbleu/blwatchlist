import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAnnualSlides,
  generateAnnualSnapshot,
  getEligibleHighestRatedEntries,
  reconcileAnnualActivityWithEntries,
  type ReconcilableEntry,
} from './annualWrappedEngine';
import { emptyAnnualActivityData, type AnnualTrackedEntry } from '../types/wrapped';

function makeTracked(
  id: string,
  title: string,
  country = 'Thailand',
  type: 'Movie' | 'Series' = 'Series',
): AnnualTrackedEntry {
  return { id, title, country, type };
}

describe('reconcileAnnualActivityWithEntries', () => {
  it('keeps planned and ongoing only when their final status remains planned or ongoing, and moves transitioned titles to completed or dropped', () => {
    const activity = emptyAnnualActivityData(2026);
    activity.plannedTitles = [
      makeTracked('p-stay', 'Still Planned For 2027'),
      makeTracked('p-done', 'Planned Then Completed'),
      makeTracked('p-drop', 'Planned Then Dropped'),
      makeTracked('p-go', 'Planned Now Ongoing'),
      makeTracked('p-deleted', 'Deleted Planned Title'),
    ];
    activity.ongoingStarted = [
      makeTracked('o-stay', 'Ongoing Into Next Year'),
      makeTracked('o-done', 'Ongoing Then Completed'),
      makeTracked('o-drop', 'Ongoing Then Dropped'),
    ];

    const currentEntries: ReconcilableEntry[] = [
      { id: 'p-stay', title: 'Still Planned For 2027', country: 'Thailand', type: 'Series', status: 'PLANNED', genres: ['g-rom'] },
      { id: 'p-done', title: 'Planned Then Completed', country: 'Japan', type: 'Series', status: 'COMPLETE', genres: ['g-slice'] },
      { id: 'p-drop', title: 'Planned Then Dropped', country: 'Taiwan', type: 'Series', status: 'DROPPED' },
      { id: 'p-go', title: 'Planned Now Ongoing', country: 'South Korea', type: 'Series', status: 'ONGOING' },
      { id: 'o-stay', title: 'Ongoing Into Next Year', country: 'Thailand', type: 'Series', status: 'ONGOING' },
      { id: 'o-done', title: 'Ongoing Then Completed', country: 'China', type: 'Series', status: 'COMPLETE', genres: ['g-hist'] },
      { id: 'o-drop', title: 'Ongoing Then Dropped', country: 'Thailand', type: 'Movie', status: 'DROPPED' },
    ];
    const genreMap = new Map([
      ['g-rom', 'Romance'],
      ['g-slice', 'Slice of Life'],
      ['g-hist', 'Historical'],
    ]);

    const reconciled = reconcileAnnualActivityWithEntries(activity, currentEntries, genreMap);

    assert.deepEqual(
      reconciled.plannedTitles.map((e) => e.id),
      ['p-stay'],
    );
    assert.deepEqual(
      reconciled.ongoingStarted.map((e) => e.id).sort(),
      ['o-stay', 'p-go'],
    );
    assert.deepEqual(
      reconciled.statusCompletions.map((e) => e.id).sort(),
      ['o-done', 'p-done'],
    );
    assert.deepEqual(
      reconciled.droppedTitles.map((e) => e.id).sort(),
      ['o-drop', 'p-drop'],
    );
    assert.ok(reconciled.countriesWatched.includes('Japan'));
    assert.ok(reconciled.countriesWatched.includes('China'));
    assert.ok(reconciled.genresWatched.includes('Slice of Life'));
    assert.ok(reconciled.genresWatched.includes('Historical'));
  });

  it('does not show transitioned planned/ongoing titles in planned or ongoing slides when building slides', () => {
    const activity = emptyAnnualActivityData(2026);
    activity.plannedTitles = [makeTracked('e1', 'Finished Before Year End')];
    activity.ongoingStarted = [makeTracked('e2', 'Dropped Before Year End')];

    const reconciled = reconcileAnnualActivityWithEntries(activity, [
      { id: 'e1', title: 'Finished Before Year End', country: 'Thailand', type: 'Series', status: 'COMPLETE' },
      { id: 'e2', title: 'Dropped Before Year End', country: 'Thailand', type: 'Series', status: 'DROPPED' },
    ]);

    const slides = buildAnnualSlides(generateAnnualSnapshot(reconciled, 2, 1));
    const labels = slides
      .filter((s) => s.type === 'activity' || s.type === 'completed' || s.type === 'ongoing')
      .map((s) => (s.payload as { label?: string }).label);

    assert.ok(labels.includes('BL completed'));
    assert.ok(labels.includes('story left unfinished'));
    assert.ok(!labels.some((l) => l?.includes('next-year plan')));
    assert.ok(!slides.some((s) => s.type === 'ongoing'));
  });
});

describe('getEligibleHighestRatedEntries and highest-rated slide', () => {
  it('allows multiple 9.5-10 entries rated in the target year regardless of release year, and excludes prior-year ratings or <9.5 scores', () => {
    const activity = emptyAnnualActivityData(2026);
    const ratedIn2026A = new Date(2026, 2, 15).getTime();
    const ratedIn2026B = new Date(2026, 8, 2).getTime();
    const ratedIn2025 = new Date(2025, 10, 20).getTime();

    activity.completedTitles = [makeTracked('untamed-2019', 'The Untamed', 'China')];
    activity.ratingsGiven = 4;
    activity.ratingByEntry = {
      'untamed-2019': {
        id: 'untamed-2019',
        title: 'The Untamed',
        country: 'China',
        type: 'Series',
        rating: 9.8,
        ratedAt: ratedIn2026A,
      },
      'kp-2022': {
        id: 'kp-2022',
        title: 'KinnPorsche',
        country: 'Thailand',
        type: 'Series',
        rating: 9.5,
        ratedAt: ratedIn2026B,
      },
      'old-rating-2025': {
        id: 'old-rating-2025',
        title: 'Rated Last Year',
        country: 'Japan',
        type: 'Series',
        rating: 10,
        ratedAt: ratedIn2025,
      },
      'under-threshold': {
        id: 'under-threshold',
        title: 'Good Show 9.4',
        country: 'South Korea',
        type: 'Series',
        rating: 9.4,
        ratedAt: ratedIn2026A,
      },
    };

    const eligible = getEligibleHighestRatedEntries(activity.ratingByEntry, 2026, 9.5);
    assert.deepEqual(
      eligible.map((e) => e.id),
      ['untamed-2019', 'kp-2022'],
    );

    const slides = buildAnnualSlides(generateAnnualSnapshot(activity, 4, 1));
    const highestSlide = slides.find((s) => s.type === 'highest-rated');
    assert.ok(highestSlide, 'Expected highest-rated slide to be present');
    const payload = highestSlide.payload as { entries?: Array<{ id: string; rating: number }> };
    assert.equal(payload.entries?.length, 2);
    assert.deepEqual(
      payload.entries?.map((e) => ({ id: e.id, rating: e.rating })),
      [
        { id: 'untamed-2019', rating: 9.8 },
        { id: 'kp-2022', rating: 9.5 },
      ],
    );
  });

  it('omits highest-rated slide when no entries in target year are rated 9.5-10', () => {
    const activity = emptyAnnualActivityData(2026);
    activity.completedTitles = [makeTracked('ok-show', 'Decent Drama', 'Taiwan')];
    activity.ratingsGiven = 2;
    activity.ratingValues = [9.4, 9.9];
    activity.ratingByEntry = {
      'ok-show': {
        id: 'ok-show',
        title: 'Decent Drama',
        country: 'Taiwan',
        type: 'Series',
        rating: 9.4,
        ratedAt: new Date(2026, 4, 10).getTime(),
      },
      'last-year': {
        id: 'last-year',
        title: 'Rated In 2025',
        country: 'Thailand',
        type: 'Series',
        rating: 9.9,
        ratedAt: new Date(2025, 4, 10).getTime(),
      },
    };

    const slides = buildAnnualSlides(generateAnnualSnapshot(activity, 2, 1));
    assert.equal(
      slides.some((s) => s.type === 'highest-rated'),
      false,
    );
  });
});
