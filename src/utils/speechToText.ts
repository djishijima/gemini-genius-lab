import { convertAudioToWav } from './audioProcessing';

interface SpeechRecognitionResult {
  alternatives: Array<{
    transcript: string;
    confidence: number;
  }>;
}

interface SpeechRecognitionResponse {
  results?: SpeechRecognitionResult[];
  error?: {
    code: number;
    message: string;
  };
}

// オーディオをチャンクに分割する関数を修正
async function splitAudioIntoChunks(audioBlob: Blob, chunkDuration = 45): Promise<Blob[]> {
  console.log('元の音声データサイズ:', audioBlob.size, 'bytes');
  const chunks: Blob[] = [];

  // チャンクサイズの計算を修正
  const sampleRate = 48000;
  const bytesPerSample = 2;
  const chunkSize = chunkDuration * sampleRate * bytesPerSample;

  console.log('予想される音声の長さ:', audioBlob.size / (sampleRate * bytesPerSample), '秒');
  console.log('チャンクサイズ:', chunkSize, 'bytes');

  // 一度に処理するチャンクを制限
  const maxChunks = 10;
  let chunkCount = 0;

  for (let start = 0; start < audioBlob.size && chunkCount < maxChunks; start += chunkSize) {
    const end = Math.min(start + chunkSize, audioBlob.size);
    const chunk = audioBlob.slice(start, end);
    console.log(`チャンク ${chunks.length + 1} サイズ:`, chunk.size, 'bytes');
    
    try {
      const wavChunk = await convertAudioToWav(chunk);
      console.log(`WAV変換後のチャンク ${chunks.length + 1} サイズ:`, wavChunk.size, 'bytes');
      chunks.push(wavChunk);
      chunkCount++;
    } catch (error) {
      console.error(`チャンク ${chunks.length + 1} の変換に失敗:`, error);
      break;
    }
  }

  console.log('合計チャンク数:', chunks.length);
  return chunks;
}

// 無限再帰を修正したtranscribeAudio関数
export async function transcribeAudio(
  audioBlob: Blob, 
  apiKey: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log('音声文字起こし開始');
    
    // 進捗状況の初期化
    if (onProgress) {
      onProgress(10);
    }
    
    // ファイルサイズのチェック
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    if (audioBlob.size > MAX_FILE_SIZE) {
      throw new Error(`ファイルサイズが大きすぎます（${(audioBlob.size / (1024 * 1024)).toFixed(2)}MB）。100MB以下のファイルを使用してください。`);
    }
    
    // audioBlob自体をチャンクに分割する
    const chunks = await splitAudioIntoChunks(audioBlob);
    
    if (chunks.length === 0) {
      throw new Error('音声データを処理できませんでした。');
    }

    let fullTranscription = '';

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`チャンク ${i + 1}/${chunks.length} の処理開始`);

      // バイナリデータをBase64にエンコード
      const buffer = await chunk.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(buffer)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      console.log(`チャンク ${i + 1} のAPIリクエスト送信`);
      
      // 進捗状況の更新
      if (onProgress) {
        const progress = 10 + ((i / chunks.length) * 80);
        onProgress(Math.round(progress));
      }
      
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
      const data: SpeechRecognitionResponse = await response.json();
      console.log('APIレスポンス:', data);

      if (data.results?.length > 0) {
        const transcription = data.results
          .map(result => result.alternatives[0].transcript)
          .join('\n');
        console.log(`チャンク ${i + 1} の文字起こし結果:`, transcription);
        fullTranscription += `${transcription}\n`;
      } else {
        console.log(`チャンク ${i + 1} の文字起こし結果が空です`);
      }

      if (onProgress) {
        const progress = 10 + ((i + 1) / chunks.length) * 80;
        onProgress(Math.round(progress));
      }
    }

    if (!fullTranscription.trim()) {
      throw new Error('文字起こしに失敗しました。音声が明確でないか、ノイズが多い可能性があります。');
    }

    console.log('文字起こし完了:', fullTranscription);
    
    // 完了時の進捗状況を100%に設定
    if (onProgress) {
      onProgress(100);
    }
    
    return fullTranscription.trim();
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
  
  if (onProgress) {
    onProgress(0, 0);
  }
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    if (onProgress) {
      onProgress(100, 0);
    }

    const blob = new Blob([arrayBuffer], { type: file.type });
    return await transcribeAudio(blob, apiKey, (progress) => {
      if (onProgress) {
        onProgress(100, progress);
      }
    });
  } catch (error) {
    console.error('File Processing Error:', error);
    throw error;
  }
}
