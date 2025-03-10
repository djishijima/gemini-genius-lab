import type { SpeechRecognitionResponse } from "./types";

// 個々のオーディオチャンクを処理する関数
export async function processAudioChunk(
  chunk: Blob,
  apiKey: string,
  chunkIndex: number,
  totalChunks: number,
): Promise<string> {
  try {
    if (!apiKey || apiKey.trim() === "") {
      console.error("APIキーが設定されていません");
      throw new Error("APIキーが設定されていません");
    }
    
    // バイナリデータをBase64にエンコード
    const buffer = await chunk.arrayBuffer();
    const base64Data = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ""),
    );

    console.log(`チャンク ${chunkIndex + 1}/${totalChunks} のAPIリクエスト送信`);
    console.log(`チャンクのサイズ: ${chunk.size} bytes, タイプ: ${chunk.type}`);

    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config: {
            encoding: "WEBM_OPUS",
            sampleRateHertz: 44100,
            languageCode: "ja-JP",
            audioChannelCount: 1,
            enableSeparateRecognitionPerChannel: false,
            enableAutomaticPunctuation: true,
            model: "default",
            useEnhanced: true,
          },
          audio: {
            content: base64Data,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Speech-to-Text API Error:", errorData);
      throw new Error(`APIエラー: ${errorData.error?.message || "不明なエラー"}`);
    }

    console.log(`チャンク ${chunkIndex + 1} のAPIレスポンス受信`);
    const data: SpeechRecognitionResponse = await response.json();
    console.log("APIレスポンス詳細:", JSON.stringify(data));

    if (data.results?.length > 0) {
      return data.results.map((result) => result.alternatives[0].transcript).join("\n");
    }
    
    console.warn("APIからの結果が空です。音声が認識できなかった可能性があります。");
    return "";
  } catch (error) {
    console.error(`チャンク ${chunkIndex + 1} の処理中にエラー:`, error);
    throw error;
  }
}
