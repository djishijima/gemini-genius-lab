
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ArrowLeft, RefreshCcw, Upload, Wand2, ExternalLink, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import * as pdfjsLib from 'pdfjs-dist';
import { generateInDesignScript, parsePromptForOptions } from "@/utils/indesignScriptGenerator";

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
      const options = parsePromptForOptions(prompt);
      const script = generateInDesignScript(manuscriptText, prompt, options);
      setGeneratedScript(script);
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
    <div className="container mx-auto p-4">
      <Button 
        variant="ghost" 
        onClick={() => navigate("/")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        戻る
      </Button>

      <div className="grid gap-4">
        <Card className="mb-4">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="text-2xl font-bold text-primary">InDesign スクリプトジェネレーター</CardTitle>
            <CardDescription className="text-base text-muted-foreground/80">
              テキストファイルをアップロードして、InDesignスクリプトを生成します
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8 pt-6">
            <div className="flex flex-col gap-3">
              <label className="text-base font-semibold text-foreground">テキストファイルをアップロード</label>
              <Input
                type="file"
                accept=".txt,.pdf"
                onChange={handleFileUpload}
                className="w-full border-2 border-border/60 bg-background/50 hover:border-primary/50 focus:border-primary shadow-sm [&::file-selector-button]:bg-[#FEF7CD] [&::file-selector-button]:text-gray-700 [&::file-selector-button]:border-0"
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-base font-semibold text-foreground">設定プロンプト</label>
              <Textarea
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  if (manuscriptText.trim()) {
                    generateScript();
                  }
                }}
                placeholder="例: A4サイズの縦書き、明朝体で本文を組んでください。"
                className="min-h-[80px] resize-none border-2 border-border/60 bg-background/50 hover:border-primary/50 focus:border-primary shadow-sm placeholder:text-[#FEF7CD]"
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

            <div className="flex flex-col gap-3">
              <label className="text-base font-semibold text-foreground">原稿テキスト</label>
              <Textarea
                value={manuscriptText}
                onChange={(e) => {
                  setManuscriptText(e.target.value);
                  if (e.target.value.trim() && prompt.trim()) {
                    generateScript();
                  }
                }}
                placeholder="ここに原稿テキストを入力するか、ファイルをアップロードしてください..."
                className="min-h-[200px] border-2 border-border/60 bg-background/50 hover:border-primary/50 focus:border-primary shadow-sm placeholder:text-[#FEF7CD]"
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <label className="text-base font-semibold text-foreground">生成されたスクリプト</label>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleReset}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    リセット
                  </Button>
                  <Button
                    size="sm"
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
                  {generatedScript && (
                    <Button 
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={`data:text/plain;charset=utf-8,${encodeURIComponent(generatedScript)}`}
                        download="indesign_script.jsx"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        ダウンロード
                      </a>
                    </Button>
                  )}
                </div>
              </div>
              <Textarea
                value={generatedScript}
                readOnly
                placeholder="スクリプトはここに表示されます..."
                className="min-h-[200px] font-mono text-sm border-2 border-border/60 bg-muted/20 hover:border-primary/50 focus:border-primary shadow-sm placeholder:text-[#FEF7CD]"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
