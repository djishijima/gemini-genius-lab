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

    console.log(`==== チャンク ${chunkIndex + 1}/${totalChunks} のAPIリクエスト送信 ====`);
    console.log(`チャンクのサイズ: ${chunk.size} bytes, タイプ: ${chunk.type}`);
    console.log(`APIキーの最初の5文字: ${apiKey.substring(0, 5)}...`);
    
    // APIキーが有効か確認
    if (apiKey.length < 20) {
      console.warn("警告: APIキーが短すぎるか、正しくない可能性があります");
    }

    // MIMEタイプに基づいて適切なエンコーディングを選択
    let encoding = "LINEAR16";
    if (chunk.type.includes("webm")) {
      encoding = "WEBM_OPUS";
    } else if (chunk.type.includes("ogg")) {
      encoding = "OGG_OPUS";
    } else if (chunk.type.includes("mp3") || chunk.type.includes("mpeg")) {
      encoding = "MP3";
    }
    
    console.log(`選択されたエンコーディング: ${encoding}, チャンクタイプ: ${chunk.type}`);
    
    const requestBody = {
      config: {
        encoding: encoding,
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
    };
    
    console.log("送信するリクエスト:", JSON.stringify(requestBody.config));
    
    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      try {
        const errorData = await response.json();
        console.error("Speech-to-Text API Error:", JSON.stringify(errorData));
        throw new Error(`APIエラー: ${errorData.error?.message || "不明なエラー"}`);
      } catch (jsonError) {
        console.error("API Error (status):", response.status, response.statusText);
        throw new Error(`APIステータスエラー: ${response.status} ${response.statusText}`);
      }
    }

    console.log(`==== チャンク ${chunkIndex + 1} のAPIレスポンス受信 status: ${response.status} ====`);
    const responseText = await response.text();
    console.log(`生のAPIレスポンス: ${responseText}`);
    
    let data: SpeechRecognitionResponse;
    try {
      data = JSON.parse(responseText) as SpeechRecognitionResponse;
      console.log("解析後のAPIレスポンス:", JSON.stringify(data));
    } catch (e) {
      console.error("レスポンスJSONの解析エラー:", e);
      throw new Error(`APIレスポンスがJSONではありません: ${responseText.substring(0, 100)}...`);
    }

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
