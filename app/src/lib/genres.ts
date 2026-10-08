import type { GenreTag } from '@/types';

const GENRE_GROUPS: { category: string; names: string[] }[] = [
  {
    category: 'Core Genres',
    names: ['Drama', 'Comedy', 'Slice of Life', 'Coming-of-Age', 'Family', 'Tragedy'],
  },
  {
    category: 'Mystery / Suspense',
    names: ['Mystery', 'Thriller', 'Psychological', 'Crime', 'Detective', 'Suspense'],
  },
  {
    category: 'Action / Adventure',
    names: ['Action', 'Adventure', 'Martial Arts', 'Sports'],
  },
  {
    category: 'Fantasy / Supernatural',
    names: ['Fantasy', 'Supernatural', 'Paranormal', 'Urban Fantasy', 'Mythology', 'Magic', 'Superhero', 'Horror', 'Survival'],
  },
  {
    category: 'Science Fiction / Speculative',
    names: ['Science Fiction', 'Dystopian', 'Post-Apocalyptic', 'Time Travel', 'Alternate Reality'],
  },
  {
    category: 'Historical / Period',
    names: ['Historical', 'Period Drama', 'War'],
  },
  {
    category: 'Professional / Institutional',
    names: ['Medical', 'Legal', 'Political', 'Workplace', 'Military', 'Academic'],
  },
  {
    category: 'Youth / School',
    names: ['School', 'University', 'Youth'],
  },
  {
    category: 'Entertainment / Performing Arts',
    names: ['Music', 'Performing Arts', 'Entertainment Industry', 'Celebrity'],
  },
];

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');
}

function genreColor(index: number): string {
  const hue = Math.round((index * 137.508 + 12) % 360);
  return `hsl(${hue} 72% 72%)`;
}

export const DEFAULT_GENRE_TAGS: GenreTag[] = GENRE_GROUPS.flatMap((group) =>
  group.names.map((name) => ({
    id: `genre-${slugify(name)}`,
    name,
    category: group.category,
    color: genreColor(GENRE_GROUPS.slice(0, GENRE_GROUPS.indexOf(group))
      .reduce((count, previous) => count + previous.names.length, 0)
      + group.names.indexOf(name)),
  })),
);

export function normalizeGenreName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export function createCustomGenreTag(
  name: string,
  category: string,
  existingTags: readonly GenreTag[],
): GenreTag {
  const baseId = `custom-${slugify(name) || 'genre'}`;
  let id = baseId;
  let suffix = 2;
  while (existingTags.some((tag) => tag.id === id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }

  const colorHash = [...name].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) % 360, 17);
  return {
    id,
    name: name.trim(),
    category: category.trim() || 'Custom',
    color: `hsl(${colorHash} 72% 72%)`,
    custom: true,
  };
}
