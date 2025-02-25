
import React from 'react';
import { useDropzone } from 'react-dropzone';

interface PdfDropzoneProps {
  onDrop: (acceptedFiles: File[]) => void;
  fileName: string;
  areaClassName: string;
  placeholder: string;
}

export function PdfDropzone({ onDrop, fileName, areaClassName, placeholder }: PdfDropzoneProps) {
  const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop});

  return (
    <div 
      {...getRootProps()} 
      className={`${areaClassName} flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600 ${isDragActive ? 'border-blue-500' : ''}`}
    >
      <input {...getInputProps()} />
      <p className="text-gray-500 dark:text-gray-400">
        {fileName || placeholder}
      </p>
    </div>
  );
}
