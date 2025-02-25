
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileAudio, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">リアルタイム文字起こし</h1>
          <p className="text-muted-foreground">音声を録音しながらリアルタイムで文字に起こします</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                <span>リアルタイム文字起こし</span>
              </CardTitle>
              <CardDescription>
                音声を録音しながらリアルタイムで文字起こし
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  • リアルタイム音声認識
                  <br />
                  • 自動文字起こし
                  <br />
                  • テキストの編集と保存
                </p>
                <Button 
                  className="w-full"
                  onClick={() => navigate("/audio-recorder")}
                >
                  <Mic className="mr-2 h-4 w-4" />
                  録音開始
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileAudio className="h-5 w-5" />
                <span>音声ファイル文字起こし</span>
              </CardTitle>
              <CardDescription>
                既存の音声ファイルを文字起こし
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  • 音声ファイルのアップロード
                  <br />
                  • 高精度な文字起こし
                  <br />
                  • テキストの編集と保存
                </p>
                <Button 
                  className="w-full"
                  onClick={() => navigate("/transcription")}
                >
                  <FileAudio className="mr-2 h-4 w-4" />
                  ファイルを選択
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
