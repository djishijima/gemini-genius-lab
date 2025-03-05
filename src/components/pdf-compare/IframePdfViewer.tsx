import React, { useEffect, useState } from 'react';

interface IframePdfViewerProps {
  file: File | null;
}

export function IframePdfViewer({ file }: IframePdfViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    // File オブジェクトから Blob URL を作成
    if (file) {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      
      // クリーンアップ関数
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file]);

  if (!pdfUrl) {
    return (
      <div className="flex items-center justify-center h-full border rounded p-4">
        <p>PDFファイルが選択されていません</p>
      </div>
    );
  }

  return (
    <div className="pdf-iframe-container h-full w-full overflow-hidden border rounded">
      <iframe
        src={`${pdfUrl}#toolbar=0`}
        className="w-full h-full"
        title="PDF Viewer"
        frameBorder="0"
      />
    </div>
  );
}
