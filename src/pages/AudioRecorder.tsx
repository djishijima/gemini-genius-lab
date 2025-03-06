import { useState, useCallback, useEffect } from "react";
import type React from "react";
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

const AudioRecorder: React.FC = () => {
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [pendingTranscription, setPendingTranscription] = useState<string | null>(null);
  const [transcriptionProgress, setTranscriptionProgress] = useState<number>(0);

  const { toast } = useToast();
  const {
    startRecording,
    stopRecording,
    isRecording: recorderIsRecording,
    recordingTime,
  } = useAudioRecorder();

  const API_KEY = "AIzaSyB3e3yEOKECnlDtivhi_jPxOpepk8wo6jE";

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

      console.log("文字起こし処理開始:", blob.type, blob.size, "bytes");
      setIsProcessing(true);
      setTranscription(""); // クリア

      try {
        await handleTranscription(blob, {
          apiKey: API_KEY,
          onProgress: (progress) => {
            console.log("文字起こし進捗:", progress);
            setTranscriptionProgress(progress);
          },
          onTranscriptionChange: (text) => {
            console.log("文字起こし結果更新:", text);
            setTranscription(text);
          },
          onProcessingStateChange: setIsProcessing,
          onTranscribingStateChange: setIsTranscribing,
        });
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

  const onStartRecording = useCallback(async () => {
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

    const mediaRecorder = new MediaRecorder(audioStream);
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setAudioBlob(event.data);
        handleTranscriptionProcess(event.data);
      }
    };

    mediaRecorder.start();

    return () => {
      mediaRecorder.stop();
    };
  }, [recorderIsRecording, audioStream, handleTranscriptionProcess]);

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
                  <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse mr-2"></span>
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
            onStartRecording={onStartRecording}
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
