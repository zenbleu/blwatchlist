// ── Annual BL Wrapped — shared type aliases ───────────────────────────────────
//
// Annual Wrapped originally had a second, incomplete set of types. Keep this
// module as the annual feature's public type surface, but use the complete
// definitions shared with the tracker and presentation engine.

import type {
  AnnualActivityData as SharedAnnualActivityData,
  AnnualWrappedSnapshot as SharedAnnualWrappedSnapshot,
} from './wrapped';

export type YearKey = number;
export type AnnualActivityData = SharedAnnualActivityData;
export type AnnualWrappedSnapshot = SharedAnnualWrappedSnapshot;

export { emptyAnnualActivityData } from './wrapped';

export interface AnnualWrappedContextValue {
  annualSnapshots: AnnualWrappedSnapshot[];
  pendingAnnualSnapshot: AnnualWrappedSnapshot | null;
  activeAnnualSnapshot: AnnualWrappedSnapshot | null;
  annualHistoryOpen: boolean;
  isAnnualReady: boolean;

  viewAnnualSnapshot: (snapshot: AnnualWrappedSnapshot) => void;
  dismissAnnualPresentation: () => void;
  openAnnualHistory: () => void;
  closeAnnualHistory: () => void;
  replayAnnualSnapshot: (year: YearKey) => void;
}