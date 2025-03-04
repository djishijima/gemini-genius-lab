
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";

interface TranscriptionProgressProps {
  isProcessing: boolean;
  isTranscribing: boolean;
  uploadProgress: number; // 互換性のため残す
  transcriptionProgress: number;
}

export function TranscriptionProgress({
  isProcessing,
  isTranscribing,
  transcriptionProgress
}: TranscriptionProgressProps) {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
      <div className="space-y-2">
        <Label className="text-sm">文字起こし進捗</Label>
        <Progress value={isTranscribing ? transcriptionProgress : 0} />
        <p className="text-xs text-muted-foreground text-right">
          {isTranscribing ? Math.round(transcriptionProgress) : 0}%
        </p>
      </div>
      
      {(isProcessing || isTranscribing) && (
        <p className="text-sm font-medium text-center">
          {isTranscribing ? "文字起こし処理中..." : "音声処理中..."}
          {transcriptionProgress > 0 && transcriptionProgress < 100 && ` (${Math.round(transcriptionProgress)}%)`}
        </p>
      )}
    </div>
  );
}
