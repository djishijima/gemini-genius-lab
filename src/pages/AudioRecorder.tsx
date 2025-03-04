
import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { AudioRecorderControls } from '@/components/AudioRecorderControls';
import { TranscriptionProgress } from '@/components/TranscriptionProgress';
import { TranscriptionResult } from '@/components/TranscriptionResult';
import { AudioExportButton } from '@/components/AudioExportButton';
import { AudioFileUploader } from '@/components/AudioFileUploader';
import { handleTranscription } from '@/utils/handleTranscription';

export default function AudioRecorder() {
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const onTranscriptionComplete = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      await handleTranscription(blob, {
        apiKey: API_KEY,
        onProgress: setTranscriptionProgress,
        onTranscriptionChange: setTranscription,
        onProcessingStateChange: setIsProcessing,
        onTranscribingStateChange: setIsTranscribing
      });
    } catch (error) {
      toast({
        title: "文字起こしエラー",
        description: error instanceof Error ? error.message : "文字起こし中にエラーが発生しました",
        variant: "destructive"
      });
    }
  };

  const handleStopRecording = () => {
    stopRecording();
    if (audioBlob) {
      onTranscriptionComplete(audioBlob);
    }
  };

  const handleFileUpload = (file: File) => {
    setIsProcessing(true);
    setUploadProgress(10);
    setTranscriptionProgress(0);
    setTranscription('');
    setUploadedFileName(file.name);

    let progress = 10;
    const uploadTimer = setInterval(() => {
      progress += 5;
      if (progress > 90) {
        progress = 90;
        clearInterval(uploadTimer);
      }
      setUploadProgress(progress);
    }, 100);

    setTimeout(() => {
      clearInterval(uploadTimer);
      setUploadProgress(100);
      
      const audioBlob = new Blob([file], { type: file.type });
      setAudioBlob(audioBlob);
      onTranscriptionComplete(audioBlob);
    }, 1000);
  };

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
          <AudioRecorderControls 
            isRecording={isRecording}
            recordingTime={recordingTime}
            amplitude={amplitude}
            audioStream={audioStream}
            isProcessing={isProcessing}
            isTranscribing={isTranscribing}
            onStartRecording={startRecording}
            onStopRecording={handleStopRecording}
            onFileInputClick={() => fileInputRef.current?.click()}
          />

          <AudioFileUploader 
            onFileUpload={handleFileUpload}
            isDisabled={isRecording || isProcessing || isTranscribing}
          />

          <TranscriptionProgress 
            isProcessing={isProcessing}
            isTranscribing={isTranscribing}
            uploadProgress={uploadProgress}
            transcriptionProgress={transcriptionProgress}
          />

          {audioBlob && !isRecording && (
            <AudioExportButton 
              audioBlob={audioBlob}
              isDisabled={isProcessing || isTranscribing}
            />
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

export const APP_VERSION = "1.2.0"; // 2025-03-15 リリース - コードをリファクタリング
