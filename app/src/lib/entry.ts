import type { Entry, EntryRelationshipType } from '@/types';

type EntryIdentity = Pick<
  Entry,
  'title' | 'type' | 'year' | 'country' | 'season' | 'parentEntryId' | 'relationshipType' | 'specialNumber' | 'spinOffDirection'
>;

function effectiveRelationshipType(entry: EntryIdentity): EntryRelationshipType {
  if (entry.relationshipType) return entry.relationshipType;
  if (entry.parentEntryId) return entry.season == null ? 'continuation' : 'season';
  return entry.season == null ? 'original' : 'season';
}

export function formatSeasonLabel(season?: number | null): string {
  return season == null ? 'Standalone' : `Season ${season}`;
}

export function isSameEntryIdentity(a: EntryIdentity, b: EntryIdentity): boolean {
  return a.type === b.type
    && a.title.trim().toLocaleLowerCase() === b.title.trim().toLocaleLowerCase()
    && a.year === b.year
    && a.country.trim().toLocaleLowerCase() === b.country.trim().toLocaleLowerCase()
    && (a.season ?? null) === (b.season ?? null)
    && (a.specialNumber ?? null) === (b.specialNumber ?? null)
    && (a.parentEntryId ?? null) === (b.parentEntryId ?? null)
    && (a.spinOffDirection ?? null) === (b.spinOffDirection ?? null)
    && effectiveRelationshipType(a) === effectiveRelationshipType(b);
}

export function getRelationshipType(entry: Pick<Entry, 'relationshipType' | 'season' | 'parentEntryId'>): EntryRelationshipType {
  if (entry.relationshipType) return entry.relationshipType;
  if (entry.parentEntryId) return entry.season == null ? 'continuation' : 'season';
  return entry.season == null ? 'original' : 'season';
}

export function getEntryRelationshipLabel(
  entry: Pick<Entry, 'relationshipType' | 'season' | 'specialNumber' | 'parentEntryId' | 'spinOffDirection'>,
): string | null {
  switch (getRelationshipType(entry)) {
    case 'specialEpisode':
      return `Special Episode${entry.specialNumber ? ` ${entry.specialNumber}` : ''}`;
    case 'season':
      return `Season ${entry.season ?? 1}`;
    case 'spinOff':
      return entry.spinOffDirection === 'sequel'
        ? 'Sequel'
        : entry.spinOffDirection === 'prequel'
          ? 'Prequel'
          : 'Spin-off';
    case 'adaptation':
      return 'Adaptation';
    case 'sideStory':
      return 'Side Story';
    case 'anthology':
      return 'Anthology';
    case 'continuation':
      return 'Related';
    default:
      return null;
  }
}

export function formatLinkedReleaseDescription(
  entry: Pick<Entry, 'relationshipType' | 'season' | 'specialNumber' | 'parentEntryId' | 'spinOffDirection'>,
  parentTitle: string,
): string {
  return `${getEntryRelationshipLabel(entry) || 'Related entry'} of ${parentTitle}`;
}

export function isIndependentlyRankable(entry: Pick<Entry, 'linkedReleaseMode'>): boolean {
  return entry.linkedReleaseMode !== 'included';
}

export function isEligibleForFavoriteOrTop10(
  entry: Pick<Entry, 'status' | 'linkedReleaseMode'>,
): boolean {
  return entry.status === 'COMPLETE' && isIndependentlyRankable(entry);
}