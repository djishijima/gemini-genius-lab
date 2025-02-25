
import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface PdfDropzoneProps {
  onDrop: (acceptedFiles: File[]) => void;
  fileName: string;
  areaClassName: string;
  placeholder: string;
  accept?: Record<string, string[]>;
}

export function PdfDropzone({ onDrop, fileName, areaClassName, placeholder, accept }: PdfDropzoneProps) {
  const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop, accept});

  return (
    <Card>
      <CardHeader>
        <CardTitle>PDF {fileName ? fileName : ''}</CardTitle>
        <CardDescription>比較するPDFをここにアップロード</CardDescription>
      </CardHeader>
      <CardContent>
        <div 
          {...getRootProps()} 
          className={`${areaClassName} w-full h-48 border-2 border-dashed rounded-md flex items-center justify-center bg-gray-50 text-gray-500 hover:bg-gray-100 cursor-pointer`}
        >
          <input {...getInputProps()} />
          <p className="text-gray-500 dark:text-gray-400">
            {isDragActive ? "ドロップしてファイルをアップロード" : placeholder}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
