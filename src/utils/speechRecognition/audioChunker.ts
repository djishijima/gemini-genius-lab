import { convertAudioToWav } from "../audioProcessing";

// オーディオをチャンクに分割する関数
export async function splitAudioIntoChunks(audioBlob: Blob, chunkDuration = 45): Promise<Blob[]> {
  console.log("元の音声データサイズ:", audioBlob.size, "bytes");
  const chunks: Blob[] = [];

  // チャンクサイズの計算
  const sampleRate = 44100;
  const bytesPerSample = 2;
  const chunkSize = chunkDuration * sampleRate * bytesPerSample;

  console.log("予想される音声の長さ:", audioBlob.size / (sampleRate * bytesPerSample), "秒");
  console.log("チャンクサイズ:", chunkSize, "bytes");

  // 一度に処理するチャンクを制限
  const maxChunks = 10;
  let chunkCount = 0;

  for (let start = 0; start < audioBlob.size && chunkCount < maxChunks; start += chunkSize) {
    const end = Math.min(start + chunkSize, audioBlob.size);
    const chunk = audioBlob.slice(start, end);
    console.log(`チャンク ${chunks.length + 1} サイズ:`, chunk.size, "bytes");

    try {
      const wavChunk = await convertAudioToWav(chunk);
      console.log(`WAV変換後のチャンク ${chunks.length + 1} サイズ:`, wavChunk.size, "bytes");
      chunks.push(wavChunk);
      chunkCount++;
    } catch (error) {
      console.error(`チャンク ${chunks.length + 1} の変換に失敗:`, error);
      break;
    }
  }

  console.log("合計チャンク数:", chunks.length);
  return chunks;
}

// 音声データをWAV形式に変換する関数
export async function prepareAudioData(audioBlob: Blob): Promise<Blob> {
  console.log("音声データをWAV形式に変換中...");
  try {
    const processedBlob = await convertAudioToWav(audioBlob);
    console.log("WAV変換完了:", processedBlob.size, "bytes");
    return processedBlob;
  } catch (error) {
    console.error("WAV変換エラー:", error);
    throw new Error(`音声データの変換に失敗しました: ${error.message}`);
  }
}
