import { TranscriptionProgress, PartialResultCallback } from "./types";
import { transcribeAudio } from "./transcriber";

export async function processFile(
  file: Blob,
  apiKey: string,
  onProgress?: TranscriptionProgress,
  onPartialResult?: PartialResultCallback,
): Promise<string> {
  console.log("ファイル処理開始:", file.type, file.size, "bytes");

  if (onProgress) {
    onProgress(0);
  }

  try {
    const arrayBuffer = await file.arrayBuffer();

    if (onProgress) {
      onProgress(100);
    }

    const blob = new Blob([arrayBuffer], { type: file.type });
    return await transcribeAudio(blob, apiKey, onProgress, onPartialResult);
  } catch (error) {
    console.error("File Processing Error:", error);
    throw error;
  }
}
