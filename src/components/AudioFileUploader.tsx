import { useRef } from "react";
import { useToast } from "@/components/ui/use-toast";

interface AudioFileUploaderProps {
  onFileUpload: (file: File) => void;
  isDisabled: boolean;
}

export function AudioFileUploader({ onFileUpload, isDisabled }: AudioFileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "ファイルサイズエラー",
        description: "ファイルサイズは100MB以下にしてください",
        variant: "destructive",
      });
      return;
    }

    const supportedTypes = [
      "audio/mp3",
      "audio/wav",
      "audio/webm",
      "audio/m4a",
      "audio/ogg",
      "audio/*",
    ];
    if (
      !supportedTypes.includes(file.type) &&
      !file.name.endsWith(".mp3") &&
      !file.name.endsWith(".wav") &&
      !file.name.endsWith(".webm") &&
      !file.name.endsWith(".m4a") &&
      !file.name.endsWith(".ogg")
    ) {
      toast({
        title: "ファイル形式エラー",
        description: "サポートされているファイル形式: MP3, WAV, WEBM, M4A, OGG",
        variant: "destructive",
      });
      return;
    }

    onFileUpload(file);
  };

  return (
    <input
      ref={fileInputRef}
      type="file"
      accept="audio/mp3,audio/wav,audio/webm,audio/m4a,audio/ogg,audio/*"
      onChange={handleFileChange}
      className="hidden"
      disabled={isDisabled}
    />
  );
}
