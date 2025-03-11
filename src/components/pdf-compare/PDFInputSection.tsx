
import { useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface PDFInputSectionProps {
  title: string;
  description: string;
  text: string;
  onTextChange: (text: string) => void;
  pdf: File | null;
  onPdfChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

export function PDFInputSection({
  title,
  description,
  text,
  onTextChange,
  pdf,
  onPdfChange,
  inputRef,
}: PDFInputSectionProps) {
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dropzoneRef.current?.classList.add("bg-blue-50");
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dropzoneRef.current?.classList.remove("bg-blue-50");
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dropzoneRef.current?.classList.remove("bg-blue-50");
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        const event = {
          target: {
            files: e.dataTransfer.files,
          },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        onPdfChange(event);
      }
    }
  };

  return (
    <div className="input-section space-y-4 p-4 border rounded-lg">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-gray-500">{description}</p>
      
      <Textarea
        placeholder="テキストを入力..."
        className="h-32"
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
      />
      
      <div
        ref={dropzoneRef}
        className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer hover:bg-blue-50"
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">
          {pdf ? `選択されたファイル: ${pdf.name}` : "PDFファイルをドラッグ&ドロップまたはクリックして選択"}
        </p>
        <input
          type="file"
          className="hidden"
          ref={inputRef}
          accept="application/pdf"
          onChange={onPdfChange}
        />
      </div>
      
      {pdf && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            onTextChange("");
            inputRef.current!.value = "";
            onPdfChange({ target: { files: null } } as React.ChangeEvent<HTMLInputElement>);
          }}
        >
          ファイルをクリア
        </Button>
      )}
    </div>
  );
}
