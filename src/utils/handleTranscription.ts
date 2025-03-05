import { transcribeAudio } from "./speechRecognition";

interface TranscriptionHandlerOptions {
  apiKey: string;
  onProgress: (progress: number) => void;
  onTranscriptionChange: (text: string) => void;
  onProcessingStateChange: (isProcessing: boolean) => void;
  onTranscribingStateChange: (isTranscribing: boolean) => void;
}

export async function handleTranscription(
  blob: Blob,
  options: TranscriptionHandlerOptions,
): Promise<void> {
  const {
    apiKey,
    onProgress,
    onTranscriptionChange,
    onProcessingStateChange,
    onTranscribingStateChange,
  } = options;

  onTranscribingStateChange(true);
  onProgress(10);

  try {
    console.log("Blob type:", blob.type);
    console.log("Blob size:", blob.size, "bytes");

    if (blob.size === 0) {
      throw new Error("録音データが空です");
    }

    console.log("文字起こし開始:", blob.size, "bytes");

    const result = await transcribeAudio(
      blob,
      apiKey,
      (progress) => {
        console.log("文字起こし進捗:", progress);
        onProgress(progress);
      },
      (partialText, isFinal) => {
        console.log("部分的な文字起こし結果:", partialText, isFinal);
        if (isFinal) {
          onTranscriptionChange(partialText + "\n\n");
        } else {
          onTranscriptionChange(partialText + "\n");
        }
      },
    );

    console.log("文字起こし完了結果:", result);
    onTranscriptionChange(result);
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  } finally {
    onTranscribingStateChange(false);
    onProcessingStateChange(false);
  }
}
