// ── Annual BL Wrapped — Contextual Narrator Comments ──────────────────────────
// Year-specific comments with multiple variations per category.
// Never sarcastic or guilt-inducing — always friendly, warm, and celebratory.

const pool: Record<string, string[]> = {
  highActivity: [
    'Looks like {year} was quite the BL marathon.',
    'You definitely made time for BL this year.',
    '{year} kept you busy — and your BL list even busier.',
    'If {year} had a soundtrack, it was mostly opening themes.',
  ],
  collectionGrowth: [
    'Your BL library had quite the glow-up this year.',
    'Your collection grew more than a K-drama plot twist.',
    'That is a lot of new titles finding a home in your library.',
    'Your BL shelves are looking seriously well-stocked after this year.',
  ],
  manyFavorites: [
    'Apparently, your heart had plenty of room this year.',
    'You collected favorites like they were going out of style.',
    'These BLs clearly left a permanent mark on your heart.',
    'Your favorites list grew almost as fast as your watchlist.',
  ],
  manyCountries: [
    'Your BL passport got a serious workout.',
    'You practically toured all of Asia from your couch.',
    'Multiple countries, one happy BL watcher.',
    'Your screen took you to more countries than most people visit in a decade.',
  ],
  manyGenres: [
    'You really weren\'t afraid to explore.',
    'From romance to thriller — you explored it all this year.',
    'Your BL taste refused to be boxed in this year.',
    'Genre-hopping at its finest. You tried a bit of everything.',
  ],
  manyCompleted: [
    'You came, you watched, you conquered.',
    'That is an impressive number of stories you finished this year.',
    'Your completed list is basically a trophy case at this point.',
    'You finished more BLs this year than some people start.',
  ],
  manyPlanned: [
    'Your watchlist is already planning your next year.',
    'You stocked up on future joy — your watchlist is bursting.',
    'So many plans, so little time — but that\'s the fun of it.',
    'Your future self is going to be very busy. And very happy.',
  ],
  manyDropped: [
    'Not every story made it to the finale — and that\'s okay.',
    'Knowing when to move on is a skill. You clearly honed it this year.',
    'Every dropped title made room for a better discovery.',
    'Quality over quantity — you know what you like.',
  ],
  quietYear: [
    'Every journey has its quiet chapters.',
    'A peaceful year in the BL world. The next adventure is always waiting.',
    'Sometimes the quiet years are the ones that set up the best stories.',
    'No pressure, no rush. Your BL journey will be here whenever you\'re ready.',
  ],
  top10: [
    'After everything you watched this year, these are the ones that stayed with you.',
    'Out of all your {year} discoveries, these ten earned their spot.',
    'Your {year} Top 10 — the cream of a very impressive crop.',
    'These are the BLs that defined your {year}. No small feat.',
  ],
  ongoing: [
    'Some stories you started this year are still unfolding — and that\'s the beauty of ongoing BLs.',
    'You embarked on new journeys, and some are still writing their endings.',
    'The best ongoing BLs are the ones that keep you coming back. You found plenty this year.',
    'Every ongoing BL is a promise of more to come. You made quite a few promises this year.',
  ],
  achievements: [
    'Your {year} achievement wall is looking pretty spectacular.',
    'Milestones don\'t happen by accident. You earned every one this year.',
    'From collection milestones to personal records — {year} was a year of growth.',
    'Every achievement tells a story of your growing BL journey.',
  ],
  rankProgression: [
    'Your BL rank climbed new heights this year.',
    'From where you started to where you are now — that\'s real growth.',
    'Your watcher title tells the story of a year well spent.',
    'Every completed BL brought you closer to the next rank.',
  ],
  finale: [
    'And that\'s your {year} BL journey.',
    'From the stories you discovered to the ones you couldn\'t forget...',
    'Thank you for another year of BL.',
    'The next chapter is waiting whenever you\'re ready.',
    'Here\'s to the stories that made {year} unforgettable.',
  ],
  yearIntro: [
    'Your {year} BL Wrapped is here.',
    'Let\'s look back at your {year} BL journey.',
    'Time to celebrate everything you experienced in {year}.',
    'Your {year} BL story is about to unfold.',
  ],
  highestRated: [
    'This was your standout moment of the year.',
    'When a BL hits this high, you know it\'s special.',
    'Your highest-rated BL of the year — and what a choice.',
    'This one clearly left a mark. Well deserved.',
  ],
};

/** Returns a deterministic comment for a given category and year.
 *  Using the year as a seed keeps the same comment when replaying. */
export function getAnnualNarratorComment(
  category: keyof typeof pool,
  year: number,
): string {
  const comments = pool[category] ?? pool.finale;
  let hash = 0;
  const seedStr = String(year);
  for (let i = 0; i < seedStr.length; i++) hash = (hash * 31 + seedStr.charCodeAt(i)) & 0xffff;
  const seed = (hash + category.length * 7) % comments.length;
  const comment = comments[Math.abs(seed)];
  return comment.replace(/\{year\}/g, String(year));
}
