
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Square, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";

export default function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const navigate = useNavigate();

  // 音声認識の設定
  const config = {
    encoding: 'LINEAR16',
    sampleRateHertz: 16000,
    languageCode: 'ja-JP',
  };

  const request = {
    config,
    interimResults: true, // 中間結果を有効化
  };

  useEffect(() => {
    // コンポーネントのクリーンアップ時に録音を停止
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
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

      // 音声データが利用可能になったときの処理
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          try {
            // 音声データの処理
            const audioBlob = new Blob([event.data], { type: 'audio/webm' });
            console.log('Audio data captured:', audioBlob.size, 'bytes');
            
            // TODO: Vertex AI Speech-to-Text APIにストリーミング
            // サンプルコードの動作確認用の仮実装
            const timestamp = new Date().toLocaleTimeString();
            setTranscription(prev => 
              `${prev}[${timestamp}] Transcription: 音声データを受信しました (${audioBlob.size} bytes)\n`
            );

          } catch (error) {
            console.error('Speech-to-Text Error:', error);
          }
        }
      };

      // 1秒ごとにデータを送信（Googleのサンプルコードと同じ間隔）
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
      // すべてのトラックを停止
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
                <Textarea
                  value={transcription}
                  readOnly
                  className="min-h-[300px]"
                  placeholder="録音を開始すると、ここにリアルタイムで文字起こし結果が表示されます..."
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
