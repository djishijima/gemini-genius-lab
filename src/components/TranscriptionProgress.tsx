
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";

interface TranscriptionProgressProps {
  isProcessing: boolean;
  isTranscribing: boolean;
  uploadProgress: number;
  transcriptionProgress: number;
}

export function TranscriptionProgress({
  isProcessing,
  isTranscribing,
  uploadProgress,
  transcriptionProgress
}: TranscriptionProgressProps) {
  if (!isProcessing && !isTranscribing) return null;
  
  return (
    <>
      {(isProcessing || isTranscribing) && (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
          <p className="text-sm font-medium text-center">
            {isTranscribing ? "文字起こし処理中..." : "ファイル処理中..."}
            {transcriptionProgress > 0 && transcriptionProgress < 100 && ` (${Math.round(transcriptionProgress)}%)`}
          </p>
          {isProcessing && (
            <>
              <div className="space-y-2">
                <Label className="text-sm">ファイルアップロード</Label>
                <Progress value={uploadProgress} />
                <p className="text-xs text-muted-foreground text-right">{Math.round(uploadProgress)}%</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">文字起こし</Label>
                <Progress value={transcriptionProgress} />
                <p className="text-xs text-muted-foreground text-right">{Math.round(transcriptionProgress)}%</p>
              </div>
            </>
          )}
          {isTranscribing && (
            <div className="space-y-2">
              <Label className="text-sm">文字起こし</Label>
              <Progress value={transcriptionProgress} />
              <p className="text-xs text-muted-foreground text-right">{Math.round(transcriptionProgress)}%</p>
            </div>
          )}
        </div>
      )}
      
      {isTranscribing && (
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-md">
          <div className="flex items-center mb-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2" />
            <span className="text-lg font-semibold text-blue-500">文字起こし中...</span>
          </div>
          <Progress value={transcriptionProgress} className="h-2 mb-2" />
          <p className="text-sm text-blue-600 dark:text-blue-400">
            {transcriptionProgress}% 完了
          </p>
        </div>
      )}
      
      {isProcessing && !isTranscribing && (
        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
          <div className="flex items-center mb-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500 mr-2" />
            <span className="text-lg font-semibold text-yellow-500">ファイル処理中...</span>
          </div>
          <Progress value={uploadProgress} className="h-2 mb-2" />
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            {uploadProgress}% 完了
          </p>
        </div>
      )}
    </>
  );
}
