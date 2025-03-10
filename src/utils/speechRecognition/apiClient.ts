import type { SpeechRecognitionResult } from "./types";

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
    
    // バイナリデータをBase64にエンコード - より安全な方法を使用
    const buffer = await chunk.arrayBuffer();
    // バイナリデータを安全にBase64に変換する改良版手法
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    let binary = '';
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Data = window.btoa(binary);
    
    // 空のデータでないか確認
    if (base64Data.length < 10) {
      console.error("エラー: Base64データが非常に短いです。オーディオデータが正しく取得できていない可能性があります。");
      throw new Error("オーディオデータを正しく処理できませんでした。空のデータか不正な形式です。");
    }

    console.log(`==== チャンク ${chunkIndex + 1}/${totalChunks} のAPIリクエスト送信 ====`);
    console.log(`チャンクのサイズ: ${chunk.size} bytes, タイプ: ${chunk.type}`);
    console.log(`APIキーの最初の5文字: ${apiKey.substring(0, 5)}...`);
    
    // APIキーが有効か確認
    if (apiKey.length < 20) {
      console.warn("警告: APIキーが短すぎるか、正しくない可能性があります");
    }

    // MIMEタイプに基づいて正確なエンコーディングを選択
    let encoding = "LINEAR16";
    if (chunk.type.includes("webm") && chunk.type.includes("opus")) {
      encoding = "WEBM_OPUS";
    } else if (chunk.type.includes("webm")) {
      // WebMでもcodecが指定されていない場合は別のエンコーディングを試す
      encoding = "WEBM_OPUS"; // WebMの場合はほとんどOPUSコーデックを使用
    } else if (chunk.type.includes("ogg") && chunk.type.includes("opus")) {
      encoding = "OGG_OPUS";
    } else if (chunk.type.includes("ogg")) {
      encoding = "OGG_OPUS"; // OGGの場合もOPUSが一般的
    } else if (chunk.type.includes("mp3") || chunk.type.includes("mpeg")) {
      encoding = "MP3";
    } else if (chunk.type === "audio/wav" || chunk.type === "audio/x-wav") {
      encoding = "LINEAR16";
    }
    
    // ブラウザによってはtype属性が正確でない場合があるため、追加チェック
    if (chunk.size > 0 && !chunk.type) {
      console.warn("警告: Blobのタイプが設定されていません。デフォルトのWEBM_OPUSを使用します。");
      encoding = "WEBM_OPUS"; // 最も一般的なフォーマットをデフォルトとして使用
    }
    
    console.log(`選択されたエンコーディング: ${encoding}, チャンクタイプ: ${chunk.type || '不明'}, サイズ: ${chunk.size}バイト`);
    
    // エンコーディングに基づいて適切なサンプルレートを設定
    let sampleRateHertz = 16000; // デフォルト値
    
    if (encoding === "WEBM_OPUS" || encoding === "OGG_OPUS") {
      sampleRateHertz = 48000; // Opusコーデックの一般的なサンプルレート
    } else if (encoding === "MP3") {
      sampleRateHertz = 44100; // MP3の一般的なサンプルレート
    }
    
    // サンプルレートの情報をログに記録
    console.log(`使用するサンプルレート: ${sampleRateHertz}Hz`);
    
    const requestBody = {
      config: {
        encoding: encoding,
        sampleRateHertz: sampleRateHertz,
        languageCode: "ja-JP",
        audioChannelCount: 1,
        enableSeparateRecognitionPerChannel: false,
        enableAutomaticPunctuation: true,
        model: "default",
        // 無効なパラメータを削除
        // useEnhanced: true, // APIエラーの原因になる可能性がある
      },
      audio: {
        content: base64Data,
      },
    };
    
    console.log("送信するリクエスト:", JSON.stringify(requestBody.config));
    
    try {
      console.log('Starting transcription process');
      const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.error(`API request failed with status: ${response.status}`);
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API response:', data);
      
      const results = data.results; 
      if (results && results.length > 0) { 
        const firstResult = results[0]; 
        const alternatives = firstResult.alternatives; 
        if (alternatives && alternatives.length > 0) {
          // 結果があり、少なくとも1つの認識結果に代替テキストがある場合
          const transcript = alternatives
            .filter(alternative => alternative.transcript.trim() !== "")
            .map(alternative => alternative.transcript)
            .join("\n");
          
          if (transcript.trim() !== "") {
            console.log(`認識テキスト: "${transcript}"`); 
            return transcript;
          }
        }
      }
      
      // 結果が空の場合のより詳細なエラーメッセージ
      if (!results || results.length === 0) {
        console.warn("警告: APIから結果が返されませんでした。音声が認識できなかった可能性があります。");
      } else if (!results.some(result => result.alternatives?.length > 0)) {
        console.warn("警告: 認識結果に代替テキストがありません。音声が明確でない可能性があります。");
      } else {
        console.warn("警告: APIからの結果が不完全です。", JSON.stringify(data));
      }
      
      return "";
    } catch (error) {
      console.error('Error during API request:', error);
      throw error;
    }
  } catch (error) {
    console.error(`チャンク ${chunkIndex + 1} の処理中にエラー:`, error);
    throw error;
  }
}
