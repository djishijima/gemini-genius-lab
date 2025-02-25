
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";

export default function Transcription() {
  const [transcribedText, setTranscribedText] = useState("");
  const [tasks, setTasks] = useState<string[]>([]);
  const navigate = useNavigate();

  // APIからファイルリストを取得する例
  const { data: files, isLoading, refetch } = useQuery({
    queryKey: ['manuscript-files'],
    queryFn: async () => {
      // TODO: 実際のAPIエンドポイントに置き換え
      const response = await fetch('YOUR_API_ENDPOINT/files');
      const data = await response.json();
      return data;
    },
    enabled: false, // 手動で実行するようにする
  });

  // Vertex AIでテキスト認識を行う関数
  const processWithVertexAI = async (fileUrl: string) => {
    try {
      // TODO: Vertex AI APIを呼び出す処理
      // 1. 画像からテキストを抽出
      // 2. テキストの自動チェック
      // 3. 修正タスクの生成
      
      // デモ用のダミーレスポンス
      setTranscribedText("Vertex AIで認識されたテキストがここに表示されます...");
      setTasks([
        "漢字の誤字を修正してください",
        "句読点の位置を確認してください",
        "段落の区切りを見直してください"
      ]);
    } catch (error) {
      console.error("Vertex AI処理エラー:", error);
    }
  };

  const handleExportToInDesign = () => {
    // TODO: InDesignスクリプトの生成処理
    console.log("InDesignスクリプトを生成します");
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
            <CardTitle>原稿の文字起こしと修正</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-center gap-4">
                <Button 
                  onClick={() => refetch()}
                  className="w-48"
                  disabled={isLoading}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  原稿ファイル更新
                </Button>
                <Button 
                  variant="secondary"
                  className="w-48"
                  onClick={handleExportToInDesign}
                >
                  InDesignスクリプト出力
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-medium">認識されたテキスト</h3>
                  <Textarea
                    value={transcribedText}
                    onChange={(e) => setTranscribedText(e.target.value)}
                    placeholder="ここに認識されたテキストが表示されます..."
                    className="min-h-[400px]"
                  />
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">修正タスク一覧</h3>
                  <Card className="h-[400px] overflow-auto">
                    <CardContent className="pt-4">
                      {tasks.map((task, index) => (
                        <div 
                          key={index}
                          className="p-2 border-b last:border-b-0 hover:bg-muted/50"
                        >
                          {task}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
