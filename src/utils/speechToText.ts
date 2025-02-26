
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
        String.fromCharCode.apply(null, new Uint8Array(buffer) as any)
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
      const data: SpeechRecognitionResponse = await response.json();
      console.log('APIレスポンス:', data);

      if (data.results?.length > 0) {
        const transcription = data.results
          .map(result => result.alternatives[0].transcript)
          .join('\n');
        console.log(`チャンク ${i + 1} の文字起こし結果:`, transcription);
        fullTranscription += transcription + '\n';
      } else {
        console.log(`チャンク ${i + 1} の文字起こし結果が空です`);
        throw new Error('音声認識結果が空でした。より明確な音声で再度お試しください。');
      }

      if (onProgress) {
        const progress = ((i + 1) / chunks.length) * 100;
        onProgress(progress);
      }
    }

    if (!fullTranscription.trim()) {
      throw new Error('文字起こしに失敗しました。音声が明確でないか、ノイズが多い可能性があります。');
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
  
  if (onProgress) {
    onProgress(0, 0);
  }
  
  try {
    // ファイルの読み込みを進捗表示
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress, 0);
        }
      };
      reader.readAsArrayBuffer(file);
    });

    if (onProgress) {
      onProgress(100, 0);
    }

    const blob = new Blob([arrayBuffer], { type: file.type });
    return transcribeAudio(blob, apiKey, (progress) => {
      if (onProgress) {
        onProgress(100, progress);
      }
    });
  } catch (error) {
    console.error('File Processing Error:', error);
    throw error;
  }
}
