
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
    const buffer = await audioBlob.arrayBuffer();
    const base64Data = btoa(
      new Uint8Array(buffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-001:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: 'audio/webm'
                }
              },
              {
                text: `
                この音声を文字起こしして、以下のフォーマットで出力してください：
                - タイムスタンプ付きで
                - 話者が複数いる場合は、話者A、話者B等で区別してください
                `
              }
            ]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API Error: ${JSON.stringify(errorData)}`);
    }

    const result: GeminiResponse = await response.json();
    const text = result.candidates[0]?.content?.parts[0]?.text;
    return text || '文字起こしに失敗しました';

  } catch (error) {
    console.error('Gemini Transcription Error:', error);
    throw error;
  }
}

export async function processAudioFile(file: File, apiKey: string): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const base64Data = btoa(
      new Uint8Array(buffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-001:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: file.type
                }
              },
              {
                text: `
                この音声を文字起こしして、以下のフォーマットで出力してください：
                - タイムスタンプ付きで
                - 話者が複数いる場合は、話者A、話者B等で区別してください
                `
              }
            ]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API Error: ${JSON.stringify(errorData)}`);
    }

    const result: GeminiResponse = await response.json();
    const text = result.candidates[0]?.content?.parts[0]?.text;
    return text || '文字起こしに失敗しました';

  } catch (error) {
    console.error('Gemini File Processing Error:', error);
    throw error;
  }
}
