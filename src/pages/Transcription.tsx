import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ArrowLeft, RefreshCcw, Upload, Wand2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function Transcription() {
  const [manuscriptText, setManuscriptText] = useState("");
  const [prompt, setPrompt] = useState("A4サイズの縦書き、明朝体で本文を組んでください。");
  const [generatedScript, setGeneratedScript] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const generateScript = useCallback(async () => {
    if (!manuscriptText.trim()) {
      toast({
        title: "エラー",
        description: "原稿テキストを入力してください。",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Replace this with your actual script generation logic
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const mockScript = `// Generated InDesign Script
// Prompt: ${prompt}

// Manuscript:
${manuscriptText}

// Add your InDesign scripting code here based on the prompt and manuscript.`;
      
      setGeneratedScript(mockScript);
      toast({
        title: "成功",
        description: "スクリプトを生成しました。",
      });
    } catch (error) {
      console.error("Error generating script:", error);
      toast({
        title: "エラー",
        description: "スクリプトの生成に失敗しました。",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [manuscriptText, prompt, toast]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    const tryReadWithEncodings = async (file: File, encodings: string[]) => {
      for (const encoding of encodings) {
        try {
          const blob = new Blob([await file.arrayBuffer()], { type: file.type });
          const reader = new FileReader();
          reader.readAsText(blob, encoding);
          
          const text = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
          });
          
          if (!text.includes('�') && !text.includes('□')) {
            return text;
          }
        } catch (error) {
          console.error(`Error reading with ${encoding}:`, error);
        }
      }
      return null;
    };

    if (file.type === "application/pdf") {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfData = new Uint8Array(arrayBuffer);
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const maxPages = pdf.numPages;
        let text = "";
        
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str);
          text += strings.join(" ") + "\n";
        }
        
        setManuscriptText(text);
        if (prompt.trim()) {
          generateScript();
        }
      } catch (error) {
        console.error("Error reading PDF:", error);
        toast({
          title: "エラー",
          description: "PDFファイルの読み込みに失敗しました。",
          variant: "destructive"
        });
      }
    } else {
      const encodings = ['UTF-8', 'Shift-JIS', 'EUC-JP', 'ISO-2022-JP'];
      const text = await tryReadWithEncodings(file, encodings);
      
      if (text) {
        setManuscriptText(text);
        if (prompt.trim()) {
          generateScript();
        }
      } else {
        toast({
          title: "エラー",
          description: "テキストの読み込みに失敗しました。ファイルのエンコーディングを確認してください。",
          variant: "destructive"
        });
      }
    }
  };

  const handleReset = () => {
    setManuscriptText("");
    setPrompt("");
    setGeneratedScript("");
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
          <div className="grid gap-6">
            <Card className="h-[800px] flex flex-col">
              <CardHeader>
                <CardTitle>原稿入力</CardTitle>
                <CardDescription>
                  テキストファイルをアップロードするか、直接入力してください
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                <div className="flex-none">
                  <Input
                    type="file"
                    accept=".txt,.pdf"
                    onChange={handleFileUpload}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    テキストファイルをアップロードするか、下のテキストエリアに直接コピー&ペーストしてください。
                  </p>
                </div>

                <div className="flex-none space-y-2">
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
                    className="h-[100px] resize-none"
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

                <div className="flex-1">
                  <Textarea
                    value={manuscriptText}
                    onChange={(e) => {
                      setManuscriptText(e.target.value);
                      if (e.target.value.trim()) {
                        generateScript();
                      }
                    }}
                    placeholder="ここに原稿テキストを入力してください..."
                    className="h-full resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6">
            <Card className="h-[800px] flex flex-col">
              <CardHeader>
                <CardTitle>InDesign スクリプトプレビュー</CardTitle>
                <CardDescription>
                  生成されたスクリプトのプレビュー
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <Textarea
                  value={generatedScript}
                  readOnly
                  placeholder="スクリプトはここに表示されます..."
                  className="h-full resize-none"
                />
              </CardContent>
            </Card>
            <div className="flex justify-between">
              <Button
                variant="secondary"
                onClick={handleReset}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                リセット
              </Button>
              <Button
                onClick={generateScript}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Wand2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    スクリプト生成
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
