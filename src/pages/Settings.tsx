import React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiKeyInput } from "@/components/ApiKeyInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export default function Settings() {
  // Google Cloud 基本設定
  const [projectId, setProjectId] = useState("");
  const [apiKey, setApiKey] = useState("");
  
  // Document AI 設定
  const [processorId, setProcessorId] = useState("");
  const [processorLocation, setProcessorLocation] = useState("us");
  const [bucketName, setBucketName] = useState("");
  const [credentialsJson, setCredentialsJson] = useState("");
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSave = () => {
    // 必須項目のチェック
    if (!projectId.trim() || !apiKey.trim()) {
      toast({
        title: "エラー",
        description: "Google CloudのプロジェクトIDとAPIキーは必須です",
        variant: "destructive",
      });
      return;
    }

    // DocumentAIの必須項目チェック
    if (processorId.trim() && (!processorLocation.trim() || !bucketName.trim())) {
      toast({
        title: "エラー",
        description: "Document AIを使用する場合は、プロセッサID、ロケーション、バケット名が必要です",
        variant: "destructive",
      });
      return;
    }

    try {
      // JSON形式の検証
      if (credentialsJson.trim()) {
        JSON.parse(credentialsJson);
      }

      // LocalStorageに保存 - Google Cloud基本設定
      localStorage.setItem("googleCloudProjectId", projectId);
      localStorage.setItem("googleCloudApiKey", apiKey);

      // LocalStorageに保存 - Document AI設定
      localStorage.setItem("documentAiProcessorId", processorId);
      localStorage.setItem("documentAiProcessorLocation", processorLocation);
      localStorage.setItem("documentAiBucketName", bucketName);
      localStorage.setItem("documentAiCredentialsJson", credentialsJson);

      toast({
        title: "成功",
        description: "設定を保存しました",
      });
    } catch (e) {
      toast({
        title: "エラー",
        description: "クレデンシャルJSONの形式が不正です",
        variant: "destructive",
      });
    }
  };

  // 保存された設定を読み込む
  React.useEffect(() => {
    // Google Cloud基本設定の読み込み
    const savedProjectId = localStorage.getItem("googleCloudProjectId");
    const savedApiKey = localStorage.getItem("googleCloudApiKey");

    if (savedProjectId) setProjectId(savedProjectId);
    if (savedApiKey) setApiKey(savedApiKey);
    
    // Document AI設定の読み込み
    const savedProcessorId = localStorage.getItem("documentAiProcessorId");
    const savedProcessorLocation = localStorage.getItem("documentAiProcessorLocation");
    const savedBucketName = localStorage.getItem("documentAiBucketName");
    const savedCredentialsJson = localStorage.getItem("documentAiCredentialsJson");
    
    if (savedProcessorId) setProcessorId(savedProcessorId);
    if (savedProcessorLocation) setProcessorLocation(savedProcessorLocation);
    if (savedBucketName) setBucketName(savedBucketName);
    if (savedCredentialsJson) setCredentialsJson(savedCredentialsJson);
  }, []);

  return (
    <div className="container mx-auto p-6">
      <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        戻る
      </Button>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>アプリケーション設定</CardTitle>
            <CardDescription>
              Google CloudとDocument AIの設定を行います
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="google-cloud" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="google-cloud">Google Cloud 基本設定</TabsTrigger>
                <TabsTrigger value="document-ai">Document AI 設定</TabsTrigger>
              </TabsList>
              
              {/* Google Cloud基本設定タブ */}
              <TabsContent value="google-cloud" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="projectId">Google Cloud プロジェクトID</Label>
                  <Input
                    id="projectId"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="プロジェクトIDを入力してください"
                  />
                </div>

                <ApiKeyInput apiKey={apiKey} onChange={setApiKey} />
              </TabsContent>
              
              {/* Document AI設定タブ */}
              <TabsContent value="document-ai" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="processorId">Document AI プロセッサID</Label>
                  <Input
                    id="processorId"
                    value={processorId}
                    onChange={(e) => setProcessorId(e.target.value)}
                    placeholder="プロセッサIDを入力してください"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="processorLocation">Document AI ロケーション</Label>
                  <Input
                    id="processorLocation"
                    value={processorLocation}
                    onChange={(e) => setProcessorLocation(e.target.value)}
                    placeholder="ロケーションを入力してください (例: us, asia-northeast1)"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bucketName">Cloud Storage バケット名</Label>
                  <Input
                    id="bucketName"
                    value={bucketName}
                    onChange={(e) => setBucketName(e.target.value)}
                    placeholder="バケット名を入力してください"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="credentialsJson">Google Cloud クレデンシャルJSON (オプション)</Label>
                  <Textarea
                    id="credentialsJson"
                    value={credentialsJson}
                    onChange={(e) => setCredentialsJson(e.target.value)}
                    placeholder="サービスアカウントのクレデンシャルJSONを入力してください"
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="mt-6">
              <Button onClick={handleSave}>設定を保存</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
