
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { AudioRecorderControls } from '@/components/AudioRecorderControls';
import { TranscriptionProgress } from '@/components/TranscriptionProgress';
import { TranscriptionResult } from '@/components/TranscriptionResult';
import { AudioExportButton } from '@/components/AudioExportButton';
import { handleTranscription } from '@/utils/handleTranscription';

export default function AudioRecorder() {
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [pendingTranscription, setPendingTranscription] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  
  const { toast } = useToast();
  
  const API_KEY = 'AIzaSyB3e3yEOKECnlDtivhi_jPxOpepk8wo6jE';

  const { 
    isRecording, 
    audioBlob, 
    recordingTime, 
    amplitude, 
    audioStream, 
    startRecording, 
    stopRecording,
    setAudioBlob
  } = useAudioRecorder();

  // Effect to monitor audio blob changes and handle pending transcription
  useEffect(() => {
    console.log("AudioBlob changed:", audioBlob ? `${audioBlob.size} bytes` : "null");
    
    if (pendingTranscription && audioBlob) {
      if (audioBlob.size > 0) {
        console.log("Pending transcription with valid audio blob, processing now");
        handleTranscriptionProcess(audioBlob);
        setPendingTranscription(false);
      } else {
        console.error("AudioBlob is empty, cannot process for transcription");
        toast({
          title: "エラー",
          description: "録音データが空です。録音を再試行してください。",
          variant: "destructive"
        });
        setPendingTranscription(false);
        setIsProcessing(false);
      }
    }
  }, [audioBlob, pendingTranscription]);

  const handleTranscriptionProcess = async (blob: Blob) => {
    if (!blob || blob.size === 0) {
      toast({
        title: "エラー",
        description: "音声データが空です。録音を再試行してください。",
        variant: "destructive"
      });
      setTranscriptionError("録音データが空です。録音を再試行してください。");
      return;
    }
    
    console.log("文字起こし処理開始:", blob.type, blob.size, "bytes");
    setIsProcessing(true);
    setTranscription(''); // クリア
    setTranscriptionError(null);
    
    try {
      await handleTranscription(blob, {
        apiKey: API_KEY,
        onProgress: (progress) => {
          console.log("文字起こし進捗:", progress);
          setTranscriptionProgress(progress);
        },
        onTranscriptionChange: (text) => {
          console.log("文字起こし結果更新:", text);
          
          if (text.includes("音声を認識できませんでした")) {
            setTranscriptionError(text);
          } else {
            setTranscription(text);
          }
        },
        onProcessingStateChange: setIsProcessing,
        onTranscribingStateChange: setIsTranscribing
      });
    } catch (error) {
      console.error("文字起こしエラー:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "文字起こし中にエラーが発生しました";
      
      toast({
        title: "文字起こしエラー",
        description: errorMessage,
        variant: "destructive"
      });
      
      setTranscriptionError(errorMessage);
      setIsProcessing(false);
      setIsTranscribing(false);
    }
  };

  const handleStopRecording = async () => {
    if (isRecording) {
      console.log("録音停止を要求します");
      
      // First, mark that we want to transcribe when the audio is ready
      setPendingTranscription(true);
      
      // Then stop the recording
      stopRecording();
      
      // The useEffect will pick up when audioBlob becomes available
      toast({
        title: "録音完了",
        description: "録音を停止しました。文字起こし処理を開始します。"
      });
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>音声文字起こし</CardTitle>
          <CardDescription>
            音声を録音してリアルタイムで文字起こしを行います。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AudioRecorderControls 
            isRecording={isRecording}
            recordingTime={recordingTime}
            amplitude={amplitude}
            audioStream={audioStream}
            isProcessing={isProcessing}
            isTranscribing={isTranscribing}
            onStartRecording={startRecording}
            onStopRecording={handleStopRecording}
            onFileInputClick={() => {}} // 使用しない機能
          />

          <TranscriptionProgress 
            isProcessing={isProcessing}
            isTranscribing={isTranscribing}
            uploadProgress={0} // ファイルアップロードは使用しない
            transcriptionProgress={transcriptionProgress}
          />

          {audioBlob && !isRecording && audioBlob.size > 0 && (
            <AudioExportButton 
              audioBlob={audioBlob}
              isDisabled={isProcessing || isTranscribing}
            />
          )}

          {transcriptionError && !isTranscribing && !isProcessing && (
            <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
              <p className="font-medium">エラー:</p>
              <p>{transcriptionError}</p>
            </div>
          )}

          <TranscriptionResult 
            transcription={transcription}
            isTranscribing={isTranscribing}
          />
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

export const APP_VERSION = "1.6.0"; // 2025-03-05 エラーハンドリング改善
