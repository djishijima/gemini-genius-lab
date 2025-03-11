
export interface Difference {
  value: string;
  added?: boolean;
  removed?: boolean;
  lines1?: number[];
  lines2?: number[];
}

export interface DiffResult {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export interface SimilarityStats {
  addedLines: number;
  removedLines: number;
  similarityPercentage: number;
}

import type { LucideIcon } from 'lucide-react';

export interface DisplayMode {
  id: 'overlay';
  label: string;
  icon: LucideIcon;
  tooltip?: string;
}
