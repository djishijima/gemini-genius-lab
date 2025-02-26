
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { generateInDesignScript, parsePromptForOptions } from "@/utils/indesignScriptGenerator";
import { Textarea } from "./ui/textarea";
import { Copy, FileDown } from "lucide-react";
import { useToast } from "./ui/use-toast";

export function GeminiForm() {
  const [manuscript, setManuscript] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generatedScript, setGeneratedScript] = useState("");
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

    const options = parsePromptForOptions(prompt);
    const script = generateInDesignScript(manuscript, prompt, options);
    setGeneratedScript(script);
    
    toast({
      title: "スクリプト生成完了",
      description: "InDesignスクリプトの生成が完了しました。",
    });
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
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100 text-2xl">InDesign スクリプトジェネレーター</CardTitle>
          <CardDescription className="text-slate-400">
            原稿とプロンプトを入力して、InDesignスクリプトを生成します
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-slate-100">原稿入力</CardTitle>
            <CardDescription className="text-slate-400">
              InDesignで組版したい原稿を入力してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={manuscript}
              onChange={(e) => setManuscript(e.target.value)}
              placeholder="ここに原稿を入力..."
              className="min-h-[300px] bg-slate-900 border-slate-700 text-slate-100"
            />
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-slate-100">プロンプト入力</CardTitle>
            <CardDescription className="text-slate-400">
              組版の指示（縦書き・横書き、フォント、マージンなど）を入力してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="例: 縦書き、明朝体、マージン上下20mm左右15mm..."
              className="min-h-[300px] bg-slate-900 border-slate-700 text-slate-100"
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={handleGenerate}
          className="w-full max-w-md text-lg py-6"
          size="lg"
          variant="outline"
        >
          スクリプトを生成
        </Button>
      </div>

      {generatedScript && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-slate-100">生成されたスクリプト</CardTitle>
                <CardDescription className="text-slate-400">
                  生成されたInDesignスクリプトをコピーまたはダウンロードできます
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Copy className="w-4 h-4" />
                  コピー
                </Button>
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  ダウンロード
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] w-full rounded-md border border-slate-700">
              <pre className="p-4 text-slate-100 font-mono text-sm">
                {generatedScript}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
