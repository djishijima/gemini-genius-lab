
import { RefObject } from "react";

export interface UsePdfCompareReturn {
  pdf1: File | null;
  pdf2: File | null;
  text1: string;
  text2: string;
  pdf1Text: string;
  pdf2Text: string;
  differences: any[];
  similarityScore: number;
  loading: boolean;
  progress: number;
  numPages1: number;
  numPages2: number;
  selectedDiffIndex: number | null;
  chatMessages: any[];
  fileInput1Ref: RefObject<HTMLInputElement>;
  fileInput2Ref: RefObject<HTMLInputElement>;
  setText1: (value: string) => void;
  setText2: (value: string) => void;
  handlePdf1Change: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handlePdf2Change: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  comparePdfs: () => Promise<void>;
  onDocumentLoadSuccess: (pdf: any, isPdf1: boolean) => void;
  createAndTrackBlobUrl: (file: File | null) => string | null;
  setSelectedDiffIndex: (index: number | null) => void;
  setChatMessages: (messages: any) => void;
}
