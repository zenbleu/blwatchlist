---
name: Linked special releases
description: Product rule for separately tracking future continuations and specials attached to an existing series.
---

# Linked special releases

**Rule:** Seasons, specials, continuations, spin-offs, and side stories are separate `Entry` records linked to a top-level movie or series. Each linked entry keeps its own status, year, schedule, and progress. Independent links may be favorited and ranked; links marked as part of the parent may not.

**Why:** One linked-entry model avoids competing special-episode routes and keeps release-calendar events distinct. A later release should not make the parent appear unfinished, and included releases should not gain a separate Favorite or Top 10 spot.

**How to apply:** Convert legacy nested specials into linked entries during data validation, preserving their release date/time, watched state, and parent. Keep `Standalone (Original)` editor-only, and preserve the existing independent-versus-included ranking rule.
