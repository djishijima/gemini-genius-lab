
import { VertexAI } from '@google-cloud/vertexai';

const PROJECT_ID = 'your-project-id'; // ユーザーのプロジェクトIDに置き換える必要があります

export async function transcribeAudio(audioBlob: Blob, apiKey: string): Promise<string> {
  try {
    // Blobをbase64に変換
    const buffer = await audioBlob.arrayBuffer();
    const base64Data = btoa(
      new Uint8Array(buffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const vertexAI = new VertexAI({
      project: PROJECT_ID,
      location: 'us-central1',
      apiKey: apiKey
    });

    const generativeModel = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-flash-001',
    });

    const filePart = {
      file_data: {
        file_content: base64Data,
        mime_type: 'audio/webm',
      },
    };

    const textPart = {
      text: `
      この音声を文字起こしして、以下のフォーマットで出力してください：
      - タイムスタンプ付きで
      - 話者が複数いる場合は、話者A、話者B等で区別してください
      `,
    };

    const request = {
      contents: [{role: 'user', parts: [filePart, textPart]}],
    };

    const response = await generativeModel.generateContent(request);
    const result = await response.response;
    return result.text();

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
      project: PROJECT_ID,
      location: 'us-central1',
      apiKey: apiKey
    });

    const generativeModel = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-flash-001',
    });

    const filePart = {
      file_data: {
        file_content: base64Data,
        mime_type: file.type,
      },
    };

    const textPart = {
      text: `
      この音声を文字起こしして、以下のフォーマットで出力してください：
      - タイムスタンプ付きで
      - 話者が複数いる場合は、話者A、話者B等で区別してください
      `,
    };

    const request = {
      contents: [{role: 'user', parts: [filePart, textPart]}],
    };

    const response = await generativeModel.generateContent(request);
    const result = await response.response;
    return result.text();

  } catch (error) {
    console.error('Gemini File Processing Error:', error);
    throw error;
  }
}
