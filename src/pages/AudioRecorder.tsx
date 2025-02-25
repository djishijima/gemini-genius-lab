
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
  const navigate = useNavigate();

  const config = {
    encoding: 'LINEAR16',
    sampleRateHertz: 16000,
    languageCode: 'ja-JP',
  };

  const request = {
    config,
    interimResults: true,
  };

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
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      setAudioStream(stream);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;

      let chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          try {
            const newAudioBlob = new Blob(chunks, { type: 'audio/webm' });
            setAudioBlob(newAudioBlob);
            console.log('Audio data captured:', newAudioBlob.size, 'bytes');
            
            // Google Cloud Speech-to-Text APIの要求形式に合わせる
            const requestBody = {
              config: {
                encoding: 'WEBM_OPUS',
                sampleRateHertz: 16000,
                languageCode: 'ja-JP',
              },
              audio: {
                content: await newAudioBlob.arrayBuffer().then(buffer => 
                  Buffer.from(buffer).toString('base64')
                )
              }
            };

            const response = await fetch(
              `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
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
              console.log('Transcription:', newTranscript);
            }

          } catch (error) {
            console.error('Speech-to-Text Error:', error);
            setTranscription(prev => 
              prev + `[ERROR] Speech-to-Text処理エラー: ${error}\n`
            );
          }
          chunks = []; // Clear chunks after processing
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      console.log('Recording started...');

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
      console.log('Recording stopped.');
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
                <Textarea
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Google Cloud APIキーを入力してください"
                  className="min-h-[40px] max-h-[40px] font-mono text-sm resize-none"
                />
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
                      // Core editing features
                      'anchor', 'autolink', 'charmap', 'codesample', 'emoticons', 
                      'image', 'link', 'lists', 'media', 'searchreplace', 'table', 
                      'visualblocks', 'wordcount',
                      // Premium features
                      'checklist', 'mediaembed', 'casechange', 'export', 
                      'formatpainter', 'pageembed', 'a11ychecker', 
                      'tinymcespellchecker', 'permanentpen', 'powerpaste', 
                      'advtable', 'advcode', 'editimage', 'advtemplate', 'ai', 
                      'mentions', 'tinycomments', 'tableofcontents', 'footnotes', 
                      'mergetags', 'autocorrect', 'typography', 'inlinecss', 
                      'markdown', 'importword', 'exportword', 'exportpdf'
                    ],
                    toolbar: 'ai | undo redo | ' +
                      'ai_ask ai_randomize ai_assist ai_summarize ai_translate | ' +
                      'blocks fontfamily fontsize | bold italic underline | ' +
                      'alignment | checklist numlist bullist | emoticons charmap | ' +
                      'link image media table mergetags | spellcheckdialog',
                    content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 14px }',
                    readonly: false,
                    branding: false,
                    promotion: false,
                    tinycomments_mode: 'embedded',
                    tinycomments_author: 'User',
                    mergetags_list: [
                      { value: 'First.Name', title: 'First Name' },
                      { value: 'Email', title: 'Email' },
                    ],
                    ai_request: (request: any, respondWith: any) => {
                      respondWith.string(() => Promise.resolve('This is a mock AI response'));
                    }
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
