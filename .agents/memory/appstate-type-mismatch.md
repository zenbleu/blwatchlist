---
name: AppState type mismatch
description: Runtime AppState has fields not in the TypeScript type definition.
---

# AppState type narrower than runtime

**Rule:** The `AppState` interface in `app/src/types/index.ts` does NOT include `importMode`, `milestoneQueue`, or `celebratedMilestones`, but the runtime state in `AppContext.tsx`'s `initialState` does include them.

**Why:** This is a pre-existing inconsistency in the codebase. It works at runtime because TypeScript allows object literals with extra fields when assigned to typed variables. The reducer and context use the narrow type.

**How to apply:** When reading state for wrapped tracking or any new feature, only rely on fields that are in the official `AppState` type (`entries`, `ongoing`, `favorites`, `top10Drawers`, `ongoingYear`, `watchingSince`). Cast to `AppState` when passing state to functions with that parameter type.
