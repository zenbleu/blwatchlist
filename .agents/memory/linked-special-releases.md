---
name: Linked special releases
description: Product rule for separately tracking future continuations and specials attached to an existing series.
---

# Linked special releases

**Rule:** Seasons, specials, spin-offs, adaptations, and side stories are separate `Entry` records. A linked release may point to another release in the same acyclic chain; a top-level original Series can serve as Season 1 when it has no explicit season number. A season can link directly to any earlier season, so multiple later seasons may share Season 1 as their parent. A linked Special Episode's number field is its episode count, not a required sequential special index. Each release keeps its own status, year, schedule, and progress; only independent links may be separately favorited and ranked.

Anthology works are separate child entries linked to an anthology-season parent and display the `Anthology` relationship badge on the child entry. Each anthology season can have its own parent entry.

**Why:** Direct links from the first season let a series entry act as a shared parent for multiple later seasons without requiring a chain through each prior season. Anthology works use season-specific parents and child-only `Anthology` badges, as chosen by the user. A special entry may contain any episode count and must not be blocked because an earlier numbered special is absent. Some tracked Series use an unnumbered original for their first season. A later release should not make an earlier entry appear unfinished, and included releases should not gain a separate Favorite or Top 10 spot.

**How to apply:** Keep parent references acyclic and season links pointing from an earlier season to a later one; preserve each release's independent status and schedule, and retain the independent-versus-included ranking rule. Anthology children use the existing parent reference and remain independently trackable unless explicitly marked included. Convert legacy nested specials into linked entries during data validation, preserving their release date/time and watched state.
