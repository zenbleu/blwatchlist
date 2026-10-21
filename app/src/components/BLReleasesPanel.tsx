import { useMemo, useRef, useState } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Entry } from '@/types';
import { formatSeasonLabel } from '@/lib/entry';
import { formatRating } from '@/lib/rating';
import Poster from './Poster';

const RELEASE_COUNTRIES = [
  { country: 'Thailand', label: 'THAILAND' },
  { country: 'Japan', label: 'JAPANESE' },
  { country: 'South Korea', label: 'KOREAN' },
  { country: 'Taiwan', label: 'TAIWANESE' },
  { country: 'China', label: 'CHINESE' },
  { country: 'Hong Kong', label: 'HONG KONG' },
  { country: 'Philippines', label: 'FILIPINO' },
  { country: 'Vietnam', label: 'VIETNAMESE' },
  { country: 'Singapore', label: 'SINGAPOREAN' },
  { country: 'Malaysia', label: 'MALAYSIAN' },
  { country: 'Indonesia', label: 'INDONESIAN' },
  { country: 'India', label: 'INDIAN' },
  { country: 'US', label: 'AMERICAN' },
  { country: 'UK', label: 'BRITISH' },
  { country: 'Canada', label: 'CANADIAN' },
  { country: 'Australia', label: 'AUSTRALIAN' },
  { country: 'Italy', label: 'ITALIAN' },
  { country: 'Spain', label: 'SPANISH' },
  { country: 'France', label: 'FRENCH' },
  { country: 'Germany', label: 'GERMAN' },
  { country: 'Netherlands', label: 'DUTCH' },
  { country: 'Belgium', label: 'BELGIAN' },
  { country: 'Argentina', label: 'ARGENTINIAN' },
  { country: 'Brazil', label: 'BRAZILIAN' },
  { country: 'Mexico', label: 'MEXICAN' },
  { country: 'Other', label: 'OTHER' },
] as const;

function normalizeReleaseCountry(country: string): string {
  const cleaned = country.replace(/\s*\p{Emoji}\s*/gu, '').trim();
  if (!cleaned) return 'Other';
  return RELEASE_COUNTRIES.find(
    (option) => option.country.toLocaleLowerCase() === cleaned.toLocaleLowerCase(),
  )?.country ?? cleaned;
}

function ReleaseRatingBadge({ rating }: { rating: number }) {
  const hasRating = Number.isFinite(rating) && rating > 0;
  if (!hasRating) {
    return (
      <span className="absolute right-3 top-3 rounded-lg bg-black/25 px-2 py-1.5 text-xl font-bold leading-none text-white/60 backdrop-blur-[2px]">
        —
      </span>
    );
  }

  return (
    <span
      aria-label={`Rating ${formatRating(rating)} out of 10`}
      className="absolute right-3 top-3 z-10 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1 whitespace-nowrap rounded-lg bg-black/25 px-2 py-1.5 text-xl font-extrabold leading-none text-white shadow-[0_1px_8px_rgba(0,0,0,0.8)] backdrop-blur-[2px]"
    >
      <span aria-hidden="true">⭐</span>
      <span>{formatRating(rating)}</span>
    </span>
  );
}

function BLReleaseCarousel({
  entries,
  year,
  ratingByEntryId,
  onEntryClick,
}: {
  entries: Entry[];
  year: number;
  ratingByEntryId: ReadonlyMap<string, number>;
  onEntryClick: (entry: Entry) => void;
}) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const scroll = (direction: -1 | 1) => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    carousel.scrollBy({
      left: direction * Math.max(190, carousel.clientWidth * 0.78),
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative">
      <div
        ref={carouselRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3 pt-1 scrollbar-hide"
        aria-label={`Completed ${year} releases`}
      >
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onEntryClick(entry)}
            aria-label={`View details for ${entry.title}`}
            className="group relative block w-[min(74vw,220px)] shrink-0 snap-start text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E50914] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808] sm:w-[210px] lg:w-[clamp(210px,17.5vw,250px)]"
          >
            <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/[0.12] bg-[#151515] shadow-xl transition-all duration-300 group-hover:-translate-y-1 group-hover:border-white/[0.25]">
              <Poster
                src={entry.poster}
                title={entry.title}
                size="lg"
                className="!h-full !w-full !rounded-2xl transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/95" />
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              <ReleaseRatingBadge rating={ratingByEntryId.get(entry.id) ?? 0} />
              <div className="absolute inset-x-4 bottom-4">
                <p className="line-clamp-2 text-base font-bold leading-tight text-white transition-colors group-hover:text-[#ff6670] sm:text-lg">
                  {entry.title}
                </p>
                <p className="mt-1.5 text-[11px] text-white/75">
                  {entry.year}
                  <span className="mx-1.5 text-white/35">•</span>
                  {entry.type}
                  {entry.season != null && (
                    <>
                      <span className="mx-1.5 text-white/35">•</span>
                      {formatSeasonLabel(entry.season)}
                    </>
                  )}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
      {entries.length > 1 && (
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-0.5">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Scroll releases left"
            className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.12] bg-[#171717]/90 text-white shadow-lg transition-colors hover:border-[#E50914]/50 hover:bg-[#292020]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Scroll releases right"
            className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.12] bg-[#171717]/90 text-white shadow-lg transition-colors hover:border-[#E50914]/50 hover:bg-[#292020]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function BLReleasesPanel({
  entries,
  year,
  ratingByEntryId,
  onEntryClick,
}: {
  entries: Entry[];
  year: number;
  ratingByEntryId: ReadonlyMap<string, number>;
  onEntryClick: (entry: Entry) => void;
}) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const groups = useMemo(() => {
    const entriesByCountry = new Map<string, Entry[]>();
    for (const entry of entries) {
      if (entry.status !== 'COMPLETE' || entry.year !== year) continue;
      const country = normalizeReleaseCountry(entry.country);
      const countryEntries = entriesByCountry.get(country);
      if (countryEntries) countryEntries.push(entry);
      else entriesByCountry.set(country, [entry]);
    }

    return Array.from(entriesByCountry, ([country, countryEntries]) => {
      const countryIndex = RELEASE_COUNTRIES.findIndex((option) => option.country === country);
      return {
        country,
        label: RELEASE_COUNTRIES.find((option) => option.country === country)?.label ?? country.toLocaleUpperCase(),
        order: countryIndex < 0 ? RELEASE_COUNTRIES.length : countryIndex,
        entries: countryEntries.sort((a, b) => a.title.localeCompare(b.title)),
      };
    }).sort((a, b) => a.order - b.order || a.country.localeCompare(b.country));
  }, [entries, year]);
  const previewEntries = groups.flatMap((group) => group.entries).slice(0, 3);
  const releaseCount = groups.reduce((count, group) => count + group.entries.length, 0);

  return (
    <>
      <section className="min-w-0">
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-[#E50914]" />
          <h2 className="text-base font-bold text-white">BL Releases {year}</h2>
          <span className="text-xs text-[#666]">{releaseCount} completed</span>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#191016] via-[#121212] to-[#111] px-4 py-4 sm:px-5">
          <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[#E50914]/10 blur-3xl" />
          <div className="relative flex h-32 items-center justify-center">
            {previewEntries.length > 0 ? (
              <div className="flex items-center justify-center">
                {previewEntries.map((entry, index) => {
                  const centerOffset = index - (previewEntries.length - 1) / 2;
                  return (
                    <div
                      key={entry.id}
                      className="relative shrink-0"
                      style={{
                        marginLeft: index === 0 ? 0 : '-1.25rem',
                        transform: `rotate(${centerOffset * 7}deg) translateY(${Math.abs(centerOffset) * 3}px)`,
                        zIndex: index + 1,
                      }}
                    >
                      <Poster
                        src={entry.poster}
                        title={entry.title}
                        size="md"
                        className="!h-28 !w-[4.7rem] !rounded-xl border border-white/15 shadow-xl"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-28 w-20 items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 text-[#555]">
                <CalendarClock className="h-7 w-7" />
              </div>
            )}
          </div>
          <div className="relative mt-1 text-center">
            <p className="text-sm font-bold text-white">Completed BL releases from {year}</p>
            <p className="mt-1 text-xs text-[#888]">
              {releaseCount} title{releaseCount === 1 ? '' : 's'} · {groups.length} countr{groups.length === 1 ? 'y' : 'ies'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#E50914] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#ff1a26]"
          >
            Enter
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent
          showCloseButton={false}
          className="!fixed !inset-0 !left-0 !top-0 !z-[50] !h-screen !max-h-none !w-screen !max-w-none !translate-x-0 !translate-y-0 !rounded-none !border-0 overflow-hidden bg-[#0a0a0a] p-0 text-white shadow-2xl"
        >
          <DialogTitle className="sr-only">BL Releases {year}</DialogTitle>
          <DialogDescription className="sr-only">
            Browse completed BL releases from {year}, grouped by country.
          </DialogDescription>
          <div className="relative h-full min-h-0">
            <button
              type="button"
              onClick={() => setLibraryOpen(false)}
              aria-label="Close BL releases"
              className="absolute right-4 top-4 z-30 rounded-full bg-black/60 p-2 text-[#aaa] backdrop-blur-sm hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="h-full overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
              <div className="mx-auto max-w-6xl">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3 pr-12">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#E50914]">
                      <CalendarClock className="h-4 w-4" />
                      BL Releases {year}
                    </p>
                    <h2 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
                      Completed Releases by Country
                    </h2>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold text-[#777]">
                    {releaseCount} completed · {groups.length} countr{groups.length === 1 ? 'y' : 'ies'}
                  </span>
                </div>

                {groups.length === 0 ? (
                  <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] px-4 text-center">
                    <p className="text-base font-semibold text-[#aaa]">No completed releases for {year} yet.</p>
                    <p className="mt-2 text-sm text-[#666]">Completed entries from this year will appear here by country.</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {groups.map((group) => (
                      <section
                        key={group.country}
                        className="min-w-0"
                        style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 390px' }}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff737a]">
                            {group.label} BL {year}
                          </h3>
                          <span className="shrink-0 text-[10px] tabular-nums text-[#666]">{group.entries.length}</span>
                        </div>
                        <BLReleaseCarousel
                          entries={group.entries}
                          year={year}
                          ratingByEntryId={ratingByEntryId}
                          onEntryClick={onEntryClick}
                        />
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
