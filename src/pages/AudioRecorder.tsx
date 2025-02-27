import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Download,
  Mic,
  Square,
  Upload,
} from "lucide-react";
import { AudioWaveform } from '@/components/AudioWaveform';
import { useToast } from "@/hooks/use-toast";
import { transcribeAudio } from "@/utils/speechToText";

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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const { toast } = useToast();

  const API_KEY = 'AIzaSyB3e3yEOKECnlDtivhi_jPxOpepk8wo6jE';

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      const recorder = new MediaRecorder(stream);
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

      recorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setIsProcessing(true);
        handleTranscription(audioBlob);
      };

      recorder.start(1000); // 1秒ごとにデータを取得
      setIsRecording(true);
      setRecordingTime(0);

      intervalRef.current = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);

    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "エラー",
        description: "録音の開始に失敗しました",
        variant: "destructive"
      });
    }
  };

  // useCallbackを使用してstopRecording関数をメモ化
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
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
    }
  }, [audioStream]);

  const handleTranscription = async (blob: Blob) => {
    setIsTranscribing(true);
    setTranscriptionProgress(0);
    try {
      const transcriptText = await transcribeAudio(blob, API_KEY, (progress) => {
        setTranscriptionProgress(progress);
      });
      
      const timestamp = new Date().toLocaleTimeString();
      setTranscription(prev => `${prev}[${timestamp}]\n${transcriptText}\n\n`);
      
      toast({
        title: "文字起こし完了",
        description: "音声の文字起こしが完了しました",
      });
    } catch (error: unknown) {
      console.error('Speech-to-Text Error:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "文字起こしに失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsTranscribing(false);
      setIsProcessing(false);
      setTranscriptionProgress(100);
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // ファイルサイズのチェック
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "エラー",
          description: `ファイルサイズが大きすぎます（${(file.size / (1024 * 1024)).toFixed(2)}MB）。100MB以下のファイルを使用してください。`,
          variant: "destructive"
        });
        return;
      }
      
      setAudioBlob(file);
      setIsProcessing(true);
      setUploadProgress(0);
      setTranscriptionProgress(0);
      
      try {
        // ファイルアップロード進捗表示の模擬
        const uploadTimer = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 95) {
              clearInterval(uploadTimer);
              return 95;
            }
            return prev + 5;
          });
        }, 50);
        
        // 少し遅延させて処理開始の感覚を出す
        setTimeout(() => {
          clearInterval(uploadTimer);
          setUploadProgress(100);
          handleTranscription(file);
        }, 800);
      } catch (error) {
        setIsProcessing(false);
        toast({
          title: "エラー",
          description: "ファイルの処理中にエラーが発生しました",
          variant: "destructive"
        });
      }
    }
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

  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording, stopRecording]);

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
                <div className="text-center text-xl font-bold text-primary">
                  {formatTime(recordingTime)}
                </div>
                <AudioWaveform 
                  isRecording={isRecording} 
                  recordingTime={recordingTime}
                  amplitude={amplitude}
                />
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={stopRecording}
                  className="w-full max-w-md mx-auto"
                  disabled={isProcessing || isTranscribing}
                >
                  <Square className="mr-2 h-5 w-5" />
                  録音を停止
                </Button>
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

          {audioBlob && !isRecording && (
            <Button
              variant="secondary"
              onClick={handleAudioExport}
              className="w-full"
              disabled={isProcessing || isTranscribing}
            >
              <Download className="mr-2 h-4 w-4" />
              音声をエクスポート
            </Button>
          )}

          <div className="space-y-2">
            <Label>文字起こし結果</Label>
            <textarea
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              className="w-full h-[200px] p-4 border rounded-lg font-mono text-sm resize-none bg-muted/5"
              placeholder="文字起こし結果がここに表示されます..."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
