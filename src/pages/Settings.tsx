
import React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiKeyInput } from "@/components/ApiKeyInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const [projectId, setProjectId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSave = () => {
    if (!projectId.trim() || !apiKey.trim()) {
      toast({
        title: "エラー",
        description: "全てのフィールドを入力してください",
        variant: "destructive",
      });
      return;
    }

    // LocalStorageに保存
    localStorage.setItem("googleCloudProjectId", projectId);
    localStorage.setItem("googleCloudApiKey", apiKey);

    toast({
      title: "成功",
      description: "設定を保存しました",
    });
  };

  // 保存された設定を読み込む
  React.useEffect(() => {
    const savedProjectId = localStorage.getItem("googleCloudProjectId");
    const savedApiKey = localStorage.getItem("googleCloudApiKey");

    if (savedProjectId) setProjectId(savedProjectId);
    if (savedApiKey) setApiKey(savedApiKey);
  }, []);

  return (
    <div className="container mx-auto p-6">
      <Button 
        variant="ghost" 
        onClick={() => navigate("/")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        戻る
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Google Cloud 設定</CardTitle>
          <CardDescription>
            Google Cloud のプロジェクトIDとAPIキーを設定してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projectId">Google Cloud プロジェクトID</Label>
            <Input
              id="projectId"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="プロジェクトIDを入力してください"
            />
          </div>

          <ApiKeyInput 
            apiKey={apiKey}
            onChange={setApiKey}
          />

          <Button onClick={handleSave}>設定を保存</Button>
        </CardContent>
      </Card>
    </div>
  );
}
