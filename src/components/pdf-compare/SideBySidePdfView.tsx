import React, { useState, useEffect, useRef } from 'react';
import { Document, Page } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// TypeScript定義
declare global {
  interface Window {
    pdfjsOptions: {
      cMapUrl: string;
      cMapPacked: boolean;
    };
  }
}

interface SideBySidePdfViewProps {
  pdf1: File | null;
  pdf2: File | null;
  numPages1: number;
  numPages2: number;
}

export function SideBySidePdfView({
  pdf1,
  pdf2,
  numPages1,
  numPages2
}: SideBySidePdfViewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pdf1Url, setPdf1Url] = useState<string | null>(null);
  const [pdf2Url, setPdf2Url] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1.0);

  // PDF ファイルを URL に変換する関数
  const getPdfUrl = (file: File | null) => {
    if (!file) return null;
    try {
      console.log(`SideBySidePdfView: Creating URL for ${file.name}`);
      return URL.createObjectURL(file);
    } catch (error) {
      console.error('SideBySidePdfView: Failed to create Blob URL:', error);
      return null;
    }
  };

  // コンポーネントがマウントされた時に URL を作成
  useEffect(() => {
    if (pdf1) setPdf1Url(getPdfUrl(pdf1));
    if (pdf2) setPdf2Url(getPdfUrl(pdf2));
    
    // クリーンアップ関数
    return () => {
      if (pdf1Url) URL.revokeObjectURL(pdf1Url);
      if (pdf2Url) URL.revokeObjectURL(pdf2Url);
    };
  }, [pdf1, pdf2]);

  // 最大ページ数を計算
  const maxPages = Math.max(numPages1, numPages2);

  // ページ操作関数
  const goToNextPage = () => {
    if (currentPage < maxPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        goToNextPage();
      } else if (e.key === 'ArrowLeft') {
        goToPrevPage();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentPage, maxPages]);

  return (
    <div ref={containerRef} className="side-by-side-view w-full h-full">
      <div className="controls flex items-center justify-between mb-4 bg-muted/30 p-2 rounded">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            前のページ
          </Button>
          <span className="text-sm">
            ページ {currentPage} / {maxPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage >= maxPages}
          >
            次のページ
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
          >
            -
          </Button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={scale >= 3}
          >
            +
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 h-[calc(100vh-28rem)]">
        <div className="border rounded bg-muted/10 overflow-hidden">
          <div className="bg-background/80 py-1 px-3 text-sm font-medium">
            元のPDF - {pdf1?.name || "ファイルなし"}
          </div>
          <div className="pdf-container flex items-center justify-center h-full overflow-auto">
            {pdf1Url ? (
              <Document
                file={pdf1Url}
                options={window.pdfjsOptions}
                onLoadError={(error) => {
                  console.error(`PDF1 load error: ${error.message || JSON.stringify(error)}`);
                }}
                loading={<div className="p-4 text-center">PDFを読み込み中...</div>}
                error={<div className="p-4 text-center text-red-500">PDFの読み込みに失敗しました</div>}
              >
                {currentPage <= numPages1 ? (
                  <Page
                    pageNumber={currentPage}
                    renderAnnotationLayer={true}
                    renderTextLayer={true}
                    scale={scale}
                  />
                ) : (
                  <div className="flex items-center justify-center h-40 text-muted">
                    このPDFにはページ{currentPage}はありません
                  </div>
                )}
              </Document>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted">
                PDFが選択されていません
              </div>
            )}
          </div>
        </div>

        <div className="border rounded bg-muted/10 overflow-hidden">
          <div className="bg-background/80 py-1 px-3 text-sm font-medium">
            新しいPDF - {pdf2?.name || "ファイルなし"}
          </div>
          <div className="pdf-container flex items-center justify-center h-full overflow-auto">
            {pdf2Url ? (
              <Document
                file={pdf2Url}
                options={window.pdfjsOptions}
                onLoadError={(error) => {
                  console.error(`PDF2 load error: ${error.message || JSON.stringify(error)}`);
                }}
                loading={<div className="p-4 text-center">PDFを読み込み中...</div>}
                error={<div className="p-4 text-center text-red-500">PDFの読み込みに失敗しました</div>}
              >
                {currentPage <= numPages2 ? (
                  <Page
                    pageNumber={currentPage}
                    renderAnnotationLayer={true}
                    renderTextLayer={true}
                    scale={scale}
                  />
                ) : (
                  <div className="flex items-center justify-center h-40 text-muted">
                    このPDFにはページ{currentPage}はありません
                  </div>
                )}
              </Document>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted">
                PDFが選択されていません
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
