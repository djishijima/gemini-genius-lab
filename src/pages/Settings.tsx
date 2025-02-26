
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileDiff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Settings() {
  const navigate = useNavigate();

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
          <CardTitle>設定</CardTitle>
          <CardDescription>
            アプリケーションの設定を管理します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            onClick={() => navigate("/pdf-compare")}
            className="w-full justify-start"
          >
            <FileDiff className="mr-2 h-4 w-4" />
            PDF比較ツール
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
