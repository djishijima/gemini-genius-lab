import { Button } from "@/components/ui/button";
import { ClipboardCopy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";

interface TranscriptionResultProps {
  transcription: string | null;
  isTranscribing: boolean;
}

export function TranscriptionResult({ transcription, isTranscribing }: TranscriptionResultProps) {
  const { toast } = useToast();
  const [resultText, setResultText] = useState("");

  // Update the result text when transcription changes
  useEffect(() => {
    if (transcription && !isTranscribing) {
      setResultText((prev) => (prev ? prev + transcription : transcription));
    }
  }, [transcription, isTranscribing]);

  const handleCopy = () => {
    navigator.clipboard.writeText(resultText);
    toast({
      title: "コピー完了",
      description: "文字起こし結果をクリップボードにコピーしました",
    });
  };

  return (
    <div className="mt-6 p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold mb-2">文字起こし結果</h3>

      {isTranscribing && <div className="text-primary animate-pulse mb-4">文字起こし中...</div>}

      <div className="mb-4 bg-background rounded border min-h-[300px] p-4 whitespace-pre-wrap overflow-auto">
        {resultText || "ここに文字起こし結果が表示されます..."}
      </div>

      <div className="flex justify-end mt-2">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          <ClipboardCopy className="h-4 w-4 mr-2" />
          コピー
        </Button>
      </div>
    </div>
  );
}
