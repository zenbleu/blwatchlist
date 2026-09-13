// ── Monthly BL Wrapped — Contextual Narrator Comments ────────────────────────
// One random comment per category, displayed alongside statistics.
// Never sarcastic or guilt-inducing — always friendly and celebratory.

const pool: Record<string, string[]> = {
  completed: [
    'Looks like binge mode was activated this month!',
    'Another month, another collection of unforgettable stories.',
    'Your watchlist became a little shorter — and your memories a little richer.',
    'That\'s dedication. Every completed title is a story you\'ll carry with you.',
  ],
  ongoing: [
    'A brand-new journey has begun.',
    'Looks like you\'ve found another story worth following.',
    'Here\'s hoping every next episode is worth the wait!',
    'The best part of ongoing BLs? There\'s always more to look forward to.',
  ],
  planned: [
    'Your future self is already looking forward to these.',
    'You\'ve been planning longer than some BLs take to air — and that\'s perfectly okay.',
    'Plan to Watch… or plan to keep planning? Either way, no judgment.',
    'A solid watchlist is the sign of an enthusiast who knows what they want.',
  ],
  dropped: [
    'Not every story is meant for everyone — and that\'s perfectly okay.',
    'Sometimes moving on is the right choice.',
    'Every dropped title makes room for a better discovery.',
    'Knowing what you don\'t enjoy is just as valuable as knowing what you love.',
  ],
  favorites: [
    'Some stories simply earn a permanent place in your heart.',
    'Looks like a few BLs became truly unforgettable this month.',
    'Not every BL becomes a favorite — but these ones earned it.',
    'Your favorites list tells a story all on its own.',
  ],
  ratings: [
    'Your opinions helped shape this month\'s BL journey.',
    'Every rating tells part of your story.',
    'Seems like you had plenty to say this month — and that\'s a great thing.',
    'Thoughtful ratings. Your BL taste is clearly well-defined.',
  ],
  highestRated: [
    'A new standout moment in your BL journey.',
    'This one clearly left a mark. Well deserved.',
    'When a BL hits that high — you just know.',
    'Your highest-rated title says a lot about your taste.',
  ],
  avgRating: [
    'Your average rating tells the story of your month at a glance.',
    'A reflection of the BLs that shaped your month.',
    'Every score contributes to the bigger picture of your journey.',
  ],
  country: [
    'This country\'s BL industry definitely stole the spotlight this month.',
    'Looks like your passport only needed one destination this month.',
    'Your BL journey spent plenty of time here — and clearly for good reason.',
    'One country dominated your screen time. Quality over variety.',
  ],
  top10: [
    'Your all-time rankings have a new chapter.',
    'Looks like the competition for your Top 10 just got tougher.',
    'Some legends never leave… others just arrived.',
    'A Top 10 update means something truly moved you this month.',
  ],
  achievement: [
    'Congratulations! Another milestone has been reached.',
    'Your BL journey just became even more impressive.',
    'Every achievement tells a story of your growing collection.',
    'Milestones don\'t happen overnight. This one was earned.',
  ],
  growth: [
    'Your BL library continues to grow.',
    'One month closer to an even bigger collection.',
    'Every title adds another memory to your journey.',
    'A growing collection is a growing story.',
  ],
  rank: [
    'You\'ve taken another step as a true BL enthusiast.',
    'Your dedication is starting to show.',
    'Another milestone unlocked on your BL journey.',
    'Your rank reflects the journey, not just the destination.',
  ],
  quiet: [
    'Every journey has its quiet chapters.',
    'This month was peaceful, and that\'s perfectly okay.',
    'Your next BL adventure will be waiting whenever you\'re ready.',
    'Even quiet months are part of your story.',
  ],
  ending: [
    'Another chapter of your BL journey has come to an end. See you next month!',
    'Thanks for spending another month with BL. More stories await.',
    'Every month tells a different story. Let\'s see what next month brings.',
    'Until next month — may every episode end on a good note.',
  ],
};

/** Returns a deterministic-ish comment for a given category and snapshot month.
 *  Using the month string as a seed keeps the same comment when replaying. */
export function getNarratorComment(category: keyof typeof pool, month: string): string {
  const comments = pool[category] ?? pool.ending;
  // simple hash of the month string to pick a stable index
  let hash = 0;
  for (let i = 0; i < month.length; i++) hash = (hash * 31 + month.charCodeAt(i)) & 0xffff;
  const seed = (hash + category.length * 7) % comments.length;
  return comments[Math.abs(seed)];
}
