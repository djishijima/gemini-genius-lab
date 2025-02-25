
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
  const chunks: Blob[] = [];
  const totalDuration = audioBlob.size / (48000 * 2); // Approximate duration in seconds
  const chunkSize = (chunkDuration * 48000 * 2); // 48kHz, 16-bit

  for (let start = 0; start < audioBlob.size; start += chunkSize) {
    const end = Math.min(start + chunkSize, audioBlob.size);
    const chunk = audioBlob.slice(start, end);
    chunks.push(chunk);
  }

  return chunks;
}

export async function transcribeAudio(audioBlob: Blob, apiKey: string): Promise<string> {
  try {
    const chunks = await splitAudioIntoChunks(audioBlob);
    let fullTranscription = '';

    for (const chunk of chunks) {
      const buffer = await chunk.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(buffer)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const response = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config: {
              encoding: 'WEBM_OPUS',
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
        const timestamp = new Date().toLocaleTimeString();
        return `[${timestamp}] APIエラー: ${errorData.error?.message || '不明なエラー'}`;
      }

      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const timestamp = new Date().toLocaleTimeString();
        const transcription = data.results
          .map((result: any) => result.alternatives[0].transcript)
          .join('\n');
        fullTranscription += `[${timestamp}] ${transcription}\n`;
      }
    }

    return fullTranscription || `[${new Date().toLocaleTimeString()}] 文字起こしに失敗しました`;

  } catch (error) {
    console.error('Speech-to-Text Error:', error);
    const timestamp = new Date().toLocaleTimeString();
    return `[${timestamp}] エラー: ${error instanceof Error ? error.message : '不明なエラー'}`;
  }
}

export async function processAudioFile(file: File, apiKey: string): Promise<string> {
  const blob = new Blob([await file.arrayBuffer()], { type: file.type });
  return transcribeAudio(blob, apiKey);
}
