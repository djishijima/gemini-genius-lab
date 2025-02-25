
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, RefreshCcw, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function Transcription() {
  const [manuscriptText, setManuscriptText] = useState("");
  const [scriptPreview, setScriptPreview] = useState(`#target "InDesign"
// 基本設定
app.scriptPreferences.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT;
app.scriptPreferences.enableRedraw = false;

// 新規ドキュメント作成
var doc = app.documents.add();
doc.documentPreferences.pageSize = "A4";
doc.documentPreferences.facingPages = false;

// ... スクリプトの内容がここに表示されます ...`);
  const navigate = useNavigate();
  const { toast } = useToast();

  // ファイルアップロード処理
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (file.type === "text/plain") {
        const text = await file.text();
        setManuscriptText(text);
      } else if (file.type === "application/pdf") {
        toast({
          title: "PDF対応予定",
          description: "PDFからのテキスト抽出は現在開発中です",
          variant: "destructive"
        });
      } else {
        toast({
          title: "エラー",
          description: "TXTまたはPDFファイルをアップロードしてください",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("ファイル読み込みエラー:", error);
      toast({
        title: "エラー",
        description: "ファイルの読み込みに失敗しました",
        variant: "destructive"
      });
    }
  };

  const generateScript = () => {
    const script = `#target "InDesign"
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
textFrame.contents = "${manuscriptText.replace(/"/g, '\\"').replace(/\n/g, '\\r')}";
var text = textFrame.texts[0];
text.appliedFont = "Hiragino Kaku Gothic ProN";
text.pointSize = 10.5;
text.leading = 16;

app.scriptPreferences.enableRedraw = true;`;

    setScriptPreview(script);
    return script;
  };

  const handleDownloadScript = () => {
    try {
      if (!manuscriptText.trim()) {
        toast({
          title: "エラー",
          description: "テキストが入力されていません",
          variant: "destructive"
        });
        return;
      }

      const script = generateScript();
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* 左カラム：原稿入力 */}
        <Card>
          <CardHeader>
            <CardTitle>原稿入力</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                type="file"
                accept=".txt,.pdf"
                onChange={handleFileUpload}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                テキストファイルをアップロードするか、下のテキストエリアに直接コピー&ペーストしてください。
              </p>
              <Textarea
                value={manuscriptText}
                onChange={(e) => {
                  setManuscriptText(e.target.value);
                  if (e.target.value.trim()) {
                    generateScript();
                  }
                }}
                placeholder="ここに原稿テキストを入力してください..."
                className="min-h-[600px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* 右カラム：スクリプトプレビューとダウンロード */}
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>InDesignスクリプト</span>
              <Button 
                variant="secondary"
                onClick={handleDownloadScript}
                className="ml-4"
              >
                スクリプトをダウンロード
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm text-muted-foreground mb-2">
                  スクリプトプレビュー:
                </p>
                <pre className="text-xs overflow-auto whitespace-pre-wrap bg-background p-4 rounded border min-h-[600px]">
                  {scriptPreview}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
