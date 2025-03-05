import { TranscriptionProgress, PartialResultCallback } from "./types";
import { splitAudioIntoChunks, prepareAudioData } from "./audioChunker";
import { processAudioChunk } from "./apiClient";

// メイン文字起こし処理関数
export async function transcribeAudio(
  audioBlob: Blob,
  apiKey: string,
  onProgress?: TranscriptionProgress,
  onPartialResult?: PartialResultCallback,
): Promise<string> {
  try {
    console.log("音声文字起こし開始", audioBlob.type, audioBlob.size);

    if (!audioBlob || audioBlob.size === 0) {
      throw new Error("有効な音声データがありません。録音が正しく行われなかった可能性があります。");
    }

    // 進捗状況の初期化
    if (onProgress) {
      onProgress(10);
    }

    // ファイルサイズのチェック
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    if (audioBlob.size > MAX_FILE_SIZE) {
      throw new Error(
        `ファイルサイズが大きすぎます（${(audioBlob.size / (1024 * 1024)).toFixed(2)}MB）。100MB以下のファイルを使用してください。`,
      );
    }

    // WebM形式をWAV形式に変換
    let processedBlob: Blob;
    try {
      processedBlob = await prepareAudioData(audioBlob);
      console.log("変換後の音声データ:", processedBlob.type, processedBlob.size, "bytes");
    } catch (error) {
      console.error("音声データの変換エラー:", error);
      throw new Error(
        "音声データの変換中にエラーが発生しました。サポートされている形式ではない可能性があります。",
      );
    }

    if (onProgress) {
      onProgress(30);
    }

    // 小さなファイルの場合は分割せずに処理
    if (processedBlob.size < 1024 * 1024) {
      // 1MB未満
      console.log("小さいファイルなので直接処理します");
      const transcription = await processAudioChunk(processedBlob, apiKey, 0, 1);

      if (transcription) {
        if (onPartialResult) {
          onPartialResult(transcription, true);
        }
      } else {
        console.warn("音声認識結果が空です。音声が認識できなかった可能性があります。");
        if (onPartialResult) {
          onPartialResult("音声を認識できませんでした。もう一度録音してみてください。", true);
        }
      }

      if (onProgress) {
        onProgress(100);
      }

      return transcription || "音声を認識できませんでした。もう一度録音してみてください。";
    }

    // audioBlob自体をチャンクに分割する
    console.log("ファイルサイズが大きいため分割処理を行います");
    const chunks = await splitAudioIntoChunks(processedBlob);

    if (chunks.length === 0) {
      throw new Error("音声データを処理できませんでした。");
    }

    let fullTranscription = "";
    let hasRecognizedAny = false;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`チャンク ${i + 1}/${chunks.length} の処理開始:`, chunk.size, "bytes");

      // 進捗状況の更新
      if (onProgress) {
        const progress = 30 + (i / chunks.length) * 60;
        onProgress(Math.round(progress));
      }

      const transcription = await processAudioChunk(chunk, apiKey, i, chunks.length);
      console.log(`チャンク ${i + 1} の文字起こし結果:`, transcription);

      if (transcription) {
        hasRecognizedAny = true;
        fullTranscription += `${transcription}\n`;

        // 部分的な結果を返す
        if (onPartialResult) {
          onPartialResult(transcription, i === chunks.length - 1);
        }
      } else {
        console.log(`チャンク ${i + 1} の文字起こし結果が空です`);
      }
    }

    if (!fullTranscription.trim()) {
      const errorMessage = "音声を認識できませんでした。もう一度録音してみてください。";

      if (!hasRecognizedAny) {
        if (onPartialResult) {
          onPartialResult(errorMessage, true);
        }
        return errorMessage;
      }
    }

    console.log("文字起こし完了:", fullTranscription);

    // 完了時の進捗状況を100%に設定
    if (onProgress) {
      onProgress(100);
    }

    return fullTranscription.trim() || "音声を認識できませんでした。もう一度録音してみてください。";
  } catch (error) {
    console.error("Speech-to-Text Error:", error);
    throw error;
  }
}
