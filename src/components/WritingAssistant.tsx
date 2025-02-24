
import React, { useState, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Wand2, MessagesSquare, Eraser, ArrowRightLeft } from "lucide-react";

interface WritingAssistantProps {
  apiKey: string;
}

const WritingAssistant: React.FC<WritingAssistantProps> = ({ apiKey }) => {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const handleSelectionChange = () => {
    if (textareaRef.current) {
      setSelection({
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd
      });
    }
  };

  const getSelectedText = () => {
    return content.substring(selection.start, selection.end);
  };

  const replaceSelection = (newText: string) => {
    const before = content.substring(0, selection.start);
    const after = content.substring(selection.end);
    setContent(before + newText + after);
  };

  const handleAIAction = async (action: string, prompt?: string) => {
    if (!apiKey) {
      toast({
        title: "API キーが必要です",
        description: "Gemini API キーを設定してください。",
        variant: "destructive",
      });
      return;
    }

    const selectedText = getSelectedText();
    if (!selectedText && action !== "continue") {
      toast({
        title: "テキストを選択してください",
        description: "編集したいテキストを選択してから操作を行ってください。",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

      let systemPrompt = "";
      switch (action) {
        case "improve":
          systemPrompt = `以下のテキストを改善してください。文章を洗練させ、より魅力的にしてください：\n\n${selectedText}`;
          break;
        case "continue":
          systemPrompt = `以下のテキストの続きを自然な形で展開してください：\n\n${content}`;
          break;
        case "rewrite":
          systemPrompt = `以下のテキストを別の表現で書き換えてください：\n\n${selectedText}`;
          break;
        case "custom":
          systemPrompt = `${prompt}\n\n${selectedText}`;
          break;
      }

      const result = await model.generateContent(systemPrompt);
      const generatedText = result.response.text();

      if (action === "continue") {
        setContent(content + " " + generatedText);
      } else {
        replaceSelection(generatedText);
      }

      toast({
        title: "生成完了",
        description: "テキストが正常に生成されました。",
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "テキスト生成中にエラーが発生しました。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Writing Assistant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6">
              <div className="space-y-4">
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onSelect={handleSelectionChange}
                  placeholder="ここに文章を入力してください..."
                  className="min-h-[400px] font-mono text-base"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={() => handleAIAction("continue")}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    <MessagesSquare className="w-4 h-4" />
                    続きを生成
                  </Button>
                  <Button
                    onClick={() => handleAIAction("improve")}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    <Wand2 className="w-4 h-4" />
                    文章を改善
                  </Button>
                  <Button
                    onClick={() => handleAIAction("rewrite")}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    書き換え
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setContent("")}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    <Eraser className="w-4 h-4" />
                    クリア
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">カスタムプロンプト</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder="カスタムプロンプトを入力..."
                      className="min-h-[100px]"
                      id="customPrompt"
                    />
                    <Button
                      onClick={() => {
                        const prompt = (document.getElementById("customPrompt") as HTMLTextAreaElement).value;
                        handleAIAction("custom", prompt);
                      }}
                      disabled={isLoading}
                      className="w-full"
                    >
                      実行
                    </Button>
                  </CardContent>
                </Card>
                <div className="text-sm text-muted-foreground">
                  <p>使い方:</p>
                  <ul className="list-disc pl-4 space-y-2 mt-2">
                    <li>テキストを入力または貼り付けてください</li>
                    <li>編集したい部分を選択してください</li>
                    <li>操作ボタンを選択してください</li>
                    <li>または、カスタムプロンプトを使用して独自の指示を与えてください</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WritingAssistant;
