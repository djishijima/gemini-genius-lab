
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Square, ArrowLeft, Download, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AudioWaveform } from "@/components/AudioWaveform";
import { ApiKeyInput } from "@/components/ApiKeyInput";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { transcribeAudio, processAudioFile } from "@/utils/speechToText";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function AudioRecorder() {
  const [transcription, setTranscription] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [projectId, setProjectId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleRecordingComplete = async (blob: Blob) => {
    try {
      const transcriptText = await transcribeAudio(blob, apiKey);
      const timestamp = new Date().toLocaleTimeString();
      setTranscription(prev => 
        prev + `[${timestamp}] ${transcriptText}\n`
      );
    } catch (error) {
      console.error('Speech-to-Text Error:', error);
      setTranscription(prev => 
        prev + `[ERROR] Speech-to-Text処理エラー: ${error}\n`
      );
    }
  };

  const {
    isRecording,
    audioStream,
    audioBlob,
    recordingTime,
    startRecording,
    stopRecording
  } = useAudioRecorder({
    onRecordingComplete: handleRecordingComplete
  });

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = () => {
    if (!apiKey) {
      alert('APIキーを入力してください');
      return;
    }
    startRecording();
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

    if (!apiKey) {
      alert('APIキーを入力してください');
      return;
    }

    try {
      setIsProcessing(true);
      const transcriptText = await processAudioFile(file, apiKey);
      const timestamp = new Date().toLocaleTimeString();
      setTranscription(prev => 
        prev + `[${timestamp}] ${file.name}の文字起こし結果:\n${transcriptText}\n`
      );
    } catch (error) {
      console.error('File Processing Error:', error);
      setTranscription(prev => 
        prev + `[ERROR] ファイル処理エラー: ${error}\n`
      );
    } finally {
      setIsProcessing(false);
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
    };
  }, [isRecording]);

  return (
    <div className="p-6">
      <Button 
        variant="ghost" 
        onClick={() => navigate("/")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        戻る
      </Button>

      <div className="max-w-5xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Google Cloud Speech-to-Text による音声文字起こし</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="projectId">Google Cloud Project ID</Label>
                <Input
                  id="projectId"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="your-project-id"
                />
              </div>

              <ApiKeyInput
                apiKey={apiKey}
                onChange={setApiKey}
              />

              {isRecording && (
                <>
                  <div className="text-center text-xl font-bold">
                    {formatTime(recordingTime)}
                  </div>
                  <div className="mt-4">
                    <AudioWaveform stream={audioStream} isRecording={isRecording} />
                  </div>
                </>
              )}

              <div className="flex justify-center gap-2">
                <Button
                  size="lg"
                  variant={isRecording ? "destructive" : "default"}
                  onClick={isRecording ? stopRecording : handleStartRecording}
                  disabled={isProcessing || !projectId}
                >
                  {isRecording ? (
                    <>
                      <Square className="mr-2 h-4 w-4" />
                      録音を停止
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-4 w-4" />
                      録音を開始
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={exportAudio}
                  disabled={isRecording || !audioBlob || isProcessing}
                >
                  <Download className="mr-2 h-4 w-4" />
                  音声をエクスポート
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRecording || isProcessing || !projectId}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  音声ファイルを選択
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">文字起こし結果</h3>
                <textarea
                  value={transcription}
                  onChange={(e) => setTranscription(e.target.value)}
                  className="w-full h-[300px] p-2 border rounded resize-none"
                  readOnly={false}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
