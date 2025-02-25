
import { Button } from "@/components/ui/button";
import { FileText, Mic, FileCompare } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const navigate = useNavigate();
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8">ツール一覧</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Button
          variant="outline"
          className="h-32"
          onClick={() => navigate("/audio-recorder")}
        >
          <div className="flex flex-col items-center gap-2">
            <Mic className="h-6 w-6" />
            <span>音声入力</span>
          </div>
        </Button>
        <Button
          variant="outline"
          className="h-32"
          onClick={() => navigate("/transcription")}
        >
          <div className="flex flex-col items-center gap-2">
            <FileText className="h-6 w-6" />
            <span>InDesign スクリプト生成</span>
          </div>
        </Button>
        <Button
          variant="outline"
          className="h-32"
          onClick={() => navigate("/pdf-compare")}
        >
          <div className="flex flex-col items-center gap-2">
            <FileCompare className="h-6 w-6" />
            <span>PDF比較ツール</span>
          </div>
        </Button>
      </div>
    </div>
  );
}
