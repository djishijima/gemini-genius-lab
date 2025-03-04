
import { Button } from "@/components/ui/button";
import { ClipboardCopy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface TranscriptionResultProps {
  transcription: string;
  isTranscribing: boolean;
}

export function TranscriptionResult({ transcription, isTranscribing }: TranscriptionResultProps) {
  const { toast } = useToast();
  
  if (!transcription) return null;
  
  return (
    <div className="mt-6 p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold mb-2">文字起こし結果</h3>
      <div className="max-h-60 overflow-y-auto whitespace-pre-wrap bg-muted p-3 rounded text-sm">
        {isTranscribing && <div className="text-primary animate-pulse">文字起こし中...</div>}
        {transcription}
      </div>
      <div className="flex justify-end mt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            navigator.clipboard.writeText(transcription);
            toast({
              title: "コピー完了",
              description: "文字起こし結果をクリップボードにコピーしました",
            });
          }}
        >
          <ClipboardCopy className="h-4 w-4 mr-2" />
          コピー
        </Button>
      </div>
    </div>
  );
}
