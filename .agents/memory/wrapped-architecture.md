---
name: Monthly BL Wrapped architecture
description: How the Monthly BL Wrapped feature is structured — separate DB, tracker, context, UI.
---

# Monthly BL Wrapped — Architecture

**Rule:** Wrapped data lives in a completely separate IndexedDB (`BLWrappedDB`), never touching the main `BLWatchlistDB`.

**Why:** Zero risk of corrupting main app data; independent versioning; clean separation.

**How to apply:**
- `app/src/lib/wrappedDB.ts` — raw IDB operations for `BLWrappedDB` (stores: `monthlyActivity`, `wrappedSnapshots`)
- `app/src/lib/wrappedTracker.ts` — called from `AppContext`'s `dispatchWithTracking` (fire-and-forget)
- `app/src/lib/wrappedEngine.ts` — snapshot generation and slide builder
- `app/src/context/WrappedContext.tsx` — React context; generates missed months on app load
- `app/src/components/wrapped/WrappedPresentation.tsx` — fullscreen Spotify-style UI
- `app/src/components/wrapped/WrappedHistory.tsx` — bottom sheet history

**Tracking integration:** `AppContext.tsx` wraps `dispatch` with `dispatchWithTracking` which calls `trackWrappedEvent(action, state)` as a silent side effect. No changes to the reducer.

**Install month:** stored in `localStorage` under key `bl-wrapped-start-month` as a lightweight anchor.
