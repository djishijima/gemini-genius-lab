import { useState, useCallback, useEffect } from "react";
import type { FC } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { AudioRecorderControls } from "@/components/AudioRecorderControls";
import { TranscriptionProgress } from "@/components/TranscriptionProgress";
import { TranscriptionResult } from "@/components/TranscriptionResult";
import { AudioExportButton } from "@/components/AudioExportButton";
import { handleTranscription } from "@/utils/handleTranscription";

enum RecordingState {
  Idle = 'Idle',
  Recording = 'Recording',
  Paused = 'Paused',
}

const AudioRecorder: FC = () => {
  const [transcription, setTranscription] = useState<string | null>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [pendingTranscription, setPendingTranscription] = useState<string | null>(null);
  const [transcriptionProgress, setTranscriptionProgress] = useState<number>(0);
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.Idle);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const { toast } = useToast();
  const {
    startRecording,
    stopRecording,
    isRecording: recorderIsRecording,
    recordingTime,
  }: {
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    isRecording: boolean;
    recordingTime: number;
  } = useAudioRecorder();

  // 環境変数からAPIキーを取得
  const apiKey = import.meta.env?.VITE_GOOGLE_API_KEY || "YOUR_API_KEY_HERE";
  
  const handleTranscriptionProcess = useCallback(
    async (blob: Blob) => {
      if (!blob || blob.size === 0) {
        toast({
          title: "エラー",
          description: "音声データが空です。録音を再試行してください。",
          variant: "destructive",
        });
        return;
      }

      // 音声データの詳細ログ
      console.log("==== 文字起こし処理開始 ====");
      console.log(`音声データ: type=${blob.type}, size=${blob.size} bytes`);
      console.log(`APIキー: ${apiKey ? `${apiKey.substring(0, 5)}...` : '未設定'}`);
      
      setIsProcessing(true);
      setTranscription(null); // クリア

      try {
        // 引数を明示的にログ出力
        console.log("文字起こし関数呼び出し:");
        
        const result = await handleTranscription(blob, {
          apiKey,
          onProgress: (progress: number) => {
            console.log("文字起こし進捗:", progress);
            setTranscriptionProgress(progress);
          },
          onTranscriptionChange: (text: string) => {
            console.log(`文字起こし結果更新: "${text}", 長さ: ${text.length}`);
            setTranscription(text);
          },
          onProcessingStateChange: (state: boolean) => {
            console.log(`処理状態変更: ${state}`);
            setIsProcessing(state);
          },
          onTranscribingStateChange: (state: boolean) => {
            console.log(`文字起こし状態変更: ${state}`);
            setIsTranscribing(state);
          },
        });
        
        console.log(`文字起こし完了、結果: ${result ? "成功" : "空の結果"}`);
      } catch (error) {
        console.error(`文字起こしエラー: ${error}`);
        toast({
          title: "文字起こしエラー",
          description:
            error instanceof Error ? error.message : "文字起こし中にエラーが発生しました",
          variant: "destructive",
        });
        setIsProcessing(false);
        setIsTranscribing(false);
      }
    },
    [toast],
  );

  const handleRecording = useCallback(async () => {
    try {
      await startRecording();
      setIsRecording(true);

      // WebAudioAPIとMediaStreamを取得するための処理
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });
        setAudioStream(stream);
        console.log("マイクストリームを取得しました", stream.id);
      } catch (micError) {
        console.error("マイク取得エラー:", micError);
        toast({
          title: "マイクエラー",
          description: String(micError),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "録音エラー",
        description: String(error),
        variant: "destructive",
      });
    }
  }, [startRecording, toast]);

  const onStopRecording = useCallback(async () => {
    try {
      await stopRecording();
      setIsRecording(false);
    } catch (error) {
      toast({
        title: "Stop Recording Error",
        description: String(error),
        variant: "destructive",
      });
    }
  }, [stopRecording, toast]);

  useEffect(() => {
    if (!recorderIsRecording || !audioStream) return;
    
    console.log("MediaRecorder設定開始", audioStream.id);
    const chunks: BlobPart[] = [];
    
    // 最適なMIMEタイプを見つけるための優先順位リスト
    const mimeOptions = [
      { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 128000 },
      { mimeType: 'audio/webm', audioBitsPerSecond: 128000 },
      { mimeType: 'audio/ogg;codecs=opus', audioBitsPerSecond: 128000 },
      { mimeType: 'audio/mp4', audioBitsPerSecond: 128000 },
      { mimeType: 'audio/ogg', audioBitsPerSecond: 128000 }
    ];
    
    let mediaRecorder: MediaRecorder;
    let selectedOptions = {};
    
    try {
      // 各MIMEタイプを試してサポートされているものを見つける
      for (const opt of mimeOptions) {
        if (MediaRecorder.isTypeSupported(opt.mimeType)) {
          selectedOptions = opt;
          console.log(`サポートされているMIMEタイプを使用: ${opt.mimeType}`);
          break;
        }
      }
      
      // 選択されたオプションでMediaRecorderを作成
      mediaRecorder = new MediaRecorder(audioStream, selectedOptions);
      console.log("MediaRecorder created with options:", selectedOptions);
      console.log("Actual MIME type being used:", mediaRecorder.mimeType);
      
      // マイク入力レベルを確認するためのメーター
      const audioContext = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(audioStream);
      microphone.connect(analyser);
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // 音声レベルのログを定期的に出力
      const logAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        console.log(`マイク音声レベル: ${average.toFixed(2)}`);
        
        if (mediaRecorder.state === "recording") {
          setTimeout(logAudioLevel, 1000);
        }
      };
      
      logAudioLevel();
    } catch (error) {
      console.error("MediaRecorder creation error:", error);
      // 最終手段としてデフォルト設定を使用
      mediaRecorder = new MediaRecorder(audioStream);
    }
    
    mediaRecorder.ondataavailable = (event) => {
      console.log("MediaRecorder data available:", event.data.size, "bytes", "type:", event.data.type);
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      console.log("MediaRecorder stopped, processing chunks:", chunks.length);
      if (chunks.length > 0) {
        // 明示的にMIMEタイプを指定
        const mimeType = mediaRecorder.mimeType || 'audio/webm;codecs=opus';
        console.log("Using MIME type for blob:", mimeType);
        const blob = new Blob(chunks, { type: mimeType });
        console.log("Created blob:", blob.type, blob.size, "bytes");
        setAudioBlob(blob);
        handleTranscriptionProcess(blob);
      } else {
        console.error("録音データがありません");
        toast({
          title: "録音エラー",
          description: "録音データを取得できませんでした",
          variant: "destructive",
        });
      }
    };

    // 短いタイムスライスで頻繁にデータを取得 - 一部のブラウザでは長いスライスが問題になることがある
    mediaRecorder.start(1000);
    console.log("MediaRecorder started with timeslice 1000ms, MIME type:", mediaRecorder.mimeType);
    
    // 定期的に録音状態を確認し、データをリクエスト
    const checkInterval = setInterval(() => {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        console.log("MediaRecorder check - state:", mediaRecorder.state);
        // 中間データをリクエスト（データが実際に記録されていることを確認）
        mediaRecorder.requestData();
      } else {
        clearInterval(checkInterval);
      }
    }, 2000);
    
    // コンソールに明示的な指示を表示
    console.warn('重要: マイクに向かって話してください。音声が検出されているか確認します。');

    setMediaRecorder(mediaRecorder);

    return () => {
      console.log("Cleaning up MediaRecorder");
      mediaRecorder.stop();
    };
  }, [recorderIsRecording, audioStream, handleTranscriptionProcess, toast]);

  useEffect(() => {
    if (pendingTranscription && audioBlob && audioBlob.size > 0) {
      console.log("Pending transcription with valid audio blob, processing now");
      handleTranscriptionProcess(audioBlob);
      setPendingTranscription(null);
    }
  }, [audioBlob, pendingTranscription, handleTranscriptionProcess]);

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>音声文字起こし</CardTitle>
          <CardDescription>音声を録音してリアルタイムで文字起こしを行います。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/20 p-3 rounded-lg border border-muted-foreground/30">
            <h3 className="text-sm font-medium mb-2">ステータス</h3>
            <div className="flex items-center space-x-2 text-sm">
              <span className="font-semibold">マイク:</span>
              <span className={`${audioStream ? 'text-green-500' : 'text-red-500'}`}>
                {audioStream ? '接続中' : '未接続'}
              </span>
              {recorderIsRecording && (
                <span className="ml-4 flex items-center">
                  <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse mr-2" />
                  <span className="text-red-500 font-medium">録音進行中</span>
                </span>
              )}
            </div>
          </div>
          
          <AudioRecorderControls
            isRecording={recorderIsRecording}
            recordingTime={recordingTime || 0}
            amplitude={0} // amplitude is not used
            audioStream={audioStream}
            isProcessing={isProcessing}
            isTranscribing={isTranscribing}
            onStartRecording={handleRecording}
            onStopRecording={onStopRecording}
            onFileInputClick={() => {}} // 使用しない機能
          />

          <TranscriptionProgress
            isProcessing={isProcessing}
            isTranscribing={isTranscribing}
            uploadProgress={0} // ファイルアップロードは使用しない
            transcriptionProgress={transcriptionProgress}
          />

          {audioBlob && !recorderIsRecording && (
            <AudioExportButton audioBlob={audioBlob} isDisabled={isProcessing || isTranscribing} />
          )}

          <TranscriptionResult transcription={transcription} isTranscribing={isTranscribing} />
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-xs text-muted-foreground">
            Gemini Genius Lab - 音声文字起こしツール v{APP_VERSION}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export const APP_VERSION = "1.7.0"; // 2025-03-06 録音視覚的フィードバック強化

export default AudioRecorder;
