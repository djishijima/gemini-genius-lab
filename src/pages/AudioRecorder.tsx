import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Square, ArrowLeft, Eye, EyeOff, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Editor } from '@tinymce/tinymce-react';
import { AudioWaveform } from "@/components/AudioWaveform";

export default function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    if (!apiKey) {
      alert('APIキーを入力してください');
      return;
    }

    setAudioBlob(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      setAudioStream(stream);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        
        try {
          const buffer = await audioBlob.arrayBuffer();
          const base64Data = btoa(
            new Uint8Array(buffer)
              .reduce((data, byte) => data + String.fromCharCode(byte), '')
          );

          const response = await fetch(
            `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                config: {
                  encoding: 'WEBM_OPUS',
                  sampleRateHertz: 48000,
                  languageCode: 'ja-JP',
                },
                audio: {
                  content: base64Data
                }
              })
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Speech-to-Text API error: ${JSON.stringify(errorData)}`);
          }

          const data = await response.json();
          if (data.results && data.results[0]) {
            const newTranscript = data.results[0].alternatives[0].transcript;
            const timestamp = new Date().toLocaleTimeString();
            setTranscription(prev => 
              prev + `[${timestamp}] ${newTranscript}\n`
            );
          }
        } catch (error) {
          console.error('Speech-to-Text Error:', error);
          setTranscription(prev => 
            prev + `[ERROR] Speech-to-Text処理エラー: ${error}\n`
          );
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);

    } catch (error) {
      console.error('Error initializing recording:', error);
      alert('録音の初期化中にエラーが発生しました');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setAudioStream(null);
    }
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
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="apiKey">Google Cloud APIキー</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <div className={showApiKey ? "" : "password-input"}>
                  <Textarea
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Google Cloud APIキーを入力してください"
                    className="min-h-[40px] max-h-[40px] font-mono text-sm resize-none"
                  />
                </div>
              </div>

              {isRecording && (
                <div className="mt-4">
                  <AudioWaveform stream={audioStream} isRecording={isRecording} />
                </div>
              )}

              <div className="flex justify-center gap-2">
                <Button
                  size="lg"
                  variant={isRecording ? "destructive" : "default"}
                  onClick={isRecording ? stopRecording : startRecording}
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

      <style jsx>{`
        .password-input textarea {
          -webkit-text-security: disc;
          text-security: disc;
        }
      `}</style>
    </div>
  );
}
