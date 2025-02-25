
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Transcription() {
  const [transcribedText, setTranscribedText] = useState("");
  const [tasks, setTasks] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

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

  // テキスト認識を行う関数
  const handleProcessText = async () => {
    try {
      // TODO: 文字認識の処理を実装
      setTranscribedText("認識されたテキストがここに表示されます...");
      setTasks([
        "漢字の誤字を修正してください",
        "句読点の位置を確認してください",
        "段落の区切りを見直してください"
      ]);
    } catch (error) {
      console.error("テキスト処理エラー:", error);
      toast({
        title: "エラー",
        description: "テキストの処理に失敗しました",
        variant: "destructive"
      });
    }
  };

  const handleDownloadScript = () => {
    try {
      const script = `
#target "InDesign"
// 基本設定
app.scriptPreferences.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT;
app.scriptPreferences.enableRedraw = false;

// 新規ドキュメント作成
var doc = app.documents.add();
doc.documentPreferences.pageSize = "A4";
doc.documentPreferences.facingPages = false;

// マージン設定
doc.documentPreferences.pageWidth = "210mm";
doc.documentPreferences.pageHeight = "297mm";
doc.marginPreferences.top = "20mm";
doc.marginPreferences.bottom = "20mm";
doc.marginPreferences.left = "20mm";
doc.marginPreferences.right = "20mm";

// マスターページ設定
var master = doc.masterSpreads.item(0);
var masterTextFrame = master.pages.item(0).textFrames.add({
    geometricBounds: [
        doc.marginPreferences.top,
        doc.marginPreferences.left,
        doc.documentPreferences.pageHeight - doc.marginPreferences.bottom,
        doc.documentPreferences.pageWidth - doc.marginPreferences.right
    ]
});

// 本文ページ設定
var page = doc.pages.item(0);
var textFrame = page.textFrames.add({
    geometricBounds: [
        doc.marginPreferences.top,
        doc.marginPreferences.left,
        doc.documentPreferences.pageHeight - doc.marginPreferences.bottom,
        doc.documentPreferences.pageWidth - doc.marginPreferences.right
    ]
});

// テキストの設定
textFrame.contents = "原稿本文をここに入力してください";
var text = textFrame.texts[0];
text.appliedFont = "Hiragino Kaku Gothic ProN";
text.pointSize = 10.5;
text.leading = 16;

app.scriptPreferences.enableRedraw = true;
      `;

      // スクリプトをダウンロード
      const blob = new Blob([script], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'create_document.jsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "成功",
        description: "InDesignスクリプトのダウンロードが完了しました",
      });
    } catch (error) {
      console.error("スクリプト生成エラー:", error);
      toast({
        title: "エラー",
        description: "スクリプトの生成に失敗しました",
        variant: "destructive"
      });
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

      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>原稿の文字起こしと修正</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between gap-4">
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
                  onClick={handleDownloadScript}
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
