
import { VertexAI } from '@google-cloud/vertexai';
import { Content, Part } from '@google-cloud/vertexai';

export async function transcribeAudio(audioBlob: Blob, apiKey: string): Promise<string> {
  try {
    const buffer = await audioBlob.arrayBuffer();
    const base64Data = btoa(
      new Uint8Array(buffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const vertexAI = new VertexAI({
      project: 'your-project-id',
      location: 'us-central1',
      credential: { apiKey }
    });

    const generativeModel = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-flash-001',
    });

    const filePart: Part = {
      inlineData: {
        data: base64Data,
        mimeType: 'audio/webm',
      },
    };

    const textPart: Part = {
      text: `
      この音声を文字起こしして、以下のフォーマットで出力してください：
      - タイムスタンプ付きで
      - 話者が複数いる場合は、話者A、話者B等で区別してください
      `,
    };

    const content: Content = {
      role: 'user',
      parts: [filePart, textPart]
    };

    const response = await generativeModel.generateContent([content]);
    const result = await response.response;
    const text = result.candidates[0].content.parts[0].text;
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

    const vertexAI = new VertexAI({
      project: 'your-project-id',
      location: 'us-central1',
      credential: { apiKey }
    });

    const generativeModel = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-flash-001',
    });

    const filePart: Part = {
      inlineData: {
        data: base64Data,
        mimeType: file.type,
      },
    };

    const textPart: Part = {
      text: `
      この音声を文字起こしして、以下のフォーマットで出力してください：
      - タイムスタンプ付きで
      - 話者が複数いる場合は、話者A、話者B等で区別してください
      `,
    };

    const content: Content = {
      role: 'user',
      parts: [filePart, textPart]
    };

    const response = await generativeModel.generateContent([content]);
    const result = await response.response;
    const text = result.candidates[0].content.parts[0].text;
    return text || '文字起こしに失敗しました';

  } catch (error) {
    console.error('Gemini File Processing Error:', error);
    throw error;
  }
}
