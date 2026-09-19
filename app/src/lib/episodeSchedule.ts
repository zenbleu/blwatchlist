import type { AirDay, OngoingEntry, SpecialEpisode } from '@/types';

export interface OngoingSchedule {
  /** The latest episode that should have been released by the current date. */
  airedEpisode: number | null;
  /** Total episodes represented by the active schedule. */
  totalEpisodes: number;
  isAiringToday: boolean;
  /** Whether a special episode is scheduled for the current local calendar day. */
  isSpecialEpisodeScheduledToday: boolean;
  /** Whether the final scheduled episode falls on the current local calendar day. */
  isFinalEpisodeScheduledToday: boolean;
  isFinalEpisodeAiringToday: boolean;
  /** Whether the final scheduled episode has aired, including previous days. */
  isFinalEpisodeAired: boolean;
  isConfigured: boolean;
}

export interface UpcomingRelease {
  releaseAt: Date;
  type: 'episode' | 'special';
  episodeNumber?: number;
  specialEpisode?: SpecialEpisode;
  hasExactTime: boolean;
}

/**
 * Returns true only when every episode belonging to the title is watched.
 *
 * Regular episodes are user-controlled, while specials are tracked separately
 * and are intentionally included here because they count toward title
 * completion even though they do not change the regular episode schedule.
 */
export function isOngoingTitleComplete(
  schedule: OngoingSchedule,
  ongoing: Pick<OngoingEntry, 'currentEpisode' | 'specialEpisodes'>,
): boolean {
  const specialEpisodes = ongoing.specialEpisodes || [];
  const allSpecialEpisodesWatched = specialEpisodes.every((special) => special.watched);

  return schedule.isFinalEpisodeAired
    && schedule.isConfigured
    && schedule.airedEpisode === schedule.totalEpisodes
    && ongoing.currentEpisode === schedule.airedEpisode
    && allSpecialEpisodesWatched;
}

const AIR_DAYS_BY_INDEX: Record<number, AirDay> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null;
  }
  return date;
}

function parseReleaseTime(value: string): { hours: number; minutes: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

/**
 * Returns a timed special release as a local Date.
 *
 * Date-only specials intentionally return null. Their existing schedule
 * behavior is date-based, so assigning them midnight here would invent a
 * release time that the user did not configure.
 */
export function getTimedSpecialEpisodeReleaseAt(
  special: Pick<SpecialEpisode, 'releaseDate' | 'releaseTime'>,
): Date | null {
  if (!special.releaseTime) return null;
  const releaseDate = parseDateOnly(special.releaseDate);
  const releaseTime = parseReleaseTime(special.releaseTime);
  if (!releaseDate || !releaseTime) return null;

  releaseDate.setHours(releaseTime.hours, releaseTime.minutes, 0, 0);
  return releaseDate;
}

export function getNextTimedSpecialEpisodeReleaseAt(
  now: Date,
  specialEpisodes: readonly Pick<SpecialEpisode, 'releaseDate' | 'releaseTime'>[],
): Date | null {
  return specialEpisodes
    .map(getTimedSpecialEpisodeReleaseAt)
    .filter((releaseAt): releaseAt is Date => releaseAt !== null && releaseAt.getTime() >= now.getTime())
    .sort((a, b) => a.getTime() - b.getTime())[0] || null;
}

function dateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function hasReachedAirTime(now: Date, airTime = '00:00'): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(airTime);
  if (!match) return true;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return true;
  return now.getHours() * 60 + now.getMinutes() >= hours * 60 + minutes;
}

function getCalendarSchedule(
  ongoing: Pick<OngoingEntry, 'totalEpisodes' | 'releaseDates' | 'airTime' | 'specialEpisodes'>,
  now: Date,
): OngoingSchedule {
  // Keep duplicate dates: multiple episodes can release on the same day
  // (for example, a two-episode premiere), and each date entry represents one
  // episode in the release calendar.
  const releaseDates = [...(ongoing.releaseDates || [])]
    .filter((value) => parseDateOnly(value) !== null)
    .sort();
  const todayKey = dateKey(now);
  const airingTimeReached = hasReachedAirTime(now, ongoing.airTime);
  const isSpecialEpisodeScheduledToday = (ongoing.specialEpisodes || [])
    .some((special) => special.releaseDate === todayKey);
  const releasedThroughToday = releaseDates.filter(
    (value) => value < todayKey || (value === todayKey && airingTimeReached),
  ).length;
  const releasedBeforeToday = releaseDates.filter((value) => value < todayKey).length;
  const isScheduledToday = releaseDates.includes(todayKey);
  // Visibility follows the configured release date. The assigned time only
  // determines whether today's episode counts as aired.
  const isAiringToday = isScheduledToday;
  const totalEpisodes = releaseDates.length;

  return {
    totalEpisodes,
    airedEpisode: Math.min(totalEpisodes, releasedThroughToday),
    isAiringToday,
    isSpecialEpisodeScheduledToday,
    isFinalEpisodeScheduledToday:
      isScheduledToday &&
      releasedBeforeToday < totalEpisodes &&
      releaseDates.filter((value) => value <= todayKey).length >= totalEpisodes,
    isFinalEpisodeAiringToday:
      isAiringToday &&
      releasedBeforeToday < totalEpisodes &&
      releasedThroughToday >= totalEpisodes,
    isFinalEpisodeAired: totalEpisodes > 0 && releasedThroughToday >= totalEpisodes,
    isConfigured: releaseDates.length > 0,
  };
}

function countReleasedEpisodes(
  firstAirDate: Date,
  throughDate: Date,
  airDays: Set<AirDay>,
  premiereEpisodeCount: number,
): number {
  if (throughDate < firstAirDate) return 0;

  // The premiere date can release a batch of episodes. Subsequent selected
  // air days contribute one episode each.
  const cursor = new Date(firstAirDate);
  let count = premiereEpisodeCount;
  cursor.setDate(cursor.getDate() + 1);
  while (cursor <= throughDate) {
    if (airDays.has(AIR_DAYS_BY_INDEX[cursor.getDay()])) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/**
 * Calculates the schedule without changing the user's watched progress.
 *
 * The calculation intentionally uses local calendar dates, matching the rest
 * of the app's weekday-based airing UI. A missing premiere date means the
 * entry remains in the existing manual-tracking mode.
 */
export function getOngoingSchedule(
  ongoing: Pick<
    OngoingEntry,
    | 'firstAirDate'
    | 'airTime'
    | 'airDays'
    | 'totalEpisodes'
    | 'premiereEpisodeCount'
    | 'trackingMode'
    | 'releaseDates'
    | 'specialEpisodes'
  >,
  now = new Date(),
): OngoingSchedule {
  const firstAirDate = ongoing.firstAirDate ? parseDateOnly(ongoing.firstAirDate) : null;
  const airDays = new Set(ongoing.airDays);
  const premiereEpisodeCount = Math.max(
    1,
    Math.floor(ongoing.premiereEpisodeCount ?? 1),
  );
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isSpecialEpisodeScheduledToday = (ongoing.specialEpisodes || [])
    .some((special) => special.releaseDate === dateKey(today));
  // Release-calendar dates are the complete source of truth whenever they
  // exist. Older entries can contain releaseDates while still carrying the
  // default recurring tracking mode, so relying on trackingMode alone makes
  // those entries incorrectly ask for a firstAirDate.
  if (ongoing.trackingMode === 'calendar' || ongoing.releaseDates?.length) {
    return getCalendarSchedule(ongoing, now);
  }

  const isPremiereDay = firstAirDate
    ? today.getTime() === firstAirDate.getTime()
    : false;
  const isScheduledToday =
    (isPremiereDay || airDays.has(AIR_DAYS_BY_INDEX[today.getDay()])) &&
    (!firstAirDate || today >= firstAirDate);
  // Visibility follows the configured airing day. The assigned time is used
  // below only when calculating the latest episode that has aired.
  const isAiringToday = isScheduledToday;

  if (!firstAirDate || airDays.size === 0 || ongoing.totalEpisodes <= 0) {
    return {
      airedEpisode: null,
      totalEpisodes: ongoing.totalEpisodes,
      isAiringToday,
      isSpecialEpisodeScheduledToday,
      isFinalEpisodeScheduledToday: false,
      isFinalEpisodeAiringToday: false,
      isFinalEpisodeAired: false,
      isConfigured: false,
    };
  }

  const scheduleThroughDate = new Date(today);
  const dayBeforeToday = new Date(today);
  dayBeforeToday.setDate(dayBeforeToday.getDate() - 1);
  if (isScheduledToday && !hasReachedAirTime(now, ongoing.airTime)) {
    scheduleThroughDate.setDate(scheduleThroughDate.getDate() - 1);
  }
  const releasedThroughToday = countReleasedEpisodes(
    firstAirDate,
    scheduleThroughDate,
    airDays,
    premiereEpisodeCount,
  );
  const releasedBeforeToday = countReleasedEpisodes(
    firstAirDate,
    dayBeforeToday,
    airDays,
    premiereEpisodeCount,
  );
  const scheduledThroughToday = countReleasedEpisodes(
    firstAirDate,
    today,
    airDays,
    premiereEpisodeCount,
  );
  const airedEpisode = Math.min(ongoing.totalEpisodes, releasedThroughToday);
  const isFinalEpisodeAiringToday =
    isAiringToday &&
    releasedBeforeToday < ongoing.totalEpisodes &&
    releasedThroughToday >= ongoing.totalEpisodes;

  return {
    totalEpisodes: ongoing.totalEpisodes,
    airedEpisode,
    isAiringToday,
    isSpecialEpisodeScheduledToday,
    isFinalEpisodeScheduledToday:
      isScheduledToday &&
      today >= firstAirDate &&
      releasedBeforeToday < ongoing.totalEpisodes &&
      scheduledThroughToday >= ongoing.totalEpisodes,
    isFinalEpisodeAiringToday,
    isFinalEpisodeAired: releasedThroughToday >= ongoing.totalEpisodes,
    isConfigured: true,
  };
}

export function formatDateOnly(value: string): string {
  const date = parseDateOnly(value);
  if (!date) return value;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function isValidDateOnly(value: string): boolean {
  return Boolean(parseDateOnly(value));
}

export function getDateOnly(date = new Date()): string {
  return dateKey(date);
}

function getReleaseAt(date: Date, airTime?: string): { releaseAt: Date; hasExactTime: boolean } {
  const releaseAt = new Date(date);
  const parsedTime = airTime ? parseReleaseTime(airTime) : null;

  if (parsedTime) {
    releaseAt.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
    return { releaseAt, hasExactTime: true };
  }

  releaseAt.setHours(0, 0, 0, 0);
  return { releaseAt, hasExactTime: false };
}

function getNextRegularEpisodeRelease(
  ongoing: Pick<
    OngoingEntry,
    | 'firstAirDate'
    | 'airTime'
    | 'airDays'
    | 'totalEpisodes'
    | 'premiereEpisodeCount'
    | 'trackingMode'
    | 'releaseDates'
    | 'specialEpisodes'
    | 'currentEpisode'
  >,
  now: Date,
): UpcomingRelease | null {
  const schedule = getOngoingSchedule(ongoing, now);
  const totalEpisodes = schedule.totalEpisodes || ongoing.totalEpisodes;
  const airedEpisode = schedule.airedEpisode ?? ongoing.currentEpisode;

  if (totalEpisodes <= 0 || airedEpisode >= totalEpisodes) return null;

  if (ongoing.trackingMode === 'calendar' || ongoing.releaseDates?.length) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dates = [...(ongoing.releaseDates || [])]
      .filter((value) => parseDateOnly(value) !== null)
      .sort();

    for (let index = 0; index < dates.length; index += 1) {
      if (index + 1 <= airedEpisode) continue;
      const releaseDate = parseDateOnly(dates[index]);
      if (!releaseDate || releaseDate < today) continue;

      const { releaseAt, hasExactTime } = getReleaseAt(releaseDate, ongoing.airTime);
      if (releaseAt.getTime() < now.getTime()) continue;

      return {
        releaseAt,
        type: 'episode',
        episodeNumber: index + 1,
        hasExactTime,
      };
    }

    return null;
  }

  const firstAirDate = ongoing.firstAirDate ? parseDateOnly(ongoing.firstAirDate) : null;
  const airDays = new Set(ongoing.airDays);

  for (let offset = 0; offset <= 7; offset += 1) {
    const candidateDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const isPremiereDay = Boolean(firstAirDate && candidateDate.getTime() === firstAirDate.getTime());
    const isScheduledDay = isPremiereDay || airDays.has(
      AIR_DAYS_BY_INDEX[candidateDate.getDay()],
    );

    if (!isScheduledDay || (firstAirDate && candidateDate < firstAirDate)) {
      continue;
    }

    const { releaseAt, hasExactTime } = getReleaseAt(candidateDate, ongoing.airTime);
    if (releaseAt.getTime() < now.getTime()) continue;

    const episodeNumber = isPremiereDay
      ? Math.max(1, airedEpisode + 1)
      : Math.max(1, airedEpisode + 1);

    return {
      releaseAt,
      type: 'episode',
      episodeNumber: Math.min(totalEpisodes, episodeNumber),
      hasExactTime,
    };
  }

  return null;
}

function getNextSpecialRelease(
  specials: readonly SpecialEpisode[],
  now: Date,
): UpcomingRelease | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const upcoming = specials
    .filter((special) => !special.watched)
    .map((special) => {
      const releaseDate = parseDateOnly(special.releaseDate);
      if (!releaseDate || releaseDate < today) return null;

      const { releaseAt, hasExactTime } = getReleaseAt(releaseDate, special.releaseTime);
      if (hasExactTime && releaseAt.getTime() < now.getTime()) return null;
      if (!hasExactTime && releaseDate.getTime() === today.getTime()) {
        return {
          releaseAt: now,
          type: 'special' as const,
          specialEpisode: special,
          hasExactTime: false,
        };
      }
      return {
        releaseAt,
        type: 'special' as const,
        specialEpisode: special,
        hasExactTime,
      };
    })
    .filter((release): release is UpcomingRelease => release !== null)
    .sort((a, b) => a.releaseAt.getTime() - b.releaseAt.getTime());

  return upcoming[0] || null;
}

/**
 * Returns the nearest unwatched regular or special release for an ongoing title.
 * This is a compact read-only view of the same schedule data used by Ongoing BL.
 */
export function getNextUpcomingRelease(
  ongoing: Pick<
    OngoingEntry,
    | 'firstAirDate'
    | 'airTime'
    | 'airDays'
    | 'totalEpisodes'
    | 'premiereEpisodeCount'
    | 'trackingMode'
    | 'releaseDates'
    | 'specialEpisodes'
    | 'currentEpisode'
  >,
  now = new Date(),
): UpcomingRelease | null {
  const regularRelease = getNextRegularEpisodeRelease(ongoing, now);
  const specialRelease = getNextSpecialRelease(ongoing.specialEpisodes || [], now);

  if (!regularRelease) return specialRelease;
  if (!specialRelease) return regularRelease;
  return regularRelease.releaseAt.getTime() <= specialRelease.releaseAt.getTime()
    ? regularRelease
    : specialRelease;
}