---
name: Linked special releases
description: Product rule for separately tracking future continuations and specials attached to an existing series.
---

# Linked special releases

**Rule:** Seasons, specials, spin-offs, adaptations, and side stories are separate `Entry` records. A linked release may point to another release in the same acyclic chain (for example, Season 2 to Season 1); a top-level original Series can serve as Season 1 when it has no explicit season number. Each keeps its own status, year, schedule, and progress. Independent links may be favorited and ranked; links marked as part of the parent may not.

**Why:** Chained links preserve sequence and let the app require the preceding season or special episode before saving the next one. Some tracked Series use an unnumbered original for their first season. A later release should not make an earlier entry appear unfinished, and included releases should not gain a separate Favorite or Top 10 spot.

**How to apply:** Keep parent references acyclic, preserve each release's independent status and schedule, and retain the independent-versus-included ranking rule. Convert legacy nested specials into linked entries during data validation, preserving their release date/time and watched state.
