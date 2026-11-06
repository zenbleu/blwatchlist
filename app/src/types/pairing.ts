import type { Actor, ActorRole, Entry } from '@/types';

export interface BlPairingRecord {
  id: string; // cp_{actor1Id}_{actor2Id}
  actor1Id: string;
  actor2Id: string;
  shipName?: string;
  isFavorite: boolean;
  notes?: string;
  createdAt: number;
}

export interface SharedProjectCredit {
  entry: Entry;
  actor1Role: ActorRole;
  actor1Character: string;
  actor2Role: ActorRole;
  actor2Character: string;
  chemistryScore: number | null;
  hasOutstandingChemistry: boolean;
  overallRating: number | null;
}

export interface ComputedPairing {
  id: string;
  actor1: Actor;
  actor2: Actor;
  shipName: string;
  isFavorite: boolean;
  notes?: string;
  sharedProjects: SharedProjectCredit[];
  totalProjects: number;
  mainLeadProjects: number;
  totalEpisodes: number;
  averageChemistry: number | null;
  outstandingChemistryCount: number;
  averageOverallScore: number | null;
  country: string;
  isCustomTagged: boolean;
}
