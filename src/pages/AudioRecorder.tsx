
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Square, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import FroalaEditor from 'react-froala-wysiwyg';
import 'froala-editor/css/froala_style.min.css';
import 'froala-editor/css/froala_editor.pkgd.min.css';
import 'froala-editor/js/languages/ja';

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

  const froalaConfig = {
    language: 'ja',
    height: 300,
    toolbarButtons: {
      moreText: {
        buttons: ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'fontSize', 'textColor', 'backgroundColor', 'clearFormatting'],
        align: 'left',
        buttonsVisible: 3
      },
      moreParagraph: {
        buttons: ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify', 'formatOL', 'formatUL', 'paragraphFormat', 'lineHeight', 'outdent', 'indent'],
        align: 'left',
        buttonsVisible: 3
      },
      moreRich: {
        buttons: ['insertTable', 'emoticons', 'specialCharacters', 'embedly', 'insertHR'],
        align: 'left',
        buttonsVisible: 3
      },
      moreMisc: {
        buttons: ['undo', 'redo', 'print', 'getPDF', 'help'],
        align: 'right',
        buttonsVisible: 2
      }
    },
    readOnly: true,
    charCounterCount: true
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
                <FroalaEditor
                  tag="textarea"
                  model={transcription}
                  onModelChange={(model) => setTranscription(model)}
                  config={froalaConfig}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
