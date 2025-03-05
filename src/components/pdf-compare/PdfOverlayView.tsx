import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface PdfOverlayViewProps {
  pdf1: File | null;
  pdf2: File | null;
  numPages1: number;
  numPages2: number;
}

export function PdfOverlayView({ pdf1, pdf2, numPages1, numPages2 }: PdfOverlayViewProps) {
  const [opacity, setOpacity] = useState(0.5);
  const [scale, setScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const maxPages = Math.max(numPages1 || 1, numPages2 || 1);

  return (
    <div className="pdf-overlay-container space-y-4">
      <div className="pdf-controls space-y-4">
        <div className="control-group">
          <Label htmlFor="opacity-control">透明度: {opacity.toFixed(2)}</Label>
          <Slider
            id="opacity-control"
            min={0}
            max={1}
            step={0.01}
            value={[opacity]}
            onValueChange={(value) => setOpacity(value[0])}
            className="mt-2"
          />
        </div>
        
        <div className="control-group">
          <Label htmlFor="scale-control">拡大縮小: {scale.toFixed(2)}倍</Label>
          <Slider
            id="scale-control"
            min={0.5}
            max={2}
            step={0.05}
            value={[scale]}
            onValueChange={(value) => setScale(value[0])}
            className="mt-2"
          />
        </div>
        
        <div className="control-group">
          <Label htmlFor="page-control">ページ: {currentPage} / {maxPages}</Label>
          <Slider
            id="page-control"
            min={1}
            max={maxPages}
            step={1}
            value={[currentPage]}
            onValueChange={(value) => setCurrentPage(value[0])}
            className="mt-2"
          />
        </div>
      </div>
      
      <div className="pdf-container relative w-full h-[calc(100vh-20rem)] overflow-hidden border rounded">
        {pdf1 && (
          <div className="pdf-layer pdf-layer-bottom absolute top-0 left-0 w-full h-full z-10">
            <Document 
              file={pdf1}
              onLoadError={(error) => {
                console.error('PDF1 load error:', error);
              }}
              loading={<div className="p-4 text-center">PDFを読み込み中...</div>}
              error={<div className="p-4 text-center text-red-500">PDFの読み込みに失敗しました。ファイルを確認してください。</div>}
            >
              <Page 
                pageNumber={currentPage <= (numPages1 || 1) ? currentPage : 1} 
                renderAnnotationLayer={true}
                renderTextLayer={true}
                scale={scale}
                className="pdf-page"
              />
            </Document>
          </div>
        )}
        
        {pdf2 && (
          <div className="pdf-layer pdf-layer-top absolute top-0 left-0 w-full h-full z-20" 
               style={{ 
                 opacity, 
                 mixBlendMode: 'difference' 
               }}>
            <Document 
              file={pdf2}
              onLoadError={(error) => {
                console.error('PDF2 load error:', error);
              }}
              loading={<div className="p-4 text-center">PDFを読み込み中...</div>}
              error={<div className="p-4 text-center text-red-500">PDFの読み込みに失敗しました。ファイルを確認してください。</div>}
            >
              <Page 
                pageNumber={currentPage <= (numPages2 || 1) ? currentPage : 1} 
                renderAnnotationLayer={true}
                renderTextLayer={true}
                scale={scale}
                className="pdf-page"
              />
            </Document>
          </div>
        )}
      </div>
    </div>
  );
}
