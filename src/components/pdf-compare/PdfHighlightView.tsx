import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { Difference } from '@/types/pdf-compare';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

// TypeScript定義
declare global {
  interface Window {
    pdfjsOptions: {
      cMapUrl: string;
      cMapPacked: boolean;
    };
  }
}

interface PdfHighlightViewProps {
  pdf1: File | null;
  pdf2: File | null;
  differences: Difference[];
  numPages1: number;
  numPages2: number;
  selectedDiffIndex: number | null;
  onDiffClick: (index: number) => void;
  // エラーハンドリング用のコールバック関数を追加
  onError?: (error: Error) => void;
}

export function PdfHighlightView({ 
  pdf1, 
  pdf2, 
  differences, 
  numPages1, 
  numPages2,
  selectedDiffIndex,
  onDiffClick,
  onError
}: PdfHighlightViewProps) {
  const [currentTab, setCurrentTab] = useState('original');
  
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

  // PDFとハイライトを組み合わせて表示するコンポーネント
  const PdfWithHighlights = ({ 
    fileUrl, 
    pageCount, 
    isOriginal 
  }: { 
    fileUrl: string | null, 
    pageCount: number,
    isOriginal: boolean
  }) => {
    if (!fileUrl) return null;
    
    const relevantDiffs = differences.filter(diff => 
      isOriginal ? diff.removed : diff.added
    );
    
    return (
      <div className="pdf-with-highlights relative border rounded">
        <ScrollArea className="h-[calc(100vh-25rem)]">
          <Document 
            file={fileUrl}
            options={window.pdfjsOptions}
            onLoadError={(error) => {
              console.error(`PDF load error: ${error.message || JSON.stringify(error)}`);
              if (onError) {
                onError(error);
              }
            }}
            loading={<div className="p-4 text-center">PDFを読み込み中...</div>}
            error={<div className="p-4 text-center text-red-500">PDFの読み込みに失敗しました。ファイルを確認してください。</div>}
          >
            {Array.from(new Array(pageCount), (_, i) => (
              <div key={`page_${i + 1}`} className="relative mb-4">
                <Page
                  key={`page_${i + 1}`}
                  pageNumber={i + 1}
                  renderAnnotationLayer={true}
                  renderTextLayer={true}
                  className="mb-4"
                />
                <div className="highlight-layer absolute top-0 left-0 w-full h-full pointer-events-none">
                  {/* 差分ハイライト表示コンテンツ */}
                  {/* 所属するページにのみハイライトを表示 */}
                  {relevantDiffs
                    .filter(diff => {
                      const pageLines = isOriginal ? diff.lines1 : diff.lines2;
                      // ページ番号が計算可能な場合のみフィルタリング
                      if (!pageLines || pageLines.length === 0) return true; // 安全策：ページ情報がない場合は表示
                      
                      // 単純なページ判定ロジック - 先頭の行番号からページを推定
                      // 1ページあたり約50行と仮定
                      const estimatedPage = Math.floor((pageLines[0] - 1) / 50) + 1;
                      return estimatedPage === i + 1; // 現在のページに関連する差分のみ表示
                    })
                    .map((diff, index) => {
                      // 表示位置の計算（ページ内で設定）
                      const pageLines = isOriginal ? diff.lines1 : diff.lines2;
                      let positionY = 20; // デフォルト値
                      
                      if (pageLines && pageLines.length > 0) {
                        // 行番号に基づいたページ内の相対位置計算
                        const lineInPage = (pageLines[0] - 1) % 50;
                        positionY = (lineInPage / 50) * 100; // ページ内での相対位置（50行を100%として）
                      }
                      
                      // 差分の長さに応じた幅を計算
                      const diffWidth = Math.min(80, Math.max(20, (diff.value.length / 50) * 30));
                      
                      return (
                        <div 
                          key={`highlight-${index}`}
                          className={`absolute p-1 rounded-sm ${isOriginal ? 'bg-red-200 bg-opacity-50' : 'bg-green-200 bg-opacity-50'} border ${isOriginal ? 'border-red-400' : 'border-green-400'} ${selectedDiffIndex === index ? 'ring-2 ring-blue-500' : ''}`}
                          style={{
                            top: `${positionY}%`,
                            left: `${10 + (index % 3) * 5}%`, // 左右に分散させる
                            width: `${diffWidth}%`,
                            minWidth: '100px',
                            minHeight: '24px',
                            maxWidth: '80%',
                            opacity: selectedDiffIndex === index ? 1 : 0.7,
                            transform: selectedDiffIndex === index ? 'scale(1.05)' : 'scale(1)',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                            pointerEvents: 'auto', // クリック可能にする
                            zIndex: selectedDiffIndex === index ? 10 : 1
                          }}
                          onClick={() => onDiffClick(index)}
                          title={diff.value.substring(0, 50) + (diff.value.length > 50 ? '...' : '')}
                        >
                          <span className="text-xs line-clamp-2 overflow-hidden">
                            {diff.value.substring(0, 100)}...
                          </span>
                        </div>
                      );
                   })}
                </div>
              </div>
            ))}
          </Document>
        </ScrollArea>
      </div>
    );
  };
  
  return (
    <Card className="pdf-highlight-view">
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="w-full">
          <TabsTrigger value="original" className="flex-1">元のPDF（削除差分ハイライト）</TabsTrigger>
          <TabsTrigger value="new" className="flex-1">新しいPDF（追加差分ハイライト）</TabsTrigger>
        </TabsList>
        <TabsContent value="original">
          <PdfWithHighlights 
            fileUrl={pdf1Url} 
            pageCount={numPages1 || 0} 
            isOriginal={true} 
          />
        </TabsContent>
        <TabsContent value="new">
          <PdfWithHighlights 
            fileUrl={pdf2Url} 
            pageCount={numPages2 || 0} 
            isOriginal={false} 
          />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
