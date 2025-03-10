
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

export interface TourState {
  run: boolean;
  steps: {
    target: string;
    content: string;
  }[];
}

export interface DiffHighlight {
  text: string;
  diffIndex: number;
  isLeft: boolean;
}

import type { LucideIcon } from 'lucide-react';

export interface DisplayMode {
  id: 'overlay' | 'side-by-side';
  label: string;
  icon: LucideIcon;
  tooltip?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
