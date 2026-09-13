import type { Milestone } from '@/components/MilestoneModal';

declare module '@/types' {
  // Interface merging extends AppState with milestone/import-mode fields.
  // NOTE: AppAction is a type alias and CANNOT be augmented here — the
  // milestone/import-mode action variants live directly in ./index.ts.
  interface AppState {
    importMode: boolean;
    milestoneQueue: Milestone[];
    celebratedMilestones: string[];
  }
}
