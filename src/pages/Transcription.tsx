
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";

export default function Transcription() {
  const [transcribedText, setTranscribedText] = useState("");
  const navigate = useNavigate();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // TODO: 音声ファイルのアップロードと文字起こし処理の実装
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

      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>音声文字起こし</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-center">
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  音声ファイルをアップロード
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </Button>
              </div>
              <Textarea
                value={transcribedText}
                onChange={(e) => setTranscribedText(e.target.value)}
                placeholder="ここに文字起こしされたテキストが表示されます..."
                className="min-h-[400px]"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
