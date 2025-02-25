
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, RefreshCcw, Upload, Wand2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function Transcription() {
  const [manuscriptText, setManuscriptText] = useState("");
  const [prompt, setPrompt] = useState("A4サイズの縦書き、明朝体で本文を組んでください。");
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
    // この部分は後でAIによる生成に置き換えることができます
    const script = `#target "InDesign"
// 基本設定
app.scriptPreferences.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT;
app.scriptPreferences.enableRedraw = false;

// 新規ドキュメント作成 (${prompt} に基づく設定)
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

// テキストの設定 (プロンプトに基づく設定)
textFrame.contents = "${manuscriptText.replace(/"/g, '\\"').replace(/\n/g, '\\r')}";
var text = textFrame.texts[0];
text.appliedFont = "Hiragino Mincho ProN"; // プロンプトに基づいて変更
text.pointSize = 10.5;
text.leading = 16;
text.verticalScale = 100;
text.composer = "Japanese Composer";
text.writingDirection = WritingDirectionValues.VERTICAL; // プロンプトに基づいて変更

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

      <div className="grid gap-6">
        {/* リソースリンク */}
        <Card>
          <CardHeader>
            <CardTitle>InDesignリソース</CardTitle>
            <CardDescription>
              InDesignスクリプトの開発に役立つリソース
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              <a 
                href="https://www.adobe.com/jp/products/indesign.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Adobe InDesign 公式サイト
              </a>
              <a 
                href="https://www.adobe.com/jp/products/indesign/scripting.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                InDesignスクリプティングガイド
              </a>
              <a 
                href="https://creative.adobe.com/ja/products/download/indesign" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                InDesignダウンロード
              </a>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 左カラム：原稿入力 */}
          <Card>
            <CardHeader>
              <CardTitle>原稿入力</CardTitle>
              <CardDescription>
                テキストファイルをアップロードするか、直接入力してください
              </CardDescription>
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">AIプロンプト</label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      if (manuscriptText.trim()) {
                        generateScript();
                      }
                    }}
                    placeholder="例: A4サイズの縦書き、明朝体で本文を組んでください。"
                    className="min-h-[100px]"
                  />
                  <p className="text-sm text-muted-foreground">
                    プロンプトの例:
                    <br />
                    • A4サイズの縦書き、明朝体で本文を組んでください
                    <br />
                    • B5サイズで、横書き、ゴシック体、行間を広めに設定してください
                    <br />
                    • 見開きページで、外側のマージンを広めに設定してください
                  </p>
                </div>
                <Textarea
                  value={manuscriptText}
                  onChange={(e) => {
                    setManuscriptText(e.target.value);
                    if (e.target.value.trim()) {
                      generateScript();
                    }
                  }}
                  placeholder="ここに原稿テキストを入力してください..."
                  className="min-h-[400px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* 右カラム：スクリプトプレビューとダウンロード */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>InDesignスクリプト</span>
                <div className="flex gap-2">
                  <Button 
                    variant="secondary"
                    onClick={() => {
                      if (manuscriptText.trim()) {
                        generateScript();
                      }
                    }}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    スクリプト生成
                  </Button>
                  <Button 
                    variant="default"
                    onClick={handleDownloadScript}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    ダウンロード
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                生成されたスクリプトをダウンロードしてInDesignで実行できます
              </CardDescription>
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
                <div className="text-sm text-muted-foreground">
                  <p>スクリプトの使い方:</p>
                  <ol className="list-decimal list-inside space-y-1 mt-2">
                    <li>スクリプトをダウンロード</li>
                    <li>InDesignを起動</li>
                    <li>ファイル &gt; スクリプト &gt; スクリプトを実行</li>
                    <li>ダウンロードしたスクリプトを選択</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
