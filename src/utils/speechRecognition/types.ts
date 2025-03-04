
export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionResult {
  alternatives: SpeechRecognitionAlternative[];
}

export interface SpeechRecognitionResponse {
  results?: SpeechRecognitionResult[];
  error?: {
    code: number;
    message: string;
  };
}

export interface TranscriptionProgress {
  (progress: number): void;
}

export interface PartialResultCallback {
  (text: string, isFinal: boolean): void;
}
