
import { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const GeminiForm = () => {
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [streamingResponse, setStreamingResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState("gemini-1.5-flash");
  const [isStreaming, setIsStreaming] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey) {
      toast({
        title: "API キーが必要です",
        description: "Gemini API キーを入力してください。",
        variant: "destructive",
      });
      return;
    }

    if (!prompt) {
      toast({
        title: "プロンプトが必要です",
        description: "生成するコンテンツのプロンプトを入力してください。",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setStreamingResponse("");
    
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const genModel = genAI.getGenerativeModel({ model });
      
      if (isStreaming) {
        const result = await genModel.generateContentStream(prompt);
        let fullResponse = "";
        
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullResponse += chunkText;
          setStreamingResponse(fullResponse);
        }
        
        setResponse(fullResponse);
      } else {
        const result = await genModel.generateContent(prompt);
        setResponse(result.response.text());
      }
      
      toast({
        title: "成功",
        description: "コンテンツが正常に生成されました！",
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "コンテンツの生成に失敗しました。API キーを確認して、もう一度お試しください。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-slow">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Gemini Genius Lab</h1>
          <p className="text-muted-foreground">
            Gemini API の力を、エレガントなインターフェースで体験
          </p>
        </div>

        <Card className="p-6 backdrop-blur-sm bg-card/80 border shadow-lg animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Gemini API キーを入力"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full transition-all duration-200 hover:border-primary/50 focus:border-primary"
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Select 
                  value={model}
                  onValueChange={setModel}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="モデルを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini-1.5-flash">gemini-1.5-flash</SelectItem>
                    <SelectItem value="gemini-1.0-pro">gemini-1.0-pro</SelectItem>
                    <SelectItem value="gemini-1.0-pro-vision">gemini-1.0-pro-vision</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsStreaming(!isStreaming)}
                className={`${isStreaming ? 'bg-primary text-primary-foreground' : ''}`}
              >
                {isStreaming ? "ストリーミング: オン" : "ストリーミング: オフ"}
              </Button>
            </div>

            <div className="space-y-2">
              <Textarea
                placeholder="プロンプトを入力..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[150px] transition-all duration-200 hover:border-primary/50 focus:border-primary"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? "生成中..." : "コンテンツを生成"}
            </Button>
          </form>
        </Card>

        {(response || streamingResponse) && (
          <Card className="p-6 backdrop-blur-sm bg-card/80 border shadow-lg animate-fade-in">
            <h2 className="text-xl font-semibold mb-4">応答</h2>
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-lg">
                {isStreaming ? streamingResponse : response}
              </pre>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GeminiForm;
