
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Square, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<string[]>([]);
  const navigate = useNavigate();

  const startRecording = () => {
    setIsRecording(true);
    // TODO: 録音機能の実装
  };

  const stopRecording = () => {
    setIsRecording(false);
    // TODO: 録音の停止と保存
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
            <CardTitle>音声録音</CardTitle>
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
              {recordings.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">録音一覧</h3>
                  <div className="space-y-2">
                    {recordings.map((recording, index) => (
                      <div key={index} className="p-2 bg-muted rounded-lg">
                        録音 {index + 1}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
