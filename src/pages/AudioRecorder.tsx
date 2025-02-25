
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Square, ArrowLeft, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Editor } from '@tinymce/tinymce-react';
import { AudioWaveform } from "@/components/AudioWaveform";
import { ApiKeyInput } from "@/components/ApiKeyInput";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { transcribeAudio } from "@/utils/speechToText";

export default function AudioRecorder() {
  const [transcription, setTranscription] = useState("");
  const [apiKey, setApiKey] = useState("");
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
    startRecording,
    stopRecording
  } = useAudioRecorder({
    onRecordingComplete: handleRecordingComplete
  });

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
            <CardTitle>音声録音とリアルタイム文字起こし</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ApiKeyInput
                apiKey={apiKey}
                onChange={setApiKey}
              />

              {isRecording && (
                <div className="mt-4">
                  <AudioWaveform stream={audioStream} isRecording={isRecording} />
                </div>
              )}

              <div className="flex justify-center gap-2">
                <Button
                  size="lg"
                  variant={isRecording ? "destructive" : "default"}
                  onClick={isRecording ? stopRecording : handleStartRecording}
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
                  disabled={isRecording || !audioBlob}
                >
                  <Download className="mr-2 h-4 w-4" />
                  音声をエクスポート
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">文字起こし結果</h3>
                <Editor
                  value={transcription}
                  onEditorChange={(content) => setTranscription(content)}
                  apiKey="wnbdf6jfr1lii0g2xzm7bfmuhbxlt6xj7sjvk41g9ebf0j85"
                  init={{
                    height: 300,
                    menubar: true,
                    language: 'ja',
                    plugins: [
                      'anchor', 'autolink', 'charmap', 'codesample', 'emoticons', 
                      'image', 'link', 'lists', 'media', 'searchreplace', 'table', 
                      'visualblocks', 'wordcount'
                    ],
                    toolbar: 'undo redo | ' +
                      'blocks fontfamily fontsize | bold italic underline | ' +
                      'alignment | checklist numlist bullist | emoticons charmap | ' +
                      'link image media table mergetags',
                    content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 14px }',
                    readonly: false,
                    branding: false,
                    promotion: false,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
