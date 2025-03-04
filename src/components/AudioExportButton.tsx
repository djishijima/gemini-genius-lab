
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface AudioExportButtonProps {
  audioBlob: Blob | null;
  isDisabled: boolean;
}

export function AudioExportButton({ audioBlob, isDisabled }: AudioExportButtonProps) {
  const handleAudioExport = () => {
    if (audioBlob) {
      const url = window.URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${new Date().toISOString()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <Button
      variant="secondary"
      onClick={handleAudioExport}
      className="w-full"
      disabled={isDisabled}
    >
      <RefreshCw className="mr-2 h-4 w-4" />
      音声をエクスポート
    </Button>
  );
}
