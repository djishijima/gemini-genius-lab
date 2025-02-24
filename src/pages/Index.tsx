
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import WritingAssistant from "@/components/WritingAssistant";

export default function Index() {
  const [apiKey, setApiKey] = useState("");

  return (
    <div className="min-h-screen bg-background">
      {!apiKey ? (
        <div className="container mx-auto p-6 md:p-12">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Gemini API キーの設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="password"
                placeholder="API キーを入力..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Gemini API キーを入力してWriting Assistantを使用開始してください。
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <WritingAssistant apiKey={apiKey} />
      )}
    </div>
  );
}
