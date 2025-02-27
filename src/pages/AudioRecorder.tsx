import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Mic,
  StopCircle,
  Upload,
  RefreshCw,
  Loader2,
  ClipboardCopy
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { AudioWaveform } from '@/components/AudioWaveform';
import { transcribeAudio, processFile } from '@/utils/speechToText';

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(remainingSeconds).padStart(2, '0');
  return `${formattedMinutes}:${formattedSeconds}`;
}

export default function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [amplitude, setAmplitude] = useState(0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [audioFileName, setAudioFileName] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const { toast } = useToast();

  // APIキーを設定
  const API_KEY = 'AIzaSyB3e3yEOKECnlDtivhi_jPxOpepk8wo6jE';

  const startRecording = async () => {
    try {
      // マイクへのアクセス許可を明示的に確認
      console.log("マイクへのアクセスを要求中...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      console.log("マイクへのアクセスが許可されました");
      
      setAudioStream(stream);
      
      // MediaRecorderのサポート確認
      if (!window.MediaRecorder) {
        throw new Error("お使いのブラウザはMediaRecorderをサポートしていません");
      }
      
      const recorder = new MediaRecorder(stream);
      console.log("MediaRecorderが作成されました:", recorder.state);
      
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      // オーディオ解析の設定
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // 音量の計算
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const calculateAmplitude = () => {
        if (!isRecording) return;
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, value) => acc + value, 0);
        const avg = sum / dataArray.length;
        setAmplitude(avg / 128.0); // 0-1の範囲に正規化
        requestAnimationFrame(calculateAmplitude);
      };
      calculateAmplitude();

      // イベントリスナーの設定
      recorder.ondataavailable = (event) => {
        console.log("データ取得:", event.data.size, "bytes");
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder エラー:", event);
        toast({
          title: "録音エラー",
          description: "録音中にエラーが発生しました",
          variant: "destructive"
        });
      };

      recorder.onstop = () => {
        console.log("録音停止");
        setIsRecording(false); // ここで録音状態を変更する
        if (audioChunksRef.current.length === 0) {
          toast({
            title: "エラー",
            description: "録音データが取得できませんでした",
            variant: "destructive"
          });
          return;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log("録音データサイズ:", audioBlob.size, "bytes");
        setAudioBlob(audioBlob);
        setIsProcessing(true);
        handleTranscription(audioBlob);
      };

      // 録音開始
      console.log("録音を開始します...");
      recorder.start(1000); // 1秒ごとにデータを取得
      console.log("録音状態:", recorder.state);
      
      setIsRecording(true);
      setRecordingTime(0);

    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "エラー",
        description: `録音の開始に失敗しました: ${error.message || "不明なエラー"}`,
        variant: "destructive"
      });
    }
  };

  // useCallbackを使用してstopRecording関数をメモ化
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      
      if (audioStream) {
        for (const track of audioStream.getTracks()) {
          track.stop();
        }
        setAudioStream(null);
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      setAmplitude(0);
      // 録音状態をここではまだ変更しない（onstopイベントで変更する）
    }
  }, [audioStream]);

  const handleTranscription = async (blob: Blob) => {
    setIsTranscribing(true);
    setTranscriptionProgress(10); // 初期値を10%に設定
    setTranscription(''); // 文字起こし結果をクリア
    
    try {
      await transcribeAudio(
        blob, 
        API_KEY, 
        (progress) => {
          setTranscriptionProgress(progress);
        },
        (partialText, isFinal) => {
          // 部分的な文字起こし結果を表示
          setTranscription(prev => {
            if (isFinal) {
              return `${prev}${partialText}\n\n`;
            } else {
              return `${prev}${partialText}\n`;
            }
          });
        }
      );
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "文字起こしエラー",
        description: error instanceof Error ? error.message : "文字起こし中にエラーが発生しました",
        variant: "destructive"
      });
    } finally {
      setIsTranscribing(false);
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック (100MB制限)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "ファイルサイズエラー",
        description: "ファイルサイズは100MB以下にしてください",
        variant: "destructive"
      });
      return;
    }

    // サポートされているファイル形式チェック
    const supportedTypes = ['audio/mp3', 'audio/wav', 'audio/webm', 'audio/m4a', 'audio/ogg', 'audio/mpeg'];
    if (!supportedTypes.includes(file.type) && !file.name.endsWith('.mp3') && !file.name.endsWith('.wav') && 
        !file.name.endsWith('.webm') && !file.name.endsWith('.m4a') && !file.name.endsWith('.ogg')) {
      toast({
        title: "ファイル形式エラー",
        description: "サポートされているファイル形式: MP3, WAV, WEBM, M4A, OGG",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setUploadProgress(10); // 初期値を10%に設定
    setTranscriptionProgress(0);
    setTranscription(''); // 文字起こし結果をクリア
    setUploadedFileName(file.name);

    // アップロード進捗のシミュレーション
    let progress = 10;
    const uploadTimer = setInterval(() => {
      progress += 5;
      if (progress > 90) {
        progress = 90;
        clearInterval(uploadTimer);
      }
      setUploadProgress(progress);
    }, 100);

    // 少し遅延させて処理開始の感覚を出す
    setTimeout(() => {
      clearInterval(uploadTimer);
      setUploadProgress(100);
      
      // 文字起こし処理を開始
      const audioBlob = new Blob([file], { type: file.type });
      handleTranscription(audioBlob);
    }, 1000);
  };

  const handleAudioExport = () => {
    if (audioBlob) {
      const url = window.URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${new Date().toISOString()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  // コンポーネントのマウント時とアンマウント時の処理
  useEffect(() => {
    // クリーンアップ関数
    return () => {
      // インターバルをクリア
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // 録音を停止
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      
      // オーディオストリームを停止
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      
      // オーディオコンテキストを閉じる
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioStream]);

  // 録音時間の更新
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    
    if (isRecording) {
      // 録音中は1秒ごとに録音時間を更新
      timer = setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);
    } else {
      // 録音停止時はタイマーをクリア
      if (timer) {
        clearInterval(timer);
      }
    }
    
    // クリーンアップ関数
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isRecording]);

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>音声文字起こし</CardTitle>
          <CardDescription>
            音声を録音するか、音声ファイルをアップロードして文字起こしを行います。
            対応ファイル形式: MP3, WAV, WEBM, M4A, OGG（最大100MB）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4 p-6 border rounded-lg bg-muted/10">
            {isRecording ? (
              <div className="w-full space-y-4">
                {isRecording && (
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-red-500 font-medium">録音中</span>
                    <span className="ml-2 font-mono text-lg">{formatTime(recordingTime)}</span>
                  </div>
                )}
                {isRecording && audioStream && (
                  <div className="mt-4 h-24 bg-muted/20 rounded-md overflow-hidden">
                    <AudioWaveform audioStream={audioStream} />
                  </div>
                )}
                <div className="w-full space-y-4">
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={stopRecording}
                    className="w-full max-w-md mx-auto"
                    disabled={isProcessing || isTranscribing}
                  >
                    <StopCircle className="mr-2 h-5 w-5" />
                    録音を停止
                  </Button>
                </div>
              </div>
            ) : (
              <div className="w-full space-y-4">
                <Button
                  size="lg"
                  variant="default"
                  onClick={startRecording}
                  className="w-full max-w-md mx-auto"
                  disabled={isProcessing || isTranscribing}
                >
                  <Mic className="mr-2 h-5 w-5" />
                  録音を開始
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/mp3,audio/wav,audio/webm,audio/m4a,audio/ogg,audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
              disabled={isRecording || isProcessing || isTranscribing}
            >
              <Upload className="mr-2 h-4 w-4" />
              音声ファイルをアップロード
            </Button>
          </div>

          {(isProcessing || isTranscribing) && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
              <p className="text-sm font-medium text-center">
                {isTranscribing ? "文字起こし処理中..." : "ファイル処理中..."}
                {transcriptionProgress > 0 && transcriptionProgress < 100 && ` (${Math.round(transcriptionProgress)}%)`}
              </p>
              {isProcessing && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">ファイルアップロード</Label>
                    <Progress value={uploadProgress} />
                    <p className="text-xs text-muted-foreground text-right">{Math.round(uploadProgress)}%</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">文字起こし</Label>
                    <Progress value={transcriptionProgress} />
                    <p className="text-xs text-muted-foreground text-right">{Math.round(transcriptionProgress)}%</p>
                  </div>
                </>
              )}
              {isTranscribing && (
                <div className="space-y-2">
                  <Label className="text-sm">文字起こし</Label>
                  <Progress value={transcriptionProgress} />
                  <p className="text-xs text-muted-foreground text-right">{Math.round(transcriptionProgress)}%</p>
                </div>
              )}
            </div>
          )}
          {isTranscribing && (
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-md">
              <div className="flex items-center mb-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                <span className="text-lg font-semibold text-blue-500">文字起こし中...</span>
              </div>
              <Progress value={transcriptionProgress} className="h-2 mb-2" />
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {transcriptionProgress}% 完了
              </p>
            </div>
          )}
          {isProcessing && !isTranscribing && (
            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
              <div className="flex items-center mb-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500 mr-2"></div>
                <span className="text-lg font-semibold text-yellow-500">ファイル処理中...</span>
              </div>
              <Progress value={uploadProgress} className="h-2 mb-2" />
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                {uploadProgress}% 完了
              </p>
            </div>
          )}
          {audioBlob && !isRecording && (
            <Button
              variant="secondary"
              onClick={handleAudioExport}
              className="w-full"
              disabled={isProcessing || isTranscribing}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              音声をエクスポート
            </Button>
          )}

          {transcription && (
            <div className="mt-6 p-4 border rounded-lg bg-card">
              <h3 className="text-lg font-semibold mb-2">文字起こし結果</h3>
              <div className="max-h-60 overflow-y-auto whitespace-pre-wrap bg-muted p-3 rounded text-sm">
                {isTranscribing && <div className="text-primary animate-pulse">文字起こし中...</div>}
                {transcription}
              </div>
              <div className="flex justify-end mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(transcription);
                    toast({
                      title: "コピー完了",
                      description: "文字起こし結果をクリップボードにコピーしました",
                    });
                  }}
                >
                  <ClipboardCopy className="h-4 w-4 mr-2" />
                  コピー
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-xs text-muted-foreground">
            Gemini Genius Lab - 音声文字起こしツール v{APP_VERSION}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

// バージョン情報
export const APP_VERSION = "1.0.3"; // 2025-02-28 リリース - importエラーの修正
