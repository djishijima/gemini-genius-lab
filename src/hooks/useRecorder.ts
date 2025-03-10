import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

interface UseRecorderOptions {
  onRecordingStatusChange?: (isRecording: boolean) => void;
}

export function useRecorder(options?: UseRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const { toast } = useToast();

  // Reset audio blob when starting a new recording
  useEffect(() => {
    if (isRecording) {
      setAudioBlob(null);
      setRecordingError(null);
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      // Stop any existing recording
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }

      // Clean up any existing audio stream
      if (audioStream) {
        for (const track of audioStream.getTracks()) {
          track.stop();
        }
        setAudioStream(null);
      }

      // Clear previous recording data
      setAudioBlob(null);
      setRecordingError(null);
      audioChunksRef.current = [];

      console.log("マイクへのアクセスを要求中...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      console.log("マイクへのアクセスが許可されました");

      setAudioStream(stream);

      if (!window.MediaRecorder) {
        throw new Error("お使いのブラウザはMediaRecorderをサポートしていません");
      }

      // 明示的にオーディオコーデックを指定したMIMEタイプを使用する
      let mimeType = "";
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
        "audio/ogg"
      ];
      
      // ブラウザがサポートする最初のフォーマットを使用
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log(`サポートされているMIMEタイプを発見: ${type}`);
          break;
        }
      }
      
      const recorderOptions = mimeType ? { mimeType } : {};
      console.log(`使用する録音フォーマット: ${mimeType}`);

      const recorder = new MediaRecorder(stream, recorderOptions);
      console.log("MediaRecorderが作成されました:", recorder.state);

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        console.log("データ取得:", event.data.size, "bytes");
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder エラー:", event);
        setRecordingError("録音中にエラーが発生しました");
        toast({
          title: "録音エラー",
          description: "録音中にエラーが発生しました",
          variant: "destructive",
        });
      };

      recorder.onstop = () => {
        console.log("録音停止 - チャンク数:", audioChunksRef.current.length);
        setIsRecording(false);

        if (options?.onRecordingStatusChange) {
          options.onRecordingStatusChange(false);
        }

        if (audioChunksRef.current.length === 0) {
          console.error("録音データが空です");
          setRecordingError("録音データが取得できませんでした");
          toast({
            title: "エラー",
            description: "録音データが取得できませんでした",
            variant: "destructive",
          });
          return;
        }

        try {
          // 録音機の実際MIMEタイプを使用
          const blobType = mediaRecorderRef.current?.mimeType || mimeType || "audio/webm;codecs=opus";
          console.log(`使用するBlobタイプ: ${blobType}`);
          const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
          console.log("録音データサイズ:", audioBlob.size, "bytes", "タイプ:", audioBlob.type);

          // Verify the audio blob is valid
          if (audioBlob.size === 0) {
            console.error("録音ブロブが空です");
            setRecordingError("録音データが空です");
            toast({
              title: "エラー",
              description: "録音データが空です",
              variant: "destructive",
            });
            return;
          }

          // Add a small delay to ensure the blob is fully processed
          setTimeout(() => {
            if (audioBlob.size > 0) {
              console.log("有効な録音ブロブを設定します");
              setAudioBlob(audioBlob);
            } else {
              console.error("録音ブロブが空です");
              setRecordingError("録音データが空です");
              toast({
                title: "エラー",
                description: "録音データが空です",
                variant: "destructive",
              });
            }
          }, 100);
        } catch (error) {
          console.error("Blob作成エラー:", error);
          setRecordingError("録音データの処理中にエラーが発生しました");
          toast({
            title: "エラー",
            description: "録音データの処理中にエラーが発生しました",
            variant: "destructive",
          });
        }
      };

      console.log("録音を開始します...");
      // 録音データの品質向上のためにタイムスライスを大きく設定
      recorder.start(3000); // より長いタイムスライスでデータの品質を向上
      console.log("録音状態:", recorder.state, "、MIMEタイプ:", recorder.mimeType);

      setIsRecording(true);
      if (options?.onRecordingStatusChange) {
        options.onRecordingStatusChange(true);
      }
    } catch (error) {
      console.error("Error starting recording:", error);
      setRecordingError(error instanceof Error ? error.message : "録音の開始に失敗しました");
      toast({
        title: "エラー",
        description: `録音の開始に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
        variant: "destructive",
      });
    }
  };

  const stopRecording = useCallback(() => {
    console.log("録音を停止します...");

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        if (mediaRecorderRef.current.state === "recording") {
          // Request final data
          mediaRecorderRef.current.requestData();
          // Then stop the recorder
          mediaRecorderRef.current.stop();
          console.log("MediaRecorder停止リクエスト送信");
        }
      } catch (error) {
        console.error("録音停止エラー:", error);
        setRecordingError("録音の停止中にエラーが発生しました");
        toast({
          title: "エラー",
          description: "録音の停止中にエラーが発生しました",
          variant: "destructive",
        });
      }
    } else {
      console.warn("MediaRecorderが存在しないか、すでに停止しています");
    }
  }, [toast]);

  return {
    isRecording,
    audioBlob,
    audioStream,
    recordingError,
    startRecording,
    stopRecording,
    setAudioBlob,
  };
}
