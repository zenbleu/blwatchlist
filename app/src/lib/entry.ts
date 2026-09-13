export function formatSeasonLabel(season?: number | null): string {
  return season == null ? 'Standalone' : `Season ${season}`;
}