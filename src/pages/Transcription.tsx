
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Wand2, Copy, FileDown, Upload, Eye } from "lucide-react";
import { generateInDesignScript, parsePromptForOptions } from "@/utils/indesignScriptGenerator";

const Transcription = () => {
  const [manuscript, setManuscript] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generatedScript, setGeneratedScript] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
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

    const options = parsePromptForOptions(prompt);
    const script = generateInDesignScript(manuscript, prompt, options);
    setGeneratedScript(script);
    
    toast({
      title: "生成完了",
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

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setGeneratedScript(text);
      
      // スクリプトから原稿とプロンプトを解析する試み
      const manuscriptMatch = text.match(/contents = "(.*?)"/);
      const promptMatch = text.match(/\/\/ Prompt: (.*?)\n/);
      
      if (manuscriptMatch?.[1]) {
        setManuscript(manuscriptMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'));
      }
      if (promptMatch?.[1]) {
        setPrompt(promptMatch[1]);
      }

      toast({
        title: "インポート完了",
        description: "スクリプトのインポートが完了しました。",
      });
    } catch (error) {
      toast({
        title: "インポートエラー",
        description: "スクリプトの読み込みに失敗しました。",
        variant: "destructive",
      });
    }
  };

  const togglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100 text-2xl">InDesign スクリプト生成</CardTitle>
          <CardDescription className="text-slate-400">
            原稿とプロンプトから、InDesignの自動組版スクリプトを生成します
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
          <CardContent className="pt-6">
            <Textarea
              value={manuscript}
              onChange={(e) => setManuscript(e.target.value)}
              placeholder="ここに原稿を入力してください..."
              className="min-h-[300px] bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
            />
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-slate-100">プロンプト入力</CardTitle>
            <CardDescription className="text-slate-400">
              組版の指示内容を入力してください
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="例: 縦書き、本文フォントは明朝体、マージン上下20mm左右15mm..."
              className="min-h-[300px] bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center gap-4">
        <Button
          onClick={handleGenerate}
          className="w-full max-w-md text-lg py-6 bg-[hsl(198,93%,60%)] hover:bg-[hsl(198,93%,50%)] text-slate-900 font-medium"
          size="lg"
        >
          <Wand2 className="mr-2 h-5 w-5" />
          スクリプトを生成
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jsx,.js"
          onChange={handleImport}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="w-full max-w-md text-lg py-6"
          variant="outline"
          size="lg"
        >
          <Upload className="mr-2 h-5 w-5" />
          スクリプトをインポート
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
                  onClick={togglePreview}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  {isPreviewMode ? "コードを表示" : "プレビュー"}
                </Button>
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
          <CardContent className="pt-6">
            <ScrollArea className="h-[400px] w-full rounded-md border border-slate-700">
              {isPreviewMode ? (
                <div className="p-4 font-serif text-slate-100">
                  {manuscript.split('\n').map((line, i) => (
                    <p key={i} className="mb-4">{line}</p>
                  ))}
                </div>
              ) : (
                <pre className="p-4 text-slate-100 font-mono text-sm">
                  {generatedScript}
                </pre>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Transcription;
