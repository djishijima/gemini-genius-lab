import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

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
  const [blendMode, setBlendMode] = useState<string>('normal');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const maxPages = Math.max(numPages1 || 1, numPages2 || 1);
  
  // PDF ファイルを URL に変換する関数
  const getPdfUrl = (file: File | null) => {
    if (!file) return null;
    return URL.createObjectURL(file);
  };
  
  // PDF URL オブジェクトを保持するための状態
  const [pdf1Url, setPdf1Url] = useState<string | null>(null);
  const [pdf2Url, setPdf2Url] = useState<string | null>(null);
  
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
  
  // ビューポートサイズに合わせてPDFを最適化
  useEffect(() => {
    const calculateOptimalScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // A4サイズを想定（595 x 842 points @ 72PPI）
        const optimalScale = (containerWidth - 40) / 595; // 余白を考慮
        setScale(Math.min(optimalScale, 2.0)); // 最大2倍まで
      }
    };

    calculateOptimalScale();
    window.addEventListener('resize', calculateOptimalScale);
    return () => window.removeEventListener('resize', calculateOptimalScale);
  }, []);
  
  // PDF読み込み完了時の処理
  const handleDocumentLoadSuccess = () => {
    setIsLoading(false);
  };

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
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="scale-control">拡大縮小: {scale.toFixed(2)}倍</Label>
            <Select
              value={blendMode}
              onValueChange={(value: string) => setBlendMode(value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="ブレンドモード" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">通常</SelectItem>
                <SelectItem value="difference">差分</SelectItem>
                <SelectItem value="exclusion">除外</SelectItem>
                <SelectItem value="multiply">乗算</SelectItem>
                <SelectItem value="screen">スクリーン</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
        
        <div className="control-group space-y-2">
          <Label htmlFor="page-control">ページ: {currentPage} / {maxPages}</Label>
          <div className="flex justify-between items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1 || isLoading}
            >
              前のページ
            </Button>
            <Slider
              id="page-control"
              min={1}
              max={maxPages}
              step={1}
              value={[currentPage]}
              onValueChange={(value) => setCurrentPage(value[0])}
              className="flex-1 mx-2"
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentPage(Math.min(maxPages, currentPage + 1))}
              disabled={currentPage >= maxPages || isLoading}
            >
              次のページ
            </Button>
          </div>
        </div>
      </div>
      
      <div className="pdf-container relative w-full h-[calc(100vh-20rem)] overflow-hidden border rounded">
        {pdf1 && (
          <div className="pdf-layer pdf-layer-bottom absolute top-0 left-0 w-full h-full z-10">
            <Document 
              file={pdf1Url}
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
                 mixBlendMode: blendMode 
               }}>
            <Document 
              file={pdf2Url}
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
