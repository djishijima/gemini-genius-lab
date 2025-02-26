
import { convertAudioToWav } from './audioProcessing';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

async function splitAudioIntoChunks(audioBlob: Blob, chunkDuration: number = 45): Promise<Blob[]> {
  console.log('元の音声データサイズ:', audioBlob.size, 'bytes');
  const chunks: Blob[] = [];
  const totalDuration = audioBlob.size / (48000 * 2);
  const chunkSize = (chunkDuration * 48000 * 2);

  console.log('予想される音声の長さ:', totalDuration, '秒');
  console.log('チャンクサイズ:', chunkSize, 'bytes');

  for (let start = 0; start < audioBlob.size; start += chunkSize) {
    const end = Math.min(start + chunkSize, audioBlob.size);
    const chunk = audioBlob.slice(start, end);
    console.log(`チャンク ${chunks.length + 1} サイズ:`, chunk.size, 'bytes');
    const wavChunk = await convertAudioToWav(chunk);
    console.log(`WAV変換後のチャンク ${chunks.length + 1} サイズ:`, wavChunk.size, 'bytes');
    chunks.push(wavChunk);
  }

  console.log('合計チャンク数:', chunks.length);
  return chunks;
}

export async function transcribeAudio(
  audioBlob: Blob, 
  apiKey: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log('音声文字起こし開始');
    const chunks = await splitAudioIntoChunks(audioBlob);
    let fullTranscription = '';

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`チャンク ${i + 1}/${chunks.length} の処理開始`);

      const buffer = await chunk.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(buffer)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      console.log(`チャンク ${i + 1} のAPIリクエスト送信`);
      const response = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config: {
              encoding: 'LINEAR16',
              sampleRateHertz: 48000,
              languageCode: 'ja-JP',
              enableAutomaticPunctuation: true,
              model: 'default',
              useEnhanced: true,
            },
            audio: {
              content: base64Data,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Speech-to-Text API Error:', errorData);
        throw new Error(`APIエラー: ${errorData.error?.message || '不明なエラー'}`);
      }

      console.log(`チャンク ${i + 1} のAPIレスポンス受信`);
      const data = await response.json();
      console.log('APIレスポンス:', data);

      if (data.results && data.results.length > 0) {
        const timestamp = new Date().toLocaleTimeString();
        const transcription = data.results
          .map((result: any) => result.alternatives[0].transcript)
          .join('\n');
        console.log(`チャンク ${i + 1} の文字起こし結果:`, transcription);
        fullTranscription += transcription + '\n';
      } else {
        console.log(`チャンク ${i + 1} の文字起こし結果が空です`);
      }

      // 進捗状況を更新
      if (onProgress) {
        const progress = ((i + 1) / chunks.length) * 100;
        onProgress(progress);
      }
    }

    if (!fullTranscription) {
      console.log('すべてのチャンクの文字起こしが空でした');
      return `文字起こしに失敗しました`;
    }

    console.log('文字起こし完了:', fullTranscription);
    return fullTranscription;

  } catch (error) {
    console.error('Speech-to-Text Error:', error);
    throw error;
  }
}

export async function processAudioFile(
  file: File, 
  apiKey: string,
  onProgress?: (uploadProgress: number, transcriptionProgress: number) => void
): Promise<string> {
  console.log('ファイル処理開始:', file.name, file.type, file.size, 'bytes');
  
  // アップロード進捗を100%に設定
  if (onProgress) {
    onProgress(100, 0);
  }
  
  const blob = new Blob([await file.arrayBuffer()], { type: file.type });
  
  return transcribeAudio(blob, apiKey, (progress) => {
    if (onProgress) {
      onProgress(100, progress);
    }
  });
}
