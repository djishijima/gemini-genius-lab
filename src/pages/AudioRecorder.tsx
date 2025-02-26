import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mic, Square, ArrowLeft, Download, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AudioWaveform } from "@/components/AudioWaveform";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { transcribeAudio, processAudioFile } from "@/utils/speechToText";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function AudioRecorder() {
  const [transcription, setTranscription] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcriptionTimeoutRef = useRef<NodeJS.Timeout>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const API_KEY = 'AIzaSyB3e3yEOKECnlDtivhi_jPxOpepk8wo6jE';
  const PROJECT_ID = 'aisanbo';

  const processChunk = async (chunk: Blob) => {
    try {
      const transcriptText = await transcribeAudio(chunk, API_KEY, (progress) => {
        setTranscriptionProgress(progress);
      });
      if (transcriptText.trim()) {
        const timestamp = new Date().toLocaleTimeString();
        setTranscription(prev => prev + `[$] ${timestamp}\n${transcriptText}\n`);
      }
    } catch (error: any) {
      console.error('Real-time transcription error:', error);
    }
  };

  const handleRecordingComplete = async (blob: Blob) => {
    setIsTranscribing(true);
    setTranscriptionProgress(0);
    try {
      const transcriptText = await transcribeAudio(blob, API_KEY, (progress) => {
        setTranscriptionProgress(progress);
      });
      const timestamp = new Date().toLocaleTimeString();
      setTranscription(prev =>
        prev + `[$] ${timestamp}\n${transcriptText}\n`
      );
    } catch (error: any) {
      console.error('Speech-to-Text Error:', error);
      toast({
        title: "エラー",
        description: error.message || "文字起こしに失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsTranscribing(false);
      setTranscriptionProgress(0);
    }
  };

  const {
    isRecording,
    audioStream,
    audioBlob,
    recordingTime,
    startRecording: startBaseRecording,
    stopRecording: stopBaseRecording
  } = useAudioRecorder({
    onRecordingComplete: handleRecordingComplete
  });

  const startRecording = async () => {
    try {
      await startBaseRecording();
      if (audioStream) {
        const mediaRecorder = new MediaRecorder(audioStream, {
          mimeType: 'audio/webm',
        });
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = async (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
            if (transcriptionTimeoutRef.current) {
              clearTimeout(transcriptionTimeoutRef.current);
            }
            transcriptionTimeoutRef.current = setTimeout(() => {
              const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
              processChunk(audioBlob);
              chunksRef.current = [];
            }, 3000);
          }
        };

        mediaRecorder.start(1000);
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "エラー",
        description: "録音の開始に失敗しました",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (transcriptionTimeoutRef.current) {
      clearTimeout(transcriptionTimeoutRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopBaseRecording();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const exportAudio = () => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${new Date().toISOString()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadProgress(0);
    setTranscriptionProgress(0);
    try {
      const transcriptText = await processAudioFile(file, API_KEY, (upload, transcribe) => {
        setUploadProgress(upload);
        setTranscriptionProgress(transcribe);
      });
      const timestamp = new Date().toLocaleTimeString();
      setTranscription(prev =>
        prev + `[$] ${timestamp} ${file.name}の文字起こし結果:\n${transcriptText}\n`
      );
    } catch (error: any) {
      console.error('File Processing Error:', error);
      toast({
        title: "エラー",
        description: error.message || "ファイル処理に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
      setTranscriptionProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
      if (transcriptionTimeoutRef.current) {
        clearTimeout(transcriptionTimeoutRef.current);
      }
    };
  }, [isRecording]);

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Button 
        variant="ghost" 
        onClick={() => navigate("/")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        戻る
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>音声文字起こし</CardTitle>
          <CardDescription>
            音声を録音するか、音声ファイルをアップロードして文字起こしを行います
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recording Controls */}
          <div className="flex flex-col items-center space-y-4 p-6 border rounded-lg bg-muted/10">
            {isRecording ? (
              <div className="w-full space-y-4">
                <div className="text-center text-xl font-bold text-primary">
                  {formatTime(recordingTime)}
                </div>
                <AudioWaveform stream={audioStream} isRecording={isRecording} />
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

          {/* File Upload */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
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

          {/* Progress Indicators */}
          {(isProcessing || isTranscribing) && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
              <p className="text-sm font-medium text-center">処理中...</p>
              {isProcessing && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">ファイルアップロード</Label>
                    <Progress value={uploadProgress} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">文字起こし</Label>
                    <Progress value={transcriptionProgress} />
                  </div>
                </>
              )}
              {isTranscribing && (
                <div className="space-y-2">
                  <Label className="text-sm">文字起こし</Label>
                  <Progress value={transcriptionProgress} />
                </div>
              )}
            </div>
          )}

          {/* Audio Export */}
          {audioBlob && !isRecording && (
            <Button
              variant="secondary"
              onClick={exportAudio}
              className="w-full"
              disabled={isProcessing || isTranscribing}
            >
              <Download className="mr-2 h-4 w-4" />
              音声をエクスポート
            </Button>
          )}

          {/* Transcription Results */}
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
