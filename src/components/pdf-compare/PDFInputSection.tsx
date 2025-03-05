import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PDFInputSectionProps {
  title: string;
  description: string;
  text: string;
  onTextChange: (value: string) => void;
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
        <div className="flex items-center space-x-4">
          <Label htmlFor={`pdf-${title}`} className="text-slate-200">
            またはPDFをアップロード:
          </Label>
          <Input
            type="file"
            id={`pdf-${title}`}
            accept=".pdf,application/pdf"
            onChange={onPdfChange}
            ref={inputRef}
            className="text-slate-200 bg-slate-700"
          />
        </div>
      </CardContent>
    </Card>
  );
}
