export interface Difference {
  added?: boolean;
  removed?: boolean;
  value: string;
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
