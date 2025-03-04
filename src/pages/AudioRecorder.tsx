
import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { transcribeAudio } from '@/utils/speechToText';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { AudioRecorderControls } from '@/components/AudioRecorderControls';
import { TranscriptionProgress } from '@/components/TranscriptionProgress';
import { TranscriptionResult } from '@/components/TranscriptionResult';

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

  // Use the audio recorder hook
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

  const handleTranscription = async (blob: Blob) => {
    setIsTranscribing(true);
    setTranscriptionProgress(10);
    setTranscription('');
    
    try {
      console.log('Blob type:', blob.type);
      
      if (blob.size === 0) {
        throw new Error('録音データが空です');
      }
      
      console.log('文字起こし開始:', blob.size, 'bytes');
      
      const result = await transcribeAudio(
        blob, 
        API_KEY, 
        (progress) => {
          console.log('文字起こし進捗:', progress);
          setTranscriptionProgress(progress);
        },
        (partialText, isFinal) => {
          console.log('部分的な文字起こし結果:', partialText, isFinal);
          setTranscription(prev => {
            if (isFinal) {
              return `${prev}${partialText}\n\n`;
            }
            return `${prev}${partialText}\n`;
          });
        }
      );
      
      console.log('文字起こし結果:', result);
      setTranscription(result);
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

  const handleStopRecording = () => {
    stopRecording();
    if (audioBlob) {
      setIsProcessing(true);
      handleTranscription(audioBlob);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "ファイルサイズエラー",
        description: "ファイルサイズは100MB以下にしてください",
        variant: "destructive"
      });
      return;
    }

    const supportedTypes = ['audio/mp3', 'audio/wav', 'audio/webm', 'audio/m4a', 'audio/ogg', 'audio/*'];
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

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mp3,audio/wav,audio/webm,audio/m4a,audio/ogg,audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <TranscriptionProgress 
            isProcessing={isProcessing}
            isTranscribing={isTranscribing}
            uploadProgress={uploadProgress}
            transcriptionProgress={transcriptionProgress}
          />

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

export const APP_VERSION = "1.1.0"; // 2025-03-05 リリース - コードをリファクタリング
