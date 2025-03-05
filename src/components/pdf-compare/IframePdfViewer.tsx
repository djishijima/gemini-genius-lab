import React, { useEffect, useState, useRef } from 'react';

interface IframePdfViewerProps {
  file: File | null;
}

export function IframePdfViewer({ file }: IframePdfViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setError(null);
    
    // File オブジェクトから Blob URL を作成
    if (file) {
      setLoading(true);
      try {
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
        console.log('PDF Blob URL created successfully:', url);
        
        // クリーンアップ関数
        return () => {
          console.log('Revoking Blob URL:', url);
          URL.revokeObjectURL(url);
        };
      } catch (err) {
        console.error('Error creating Blob URL:', err);
        setError('PDFファイルの読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    }
  }, [file]);
  
  // iframeの読み込み完了と失敗を処理
  const handleIframeLoad = () => {
    console.log('PDF iframe loaded successfully');
    setLoading(false);
  };
  
  const handleIframeError = () => {
    console.error('PDF iframe failed to load');
    setError('PDFの表示に失敗しました。ファイルを確認してください。');
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full border rounded p-4 bg-gray-100">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 bg-blue-400 rounded-full mb-2"></div>
          <p>PDFを読み込み中...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-full border rounded p-4 bg-red-50">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }
  
  if (!pdfUrl) {
    return (
      <div className="flex items-center justify-center h-full border rounded p-4">
        <p>PDFファイルが選択されていません</p>
      </div>
    );
  }

  return (
    <div className="pdf-iframe-container h-full w-full overflow-hidden border rounded bg-white">
      <iframe
        ref={iframeRef}
        src={`${pdfUrl}#toolbar=0`}
        className="w-full h-full"
        title="PDF Viewer"
        frameBorder="0"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
      />
      
      {/* 操作ヘルプを追加 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-70 text-white p-2 text-xs text-center">
        PDF表示にはブラウザのPDF機能を使用しています
      </div>
    </div>
  );
}
