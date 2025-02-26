import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Wand2, Copy, FileDown, Upload } from "lucide-react";
import { generateInDesignScript, parsePromptForOptions, analyzeScript } from "@/utils/indesignScriptGenerator";

const Transcription = () => {
  const [manuscript, setManuscript] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generatedScript, setGeneratedScript] = useState("");
  const [importedScript, setImportedScript] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleGenerate = () => {
    if (!manuscript || !prompt) {
      toast({
        title: "入力エラー",
        description: "原稿とプロンプトの両方を入力してください。",
        variant: "destructive",
      });
      return;
    }

    // インポートされたスクリプトがある場合は、そのスタイルを参考にする
    const importedOptions = importedScript ? analyzeScript(importedScript) : {};
    const promptOptions = parsePromptForOptions(prompt);
    const options = { ...promptOptions, ...importedOptions };
    
    const script = generateInDesignScript(manuscript, prompt, options);
    setGeneratedScript(script);
    
    toast({
      title: "生成完了",
      description: "InDesignスクリプトの生成が完了しました。",
    });
  };

  const handleImportScript = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // InDesignファイル（.indd）の場合は警告を表示
      if (file.name.toLowerCase().endsWith('.indd')) {
        toast({
          title: "注意",
          description: "InDesignドキュメント（.indd）は直接読み込めません。スクリプトファイル（.jsx, .js）をインポートしてください。",
          variant: "destructive",
        });
        return;
      }

      const text = await file.text();
      setImportedScript(text);

      // スクリプトの解析結果をプロンプトに反映
      const analysis = analyzeScript(text);
      const newPrompt = [
        "以下の設定で組版:",
        analysis.isVertical ? "・縦書き" : "・横書き",
        `・フォント: ${analysis.fontFamily || "未設定"}`,
        `・フォントサイズ: ${analysis.fontSize || "未設定"}pt`,
        `・行送り: ${analysis.lineHeight || "未設定"}pt`,
        `・マージン: 上${analysis.marginTop}mm 下${analysis.marginBottom}mm 左${analysis.marginLeft}mm 右${analysis.marginRight}mm`,
      ].join("\n");
      
      setPrompt(newPrompt);
      
      toast({
        title: "スクリプトインポート完了",
        description: "インポートしたスクリプトの設定を反映しました。",
      });
    } catch (error) {
      toast({
        title: "インポートエラー",
        description: "スクリプトの読み込みに失敗しました。テキスト形式のスクリプトファイルのみ対応しています。",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedScript);
    toast({
      title: "コピー完了",
      description: "スクリプトをクリップボードにコピーしました。",
    });
  };

  const handleDownload = () => {
    const blob = new Blob([generatedScript], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "indesign-script.jsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "ダウンロード完了",
      description: "スクリプトファイルのダウンロードが完了しました。",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>InDesign スクリプト生成</CardTitle>
          <CardDescription>
            既存のスクリプトをインポートして同様の設定で新しいスクリプトを生成できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="lg"
              className="w-full max-w-md"
            >
              <Upload className="mr-2" />
              見本スクリプトをインポート
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jsx,.js,.indid,.indd"
              onChange={handleImportScript}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {importedScript && (
          <Card>
            <CardHeader>
              <CardTitle>インポートしたスクリプト</CardTitle>
              <CardDescription>
                このスクリプトの設定を参考にして新しいスクリプトを生成します
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] w-full rounded-md border">
                <pre className="p-4 font-mono text-sm">
                  {importedScript}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>原稿入力</CardTitle>
            <CardDescription>
              InDesignで組版したい原稿を入力してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={manuscript}
              onChange={(e) => setManuscript(e.target.value)}
              placeholder="ここに原稿を入力してください..."
              className="min-h-[300px]"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>プロンプト入力</CardTitle>
            <CardDescription>
              {importedScript 
                ? "インポートしたスクリプトから解析した設定が反映されています。必要に応じて編集してください。"
                : "組版の指示内容を入力してください。例：縦書き、本文フォントは明朝体、マージン上下20mm左右15mm"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="組版の指示を入力してください..."
              className="min-h-[300px]"
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={handleGenerate}
          size="lg"
          className="w-full max-w-md text-lg py-6"
        >
          <Wand2 className="mr-2" />
          スクリプトを生成
        </Button>
      </div>

      {generatedScript && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>生成されたスクリプト</CardTitle>
              <div className="flex gap-2">
                <Button onClick={handleCopy} size="sm">
                  <Copy className="mr-2" />
                  コピー
                </Button>
                <Button onClick={handleDownload} size="sm">
                  <FileDown className="mr-2" />
                  ダウンロード
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] w-full rounded-md border">
              <pre className="p-4 font-mono text-sm">
                {generatedScript}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Transcription;
