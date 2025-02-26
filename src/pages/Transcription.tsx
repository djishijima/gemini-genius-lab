
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Wand2, Copy, FileDown } from "lucide-react";
import { generateInDesignScript, parsePromptForOptions } from "@/utils/indesignScriptGenerator";

const Transcription = () => {
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>InDesign スクリプト生成</CardTitle>
          <CardDescription>
            原稿とプロンプトから、InDesignの自動組版スクリプトを生成します
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
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
              組版の指示内容を入力してください。
              例：縦書き、本文フォントは明朝体、マージン上下20mm左右15mm
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
