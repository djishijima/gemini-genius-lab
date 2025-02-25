
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Square, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Editor } from '@tinymce/tinymce-react';

export default function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
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

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          try {
            const audioBlob = new Blob([event.data], { type: 'audio/webm' });
            console.log('Audio data captured:', audioBlob.size, 'bytes');
            
            const formData = new FormData();
            formData.append('audio', audioBlob);
            formData.append('config', JSON.stringify(config));

            const response = await fetch(
              `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
              {
                method: 'POST',
                body: formData,
              }
            );

            if (!response.ok) {
              throw new Error('Speech-to-Text API request failed');
            }

            const data = await response.json();
            if (data.results && data.results[0]) {
              const timestamp = new Date().toLocaleTimeString();
              setTranscription(prev => 
                `${prev}[${timestamp}] ${data.results[0].alternatives[0].transcript}\n`
              );
            }

          } catch (error) {
            console.error('Speech-to-Text Error:', error);
            setTranscription(prev => 
              `${prev}[ERROR] Speech-to-Text処理エラー: ${error}\n`
            );
          }
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);

      console.log('Listening, press stop button to stop.');

    } catch (error) {
      console.error('Error initializing recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      console.log('Recording stopped.');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Button 
        variant="ghost" 
        onClick={() => navigate("/")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        戻る
      </Button>

      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>音声録音とリアルタイム文字起こし</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">Google Cloud APIキー</Label>
                <div className="relative">
                  <Textarea
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Google Cloud APIキーを入力してください"
                    className="min-h-[60px] max-h-[100px] font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex justify-center">
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
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">文字起こし結果</h3>
                <Editor
                  value={transcription}
                  onEditorChange={(content) => setTranscription(content)}
                  apiKey="wnbdf6jfr1lii0g2xzm7bfmuhbxlt6xj7sjvk41g9ebf0j85"
                  init={{
                    height: 300,
                    menubar: false,
                    language: 'ja',
                    plugins: [
                      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                      'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
                      'checklist', 'mediaembed', 'casechange', 'export', 'formatpainter', 
                      'pageembed', 'a11ychecker', 'tinymcespellchecker', 'permanentpen', 
                      'powerpaste', 'advtable', 'advcode', 'editimage', 'advtemplate', 
                      'ai', 'mentions', 'tinycomments', 'tableofcontents', 'footnotes', 
                      'mergetags', 'autocorrect', 'typography', 'inlinecss', 'markdown',
                      'importword', 'exportword', 'exportpdf'
                    ],
                    toolbar: 'undo redo | 書式 | ' +
                      '太字 斜体 背景色 | 左揃え 中央揃え ' +
                      '右揃え 均等揃え | 箇条書き 番号付き 字下げ 字上げ | ' +
                      'ai | 書式削除 | ヘルプ',
                    ai_request: (request, respondWith) => respondWith.string(() => Promise.reject('AI Assistant の実装については、ドキュメントを参照してください')),
                    tinycomments_mode: 'embedded',
                    tinycomments_author: 'Author name',
                    mergetags_list: [
                      { value: 'First.Name', title: 'First Name' },
                      { value: 'Email', title: 'Email' },
                    ],
                    content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 14px }',
                    readonly: true
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
