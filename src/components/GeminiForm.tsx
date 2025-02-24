
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
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState("gemini-1.5-flash");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your Gemini API key to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!prompt) {
      toast({
        title: "Prompt Required",
        description: "Please enter a prompt to generate content.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const genModel = genAI.getGenerativeModel({ model });
      
      const result = await genModel.generateContent(prompt);
      setResponse(result.response.text());
      
      toast({
        title: "Success",
        description: "Content generated successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate content. Please check your API key and try again.",
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
            Experience the power of Gemini API with this elegant interface
          </p>
        </div>

        <Card className="p-6 backdrop-blur-sm bg-card/80 border shadow-lg animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter your Gemini API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full transition-all duration-200 hover:border-primary/50 focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Select 
                value={model}
                onValueChange={setModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-1.5-flash">gemini-1.5-flash</SelectItem>
                  <SelectItem value="gemini-1.0-pro">gemini-1.0-pro</SelectItem>
                  <SelectItem value="gemini-1.0-pro-vision">gemini-1.0-pro-vision</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Textarea
                placeholder="Enter your prompt here..."
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
              {isLoading ? "Generating..." : "Generate Content"}
            </Button>
          </form>
        </Card>

        {response && (
          <Card className="p-6 backdrop-blur-sm bg-card/80 border shadow-lg animate-fade-in">
            <h2 className="text-xl font-semibold mb-4">Response</h2>
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-lg">
                {response}
              </pre>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GeminiForm;
