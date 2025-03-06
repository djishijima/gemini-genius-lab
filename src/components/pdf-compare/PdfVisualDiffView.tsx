import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PdfVisualDiffViewProps {
  pdf1: File | null;
  pdf2: File | null;
  numPages1: number;
  numPages2: number;
  differences: any[];
}

export function PdfVisualDiffView({ pdf1, pdf2, numPages1, numPages2, differences }: PdfVisualDiffViewProps) {
  const [pdf1Url, setPdf1Url] = useState<string | null>(null);
  const [pdf2Url, setPdf2Url] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [highlightMode, setHighlightMode] = useState<'additions' | 'removals' | 'both'>('both');
  const [showOriginalInOverlay, setShowOriginalInOverlay] = useState(false);
  const [opacity, setOpacity] = useState(0.5);
  const [blendMode, setBlendMode] = useState<'normal' | 'difference' | 'exclusion' | 'multiply' | 'screen'>('difference');
  const canvasRef1 = useRef<HTMLCanvasElement>(null);
  const canvasRef2 = useRef<HTMLCanvasElement>(null);
  const diffCanvasRef = useRef<HTMLCanvasElement>(null);

  // ファイルからBlobURLを作成
  useEffect(() => {
    if (pdf1) {
      const url = URL.createObjectURL(pdf1);
      setPdf1Url(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [pdf1]);

  useEffect(() => {
    if (pdf2) {
      const url = URL.createObjectURL(pdf2);
      setPdf2Url(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [pdf2]);

  // 現在のページの差分を取得
  const getCurrentPageDifferences = () => {
    if (!differences.length) return [];
    
    // テキストベースの差分をページ単位でフィルタリング
    const pageDiffs = differences.filter(diff => {
      // 該当ページの行番号を持つ差分のみ抽出
      const lines1 = diff.lines1 || [];
      const lines2 = diff.lines2 || [];
      
      // ページあたりの行数を概算（実際のデータに合わせて調整が必要）
      const linesPerPage = 40;
      
      const pageStartLine1 = (currentPage - 1) * linesPerPage + 1;
      const pageEndLine1 = currentPage * linesPerPage;
      const pageStartLine2 = (currentPage - 1) * linesPerPage + 1;
      const pageEndLine2 = currentPage * linesPerPage;
      
      // 該当ページの行を含む差分を抽出
      return (
        lines1.some(line => line >= pageStartLine1 && line <= pageEndLine1) ||
        lines2.some(line => line >= pageStartLine2 && line <= pageEndLine2)
      );
    });
    
    return pageDiffs;
  };

  // PDFをCanvas化して比較
  const comparePdfPages = async () => {
    if (!canvasRef1.current || !canvasRef2.current || !diffCanvasRef.current || !pdf1Url || !pdf2Url) {
      return;
    }

    try {
      setLoading(true);
      
      // canvas要素を取得
      const canvas1 = canvasRef1.current;
      const canvas2 = canvasRef2.current;
      const diffCanvas = diffCanvasRef.current;
      
      // コンテキストを取得
      const ctx1 = canvas1.getContext('2d');
      const ctx2 = canvas2.getContext('2d');
      const diffCtx = diffCanvas.getContext('2d');
      
      if (!ctx1 || !ctx2 || !diffCtx) return;
      
      // コンテキストをクリア
      ctx1.clearRect(0, 0, canvas1.width, canvas1.height);
      ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
      diffCtx.clearRect(0, 0, diffCanvas.width, diffCanvas.height);
      
      // Canvasからピクセルデータを取得
      const imageData1 = ctx1.getImageData(0, 0, canvas1.width, canvas1.height);
      const imageData2 = ctx2.getImageData(0, 0, canvas2.width, canvas2.height);
      
      // 差分を視覚化するための新しいImageDataを作成
      const diffData = diffCtx.createImageData(diffCanvas.width, diffCanvas.height);
      
      // 現在のページの差分情報
      const pageDiffs = getCurrentPageDifferences();
      const hasAdditions = pageDiffs.some(diff => diff.added);
      const hasRemovals = pageDiffs.some(diff => diff.removed);
      
      // ピクセルごとに比較して差分をハイライト
      for (let i = 0; i < imageData1.data.length; i += 4) {
        const r1 = imageData1.data[i];
        const g1 = imageData1.data[i + 1];
        const b1 = imageData1.data[i + 2];
        const a1 = imageData1.data[i + 3];
        
        const r2 = imageData2.data[i];
        const g2 = imageData2.data[i + 1];
        const b2 = imageData2.data[i + 2];
        const a2 = imageData2.data[i + 3];
        
        // ピクセルの差が大きい場合、変更があったと判断
        const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
        const threshold = 30; // 閾値（調整可能）
        
        // ブレンドモードに応じた処理
        if (blendMode === 'normal') {
          // 通常モード - 片方のPDFを不透明度付きで表示
          if (showOriginalInOverlay) {
            // オリジナルPDFをベースに表示
            diffData.data[i] = r1;
            diffData.data[i + 1] = g1;
            diffData.data[i + 2] = b1;
            // 新しいPDFを透明度付きでブレンド
            const alpha = opacity;
            diffData.data[i] = Math.round(r1 * (1 - alpha) + r2 * alpha);
            diffData.data[i + 1] = Math.round(g1 * (1 - alpha) + g2 * alpha);
            diffData.data[i + 2] = Math.round(b1 * (1 - alpha) + b2 * alpha);
            diffData.data[i + 3] = Math.max(a1, a2 * opacity);
          } else {
            // 新しいPDFをベースに表示
            diffData.data[i] = r2;
            diffData.data[i + 1] = g2;
            diffData.data[i + 2] = b2;
            // オリジナルPDFを透明度付きでブレンド
            const alpha = opacity;
            diffData.data[i] = Math.round(r2 * (1 - alpha) + r1 * alpha);
            diffData.data[i + 1] = Math.round(g2 * (1 - alpha) + g1 * alpha);
            diffData.data[i + 2] = Math.round(b2 * (1 - alpha) + b1 * alpha);
            diffData.data[i + 3] = Math.max(a2, a1 * opacity);
          }
        } 
        else if (blendMode === 'difference') {
          // 差分モード - 色の差分を強調表示
          diffData.data[i] = Math.abs(r1 - r2);
          diffData.data[i + 1] = Math.abs(g1 - g2);
          diffData.data[i + 2] = Math.abs(b1 - b2);
          diffData.data[i + 3] = Math.max(a1, a2) * opacity;
          
          // 差分がある場合にハイライト
          if (diff > threshold) {
            if ((highlightMode === 'additions' || highlightMode === 'both') && hasAdditions) {
              if (a1 < a2) {
                // 追加（緑）
                diffData.data[i] = 0;
                diffData.data[i + 1] = 255;
                diffData.data[i + 2] = 0;
                diffData.data[i + 3] = 200;
              }
            }
            
            if ((highlightMode === 'removals' || highlightMode === 'both') && hasRemovals) {
              if (a1 > a2) {
                // 削除（赤）
                diffData.data[i] = 255;
                diffData.data[i + 1] = 0;
                diffData.data[i + 2] = 0;
                diffData.data[i + 3] = 200;
              }
            }
          }
        }
        else if (blendMode === 'exclusion') {
          // 除外モード - より柔らかい差分表示
          diffData.data[i] = r1 + r2 - (2 * r1 * r2) / 255;
          diffData.data[i + 1] = g1 + g2 - (2 * g1 * g2) / 255;
          diffData.data[i + 2] = b1 + b2 - (2 * b1 * b2) / 255;
          diffData.data[i + 3] = Math.max(a1, a2) * opacity;
        }
        else {
          // デフォルトの差分表示モード
          if (showOriginalInOverlay) {
            // オリジナルの上に差分をオーバーレイするモード
            diffData.data[i] = r1;
            diffData.data[i + 1] = g1;
            diffData.data[i + 2] = b1;
            diffData.data[i + 3] = a1;
            
            if (diff > threshold) {
              if ((highlightMode === 'additions' || highlightMode === 'both') && hasAdditions) {
                // 追加された内容（オリジナルにはなくて新しいPDFにある）は緑色でハイライト
                if (a1 < a2) {
                  diffData.data[i] = 0;
                  diffData.data[i + 1] = 255;
                  diffData.data[i + 2] = 0;
                  diffData.data[i + 3] = 180 * opacity;
                }
              }
              
              if ((highlightMode === 'removals' || highlightMode === 'both') && hasRemovals) {
                // 削除された内容（オリジナルにあって新しいPDFにない）は赤色でハイライト
                if (a1 > a2) {
                  diffData.data[i] = 255;
                  diffData.data[i + 1] = 0;
                  diffData.data[i + 2] = 0;
                  diffData.data[i + 3] = 180 * opacity;
                }
              }
            }
          } else {
            // 差分のみを表示するモード
            diffData.data[i] = 255;
            diffData.data[i + 1] = 255;
            diffData.data[i + 2] = 255;
            diffData.data[i + 3] = 0; // 透明に初期化
            
            if (diff > threshold) {
              if ((highlightMode === 'additions' || highlightMode === 'both') && hasAdditions) {
                if (a1 < a2) {
                  // 追加（緑）
                  diffData.data[i] = 0;
                  diffData.data[i + 1] = 255;
                  diffData.data[i + 2] = 0;
                  diffData.data[i + 3] = 255 * opacity;
                }
              }
              
              if ((highlightMode === 'removals' || highlightMode === 'both') && hasRemovals) {
                if (a1 > a2) {
                  // 削除（赤）
                  diffData.data[i] = 255;
                  diffData.data[i + 1] = 0;
                  diffData.data[i + 2] = 0;
                  diffData.data[i + 3] = 255 * opacity;
                }
              }
            }
          }
        }
      }
      
      // 差分データをCanvasに描画
      diffCtx.putImageData(diffData, 0, 0);
    } catch (error) {
      console.error('PDFページ比較中にエラーが発生しました:', error);
    } finally {
      setLoading(false);
    }
  };

  // キャンバスに描画後に差分分析を実行
  useEffect(() => {
    if (canvasRef1.current && canvasRef2.current && diffCanvasRef.current) {
      comparePdfPages();
    }
  }, [currentPage, scale, highlightMode, showOriginalInOverlay]);

  // ページ移動処理
  const changePage = (increment: number) => {
    const totalPages = Math.max(numPages1 || 1, numPages2 || 1);
    const newPage = Math.min(Math.max(1, currentPage + increment), totalPages);
    setCurrentPage(newPage);
  };

  // スケール調整処理
  const adjustScale = (increase: boolean) => {
    setScale(prev => increase ? Math.min(prev + 0.1, 3) : Math.max(0.1, prev - 0.1));
  };

  if (!pdf1 || !pdf2) {
    return (
      <div className="flex items-center justify-center h-full border rounded p-4">
        <p>比較するには両方のPDFをアップロードしてください</p>
      </div>
    );
  }

  return (
    <div className="pdf-visual-diff-container space-y-4">
      {/* コントロールパネル */}
      <div className="flex flex-wrap justify-between items-center gap-4 p-4 bg-gray-100 rounded-lg">
        <div className="flex items-center space-x-2">
          <Button 
            size="sm" 
            onClick={() => changePage(-1)} 
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            前のページ
          </Button>
          <span>
            ページ {currentPage} / {Math.max(numPages1 || 1, numPages2 || 1)}
          </span>
          <Button 
            size="sm" 
            onClick={() => changePage(1)} 
            disabled={currentPage >= Math.max(numPages1 || 1, numPages2 || 1)}
          >
            次のページ
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button size="sm" onClick={() => adjustScale(false)} title="縮小">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span>{Math.round(scale * 100)}%</span>
          <Button size="sm" onClick={() => adjustScale(true)} title="拡大">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge 
            className={`cursor-pointer ${highlightMode === 'additions' ? 'bg-green-500' : 'bg-gray-500'}`}
            onClick={() => setHighlightMode('additions')}
          >
            追加のみ
          </Badge>
          <Badge 
            className={`cursor-pointer ${highlightMode === 'removals' ? 'bg-red-500' : 'bg-gray-500'}`}
            onClick={() => setHighlightMode('removals')}
          >
            削除のみ
          </Badge>
          <Badge 
            className={`cursor-pointer ${highlightMode === 'both' ? 'bg-blue-500' : 'bg-gray-500'}`}
            onClick={() => setHighlightMode('both')}
          >
            両方
          </Badge>
        </div>
        
        <Button 
          size="sm" 
          variant={showOriginalInOverlay ? "default" : "outline"}
          onClick={() => setShowOriginalInOverlay(!showOriginalInOverlay)}
        >
          {showOriginalInOverlay ? "差分のみ表示" : "元のPDF上に表示"}
        </Button>
      </div>
      
      {/* PDF表示エリア - ビジュアル比較 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-bold mb-2">元のPDF</h3>
          <div className="relative border rounded overflow-hidden">
            <Document
              file={pdf1Url}
              loading={<div className="p-4 text-center">読み込み中...</div>}
              error={<div className="p-4 text-center text-red-500">読み込みに失敗しました</div>}
            >
              <Page 
                pageNumber={currentPage} 
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                canvasRef={canvasRef1}
                width={600}
              />
            </Document>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-bold mb-2">新しいPDF</h3>
          <div className="relative border rounded overflow-hidden">
            <Document
              file={pdf2Url}
              loading={<div className="p-4 text-center">読み込み中...</div>}
              error={<div className="p-4 text-center text-red-500">読み込みに失敗しました</div>}
            >
              <Page 
                pageNumber={currentPage} 
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                canvasRef={canvasRef2}
                width={600}
              />
            </Document>
          </div>
        </div>
      </div>
      
      {/* 差分表示エリア */}
      <div>
        <h3 className="text-lg font-bold mb-2">視覚的な差分</h3>
        <div className="relative border rounded overflow-hidden">
          {loading ? (
            <div className="p-4 text-center">差分を分析中...</div>
          ) : (
            <div className="flex justify-center">
              <canvas 
                ref={diffCanvasRef} 
                width={600 * scale} 
                height={800 * scale} 
                className="border"
              />
            </div>
          )}
          <div className="absolute bottom-0 left-0 w-full bg-black bg-opacity-50 text-white p-2 text-sm">
            <div className="flex justify-around">
              <span className="flex items-center">
                <span className="inline-block w-3 h-3 bg-green-500 mr-1"></span> 追加された内容
              </span>
              <span className="flex items-center">
                <span className="inline-block w-3 h-3 bg-red-500 mr-1"></span> 削除された内容
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
