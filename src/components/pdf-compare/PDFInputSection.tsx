
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface PDFInputSectionProps {
  title: string;
  description: string;
  text: string;
  onTextChange: (value: string) => void;
  pdf: File | null;
  onPdfChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  isLoading?: boolean;
}

export function PDFInputSection({
  title,
  description,
  text,
  onTextChange,
  pdf,
  onPdfChange,
  inputRef,
  isLoading = false,
}: PDFInputSectionProps) {
  const handleClearPdf = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    // ここで親コンポーネントのnullセッターを呼ぶことを想定
    onPdfChange({ target: { files: null } } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <Card className="bg-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100">{title}</CardTitle>
        <CardDescription className="text-slate-300">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="テキストを入力"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          className="min-h-[200px] text-slate-200 bg-slate-700 placeholder:text-slate-400"
        />
        <div className="space-y-2">
          <div className="flex items-center space-x-4">
            <Label htmlFor={`pdf-${title}`} className="text-slate-200">
              またはPDFをアップロード:
            </Label>
            <div className="flex-1">
              <Input
                type="file"
                id={`pdf-${title}`}
                accept=".pdf,application/pdf"
                onChange={onPdfChange}
                ref={inputRef}
                className="text-slate-200 bg-slate-700"
                disabled={isLoading}
              />
            </div>
          </div>
          
          {isLoading && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span className="ml-2 text-slate-300">PDF処理中...</span>
            </div>
          )}
          
          {pdf && (
            <div className="flex items-center justify-between bg-slate-700 p-2 rounded">
              <span className="text-slate-200 text-sm truncate max-w-[260px]">{pdf.name}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearPdf}
                className="text-red-400 hover:text-red-300 hover:bg-slate-600"
              >
                クリア
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
