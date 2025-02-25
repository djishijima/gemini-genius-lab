
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export async function transcribeAudio(audioBlob: Blob, apiKey: string): Promise<string> {
  try {
    // Convert audio blob to base64
    const buffer = await audioBlob.arrayBuffer();
    const base64Data = btoa(
      new Uint8Array(buffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // Call Google Cloud Speech-to-Text API
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
          },
          audio: {
            content: base64Data,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Speech-to-Text API Error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const transcription = data.results
        .map((result: any) => result.alternatives[0].transcript)
        .join('\n');
      return transcription;
    }

    return '文字起こしに失敗しました';

  } catch (error) {
    console.error('Speech-to-Text Error:', error);
    throw error;
  }
}

export async function processAudioFile(file: File, apiKey: string): Promise<string> {
  // Reuse the same transcribeAudio function for file processing
  const blob = new Blob([await file.arrayBuffer()], { type: file.type });
  return transcribeAudio(blob, apiKey);
}
