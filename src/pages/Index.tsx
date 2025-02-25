
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileAudio, Headphones, BookOpen, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">取材アシスタント</h1>
          <p className="text-muted-foreground">音声の録音と文字起こしをサポートします</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                <span>取材音声アシスタント</span>
              </CardTitle>
              <CardDescription>
                取材音声の録音と管理をサポート
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  • 高品質な音声録音
                  <br />
                  • 録音データの管理
                  <br />
                  • 音声メモの追加
                </p>
                <Button 
                  className="w-full"
                  onClick={() => navigate("/audio-recorder")}
                >
                  <Headphones className="mr-2 h-4 w-4" />
                  録音を開始
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileAudio className="h-5 w-5" />
                <span>取材音声原稿アシスタント</span>
              </CardTitle>
              <CardDescription>
                音声の文字起こしと原稿作成をサポート
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  • 音声の文字起こし
                  <br />
                  • 原稿の編集と整形
                  <br />
                  • 文字起こしデータの管理
                </p>
                <Button 
                  className="w-full"
                  onClick={() => navigate("/transcription")}
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  原稿作成を開始
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
