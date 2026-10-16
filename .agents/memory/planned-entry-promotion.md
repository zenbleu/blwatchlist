---
name: Planned entry promotion
description: Product rule for promoting planned entries when their premiere date and local release time have passed.
---

**Rule:** Preserve the existing automatic promotion of planned entries. In the editor, automatically switch Planned to Ongoing only when both a release date and local release time are assigned and have passed; missing either value must not trigger this editor rule.

**Why:** The user explicitly asked to retain current promotion behavior while adding a stricter editor transition for entries with both date and time.

**How to apply:** Do not replace the existing promotion path. Compare the configured date and time in local time, and retain the premiere date/time and initial episode schedule when the editor promotes an entry.
