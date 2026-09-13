type EntryIdentity = {
  title: string;
  type: 'Movie' | 'Series';
  season?: number | null;
};

export function formatSeasonLabel(season?: number | null): string {
  return season == null ? 'Standalone' : `Season ${season}`;
}

export function isSameEntryIdentity(a: EntryIdentity, b: EntryIdentity): boolean {
  return a.type === b.type
    && a.title.trim().toLocaleLowerCase() === b.title.trim().toLocaleLowerCase()
    && (a.season ?? null) === (b.season ?? null);
}