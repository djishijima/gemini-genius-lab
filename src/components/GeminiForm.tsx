
import { useState, useRef, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, X, FileText } from "lucide-react";

const MODEL_TOKEN_LIMITS = {
  "gemini-1.5-flash": 1000000,
  "gemini-1.0-pro": 32768,
  "gemini-1.0-pro-vision": 32768,
};

const GeminiForm = () => {
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [streamingResponse, setStreamingResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState("gemini-1.5-flash");
  const [isStreaming, setIsStreaming] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfName, setPdfName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [estimatedTokens, setEstimatedTokens] = useState(0);

  const estimateTokens = (text: string) => {
    return Math.ceil(text.length / 4);
  };

  useEffect(() => {
    setEstimatedTokens(estimateTokens(prompt));
  }, [prompt]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "画像サイズが大きすぎます",
          description: "20MB以下の画像を選択してください。",
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "無効なファイル形式",
          description: "画像ファイルを選択してください。",
          variant: "destructive",
        });
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "PDFサイズが大きすぎます",
          description: "20MB以下のPDFを選択してください。",
          variant: "destructive",
        });
        return;
      }

      if (file.type !== 'application/pdf') {
        toast({
          title: "無効なファイル形式",
          description: "PDFファイルを選択してください。",
          variant: "destructive",
        });
        return;
      }

      setPdfFile(file);
      setPdfName(file.name);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePdf = () => {
    setPdfFile(null);
    setPdfName("");
    if (pdfInputRef.current) {
      pdfInputRef.current.value = "";
    }
  };

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
      
      if (imageFile && model === "gemini-1.0-pro-vision") {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const imageData = reader.result as string;
          const base64Image = imageData.split(',')[1];
          
          const result = await genModel.generateContent([
            {
              inlineData: {
                data: base64Image,
                mimeType: imageFile.type
              }
            },
            prompt
          ]);
          
          setResponse(result.response.text());
        };
        reader.readAsDataURL(imageFile);
      } else if (pdfFile) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const pdfData = reader.result as string;
          const base64Pdf = pdfData.split(',')[1];
          
          const result = await genModel.generateContent([
            {
              inlineData: {
                data: base64Pdf,
                mimeType: "application/pdf"
              }
            },
            prompt
          ]);
          
          setResponse(result.response.text());
        };
        reader.readAsDataURL(pdfFile);
      } else if (isStreaming) {
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
                    <SelectItem value="gemini-1.5-flash">gemini-1.5-flash (100万トークン)</SelectItem>
                    <SelectItem value="gemini-1.0-pro">gemini-1.0-pro (32Kトークン)</SelectItem>
                    <SelectItem value="gemini-1.0-pro-vision">gemini-1.0-pro-vision (32Kトークン + 画像)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {model !== "gemini-1.0-pro-vision" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsStreaming(!isStreaming)}
                  className={`${isStreaming ? 'bg-primary text-primary-foreground' : ''}`}
                >
                  {isStreaming ? "ストリーミング: オン" : "ストリーミング: オフ"}
                </Button>
              )}
            </div>

            {model === "gemini-1.0-pro-vision" && (
              <div className="space-y-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  ref={fileInputRef}
                />
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-32 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <div className="relative w-full h-full">
                      <img
                        src={imagePreview}
                        alt="Uploaded preview"
                        className="object-contain w-full h-full"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage();
                        }}
                        className="absolute top-2 right-2 p-1 bg-background/80 rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <ImagePlus className="h-8 w-8 mb-2" />
                      <span>画像をアップロード</span>
                    </div>
                  )}
                </Button>
              </div>
            )}

            <div className="space-y-4">
              <input
                type="file"
                accept="application/pdf"
                onChange={handlePdfUpload}
                className="hidden"
                ref={pdfInputRef}
              />
              
              <Button
                type="button"
                variant="outline"
                className="w-full h-16 border-dashed"
                onClick={() => pdfInputRef.current?.click()}
              >
                {pdfName ? (
                  <div className="relative w-full flex items-center justify-center">
                    <FileText className="h-6 w-6 mr-2" />
                    <span className="truncate max-w-[200px]">{pdfName}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePdf();
                      }}
                      className="absolute right-2 p-1 bg-background/80 rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center text-muted-foreground">
                    <FileText className="h-6 w-6 mr-2" />
                    <span>PDFをアップロード</span>
                  </div>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                <span>プロンプトを入力...</span>
                <span className={estimatedTokens > MODEL_TOKEN_LIMITS[model] ? "text-destructive" : ""}>
                  推定トークン数: {estimatedTokens.toLocaleString()} / {MODEL_TOKEN_LIMITS[model].toLocaleString()}
                </span>
              </div>
              <Textarea
                placeholder="プロンプトを入力..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[150px] transition-all duration-200 hover:border-primary/50 focus:border-primary"
              />
              {estimatedTokens > MODEL_TOKEN_LIMITS[model] && (
                <p className="text-sm text-destructive">
                  警告: 入力テキストが選択したモデルのトークン制限を超えています
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full transition-all duration-200"
              disabled={isLoading || estimatedTokens > MODEL_TOKEN_LIMITS[model]}
            >
              {isLoading ? "生成中..." : "コンテンツを生成"}
            </Button>
          </form>
        </Card>

        {(response || streamingResponse) && (
          <Card className="p-6 backdrop-blur-sm bg-card/80 border shadow-lg animate-fade-in">
            <h2 className="text-xl font-semibold mb-4">応答</h2>
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-lg overflow-auto max-h-[600px]">
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
