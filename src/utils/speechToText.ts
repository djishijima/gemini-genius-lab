
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

// オーディオをチャンクに分割する関数
async function splitAudioIntoChunks(audioBlob: Blob, chunkDuration = 45): Promise<Blob[]> {
  console.log('元の音声データサイズ:', audioBlob.size, 'bytes');
  const chunks: Blob[] = [];

  // チャンクサイズの計算
  const sampleRate = 44100;
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

// transcribeAudio関数
export async function transcribeAudio(
  audioBlob: Blob, 
  apiKey: string,
  onProgress?: (progress: number) => void,
  onPartialResult?: (text: string, isFinal: boolean) => void
): Promise<string> {
  try {
    console.log('音声文字起こし開始', audioBlob.type, audioBlob.size);
    
    // 進捗状況の初期化
    if (onProgress) {
      onProgress(10);
    }
    
    // ファイルサイズのチェック
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    if (audioBlob.size > MAX_FILE_SIZE) {
      throw new Error(`ファイルサイズが大きすぎます（${(audioBlob.size / (1024 * 1024)).toFixed(2)}MB）。100MB以下のファイルを使用してください。`);
    }
    
    // WebM形式をWAV形式に変換
    console.log('音声データをWAV形式に変換中...');
    let processedBlob = audioBlob;
    try {
      processedBlob = await convertAudioToWav(audioBlob);
      console.log('WAV変換完了:', processedBlob.size, 'bytes');
    } catch (error) {
      console.error('WAV変換エラー:', error);
      throw new Error(`音声データの変換に失敗しました: ${error.message}`);
    }
    
    if (onProgress) {
      onProgress(30);
    }
    
    // 小さなファイルの場合は分割せずに処理
    if (processedBlob.size < 1024 * 1024) { // 1MB未満
      console.log('小さいファイルなので直接処理します');
      const transcription = await processAudioChunk(processedBlob, apiKey, 0, 1);
      if (onPartialResult) {
        onPartialResult(transcription, true);
      }
      if (onProgress) {
        onProgress(100);
      }
      return transcription;
    }
    
    // audioBlob自体をチャンクに分割する
    console.log('ファイルサイズが大きいため分割処理を行います');
    const chunks = await splitAudioIntoChunks(processedBlob);
    
    if (chunks.length === 0) {
      throw new Error('音声データを処理できませんでした。');
    }

    let fullTranscription = '';

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`チャンク ${i + 1}/${chunks.length} の処理開始:`, chunk.size, 'bytes');
      
      // 進捗状況の更新
      if (onProgress) {
        const progress = 30 + ((i / chunks.length) * 60);
        onProgress(Math.round(progress));
      }
      
      const transcription = await processAudioChunk(chunk, apiKey, i, chunks.length);
      console.log(`チャンク ${i + 1} の文字起こし結果:`, transcription);
      
      if (transcription) {
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

// 個々のオーディオチャンクを処理する関数
async function processAudioChunk(
  chunk: Blob, 
  apiKey: string,
  chunkIndex: number,
  totalChunks: number
): Promise<string> {
  try {
    // バイナリデータをBase64にエンコード
    const buffer = await chunk.arrayBuffer();
    const base64Data = btoa(
      new Uint8Array(buffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    console.log(`チャンク ${chunkIndex + 1}/${totalChunks} のAPIリクエスト送信`);
    
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
            sampleRateHertz: 44100,
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

    console.log(`チャンク ${chunkIndex + 1} のAPIレスポンス受信`);
    const data: SpeechRecognitionResponse = await response.json();
    console.log('APIレスポンス:', data);

    if (data.results?.length > 0) {
      return data.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
    }
    
    return '';
  } catch (error) {
    console.error(`チャンク ${chunkIndex + 1} の処理中にエラー:`, error);
    throw error;
  }
}

export async function processFile(
  file: Blob, 
  apiKey: string,
  onProgress?: (progress: number) => void,
  onPartialResult?: (text: string, isFinal: boolean) => void
): Promise<string> {
  console.log('ファイル処理開始:', file.type, file.size, 'bytes');
  
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
    console.error('File Processing Error:', error);
    throw error;
  }
}
