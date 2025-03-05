import React, { useEffect, useState, useRef } from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ZoomIn, ZoomOut, RotateCw, Move, MousePointer } from 'lucide-react';

interface IframeOverlayViewProps {
  pdf1: File | null;
  pdf2: File | null;
}

export function IframeOverlayView({ pdf1, pdf2 }: IframeOverlayViewProps) {
  const [pdf1Url, setPdf1Url] = useState<string | null>(null);
  const [pdf2Url, setPdf2Url] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(0.5);
  const [scale, setScale] = useState(1.0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [blendMode, setBlendMode] = useState<string>('difference');
  const [moveAmount, setMoveAmount] = useState(10); // デフォルトの移動量
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const [interactionMode, setInteractionMode] = useState<'buttons' | 'drag'>('buttons');
  // PDFの実際の高さを管理する状態
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  
  const pdf2ContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // File オブジェクトから Blob URL を作成
    if (pdf1) {
      const url = URL.createObjectURL(pdf1);
      setPdf1Url(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [pdf1]);

  useEffect(() => {
    // File オブジェクトから Blob URL を作成
    if (pdf2) {
      const url = URL.createObjectURL(pdf2);
      setPdf2Url(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [pdf2]);
  
  // PDFのURLが生成された後に、PDFの高さを取得する
  useEffect(() => {
    if (!pdf1Url) return;
    
    // PDFがロードされたときにPDFの実際の高さを検出するための関数
    const detectPdfHeight = () => {
      // 離れた場所にiframeを作成してロード
      const testFrame = document.createElement('iframe');
      testFrame.style.position = 'absolute';
      testFrame.style.left = '-9999px';
      testFrame.style.width = '1000px';
      testFrame.style.height = '1000px';
      testFrame.src = `${pdf1Url}#toolbar=0`;
      document.body.appendChild(testFrame);
      
      // ロード完了時に高さを取得
      testFrame.onload = () => {
        try {
          if (testFrame.contentWindow && testFrame.contentDocument) {
            // PDFがレンダリングされた後の高さを取得
            const height = Math.max(
              testFrame.contentDocument.body.scrollHeight,
              testFrame.contentDocument.documentElement.scrollHeight,
              1000 // 最低値
            );
            
            console.log(`PDFの実際の高さ: ${height}px`);
            setContainerHeight(height);
          }
        } catch (e) {
          console.error('PDF高さの取得中にエラーが発生しました:', e);
          // エラーが発生した場合、最低値を設定
          setContainerHeight(1000);
        } finally {
          // 使い終わったテストフレームを削除
          setTimeout(() => {
            document.body.removeChild(testFrame);
          }, 500);
        }
      };
    };
    
    // PDFがロードされるのを少し待ってから高さを検出
    const timer = setTimeout(detectPdfHeight, 1000);
    
    return () => {
      clearTimeout(timer);
    };
  }, [pdf1Url]);

  useEffect(() => {
    // キーボードショートカットのイベントハンドラ
    const handleKeyDown = (e: KeyboardEvent) => {
      // 矢印キー
      const amount = e.shiftKey ? moveAmount : 1;
      if (e.key === 'ArrowUp') {
        setOffsetY(prev => prev - amount);
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        setOffsetY(prev => prev + amount);
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        setOffsetX(prev => prev - amount);
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        setOffsetX(prev => prev + amount);
        e.preventDefault();
      }
      
      // 拡大縮小（+/-キー）
      if (e.key === '+' || e.key === '=') {
        setScale(prev => prev + 0.05);
        e.preventDefault();
      } else if (e.key === '-' || e.key === '_') {
        setScale(prev => Math.max(0.1, prev - 0.05));
        e.preventDefault();
      }
      
      // 回転（R）
      if (e.key === 'r' || e.key === 'R') {
        setRotation(prev => (prev + 90) % 360);
        e.preventDefault();
      }
      
      // リセット（0）
      if (e.key === '0') {
        setOffsetX(0);
        setOffsetY(0);
        setScale(1.0);
        setRotation(0);
        setBlendMode('difference');
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [moveAmount, offsetX, offsetY]);
  
  if (!pdf1Url || !pdf2Url) {
    return (
      <div className="flex items-center justify-center h-full border rounded p-4">
        <p>両方のPDFファイルが必要です</p>
      </div>
    );
  }

  // ヘルパー関数
  const adjustPosition = (direction: 'up' | 'down' | 'left' | 'right', isFine: boolean = false) => {
    const amount = isFine ? 1 : moveAmount;
    
    switch (direction) {
      case 'up':
        setOffsetY(prev => prev - amount);
        break;
      case 'down':
        setOffsetY(prev => prev + amount);
        break;
      case 'left':
        setOffsetX(prev => prev - amount);
        break;
      case 'right':
        setOffsetX(prev => prev + amount);
        break;
    }
  };

  const adjustScale = (increase: boolean) => {
    setScale(prev => increase ? prev + 0.05 : Math.max(0.1, prev - 0.05));
  };
  
  const adjustRotation = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const changeBlendMode = () => {
    const modes = ['difference', 'multiply', 'screen', 'overlay', 'darken', 'lighten'];
    const currentIndex = modes.indexOf(blendMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setBlendMode(modes[nextIndex]);
  };
  
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (interactionMode !== 'drag') return;
    
    setIsDragging(true);
    setDragStartX(e.clientX - offsetX);
    setDragStartY(e.clientY - offsetY);
  };

  const handleDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    setOffsetX(e.clientX - dragStartX);
    setOffsetY(e.clientY - dragStartY);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  const resetAdjustments = () => {
    setOffsetX(0);
    setOffsetY(0);
    setScale(1.0);
    setRotation(0);
    setBlendMode('difference');
  };

  return (
    <div className="pdf-overlay-container space-y-4">
      {/* コントロールパネル */}
      <div className="control-panel grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-100 rounded-lg">
        {/* 透明度コントロール */}
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
        
        {/* 拡大縮小コントロール */}
        <div className="control-group">
          <Label>拡大縮小: {scale.toFixed(2)}x</Label>
          <div className="flex space-x-2 mt-2">
            <Button size="sm" onClick={() => adjustScale(false)} title="縮小">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Slider
              min={0.1}
              max={3}
              step={0.05}
              value={[scale]}
              onValueChange={(value) => setScale(value[0])}
              className="flex-grow"
            />
            <Button size="sm" onClick={() => adjustScale(true)} title="拡大">
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* ブレンドモードコントロール */}
        <div className="control-group">
          <Label>ブレンドモード: {blendMode}</Label>
          <Button 
            className="mt-2 w-full" 
            onClick={changeBlendMode}
            size="sm"
          >
            ブレンドモード切替
          </Button>
        </div>
        
        {/* 移動量設定コントロール */}
        <div className="control-group">
          <Label htmlFor="move-amount-control">移動量: {moveAmount}px</Label>
          <Slider
            id="move-amount-control"
            min={1}
            max={50}
            step={1}
            value={[moveAmount]}
            onValueChange={(value) => setMoveAmount(value[0])}
            className="mt-2"
          />
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>精密 (1px)</span>
            <span>大きく (50px)</span>
          </div>
        </div>
      </div>
      
      {/* インタラクションモード選択 */}
      <div className="interaction-mode-selector flex justify-center space-x-4 mb-4">
        <RadioGroup 
          value={interactionMode} 
          onValueChange={(value) => setInteractionMode(value as 'buttons' | 'drag')} 
          className="flex space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="buttons" id="buttons" />
            <Label htmlFor="buttons" className="flex items-center cursor-pointer">
              <MousePointer className="h-4 w-4 mr-1" />
              ボタン操作
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="drag" id="drag" />
            <Label htmlFor="drag" className="flex items-center cursor-pointer">
              <Move className="h-4 w-4 mr-1" />
              ドラッグ操作
            </Label>
          </div>
        </RadioGroup>
      </div>
      
      {/* 位置調整コントロール - ボタンモードのときのみ表示 */}
      {interactionMode === 'buttons' && (
        <div className="position-controls flex justify-center space-x-8 mb-4">
          <div className="grid grid-cols-3 gap-1">
            <div></div>
            <Button size="sm" onClick={() => adjustPosition('up', false)} title="上へ移動" variant="outline">
              <ArrowUp className="h-4 w-4" />
            </Button>
            <div></div>
            
            <Button size="sm" onClick={() => adjustPosition('left', false)} title="左へ移動" variant="outline">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={resetAdjustments} title="リセット" variant="outline">
              リセット
            </Button>
            <Button size="sm" onClick={() => adjustPosition('right', false)} title="右へ移動" variant="outline">
              <ArrowRight className="h-4 w-4" />
            </Button>
            
            <div></div>
            <Button size="sm" onClick={() => adjustPosition('down', false)} title="下へ移動" variant="outline">
              <ArrowDown className="h-4 w-4" />
            </Button>
            <div></div>
          </div>
          
          <div className="grid grid-cols-3 gap-1">
            <div></div>
            <Button size="sm" onClick={() => adjustPosition('up', true)} title="上へ微調整" variant="outline" className="text-xs">
              <ArrowUp className="h-3 w-3" />
              1px
            </Button>
            <div></div>
            
            <Button size="sm" onClick={() => adjustPosition('left', true)} title="左へ微調整" variant="outline" className="text-xs">
              <ArrowLeft className="h-3 w-3" />
              1px
            </Button>
            <Button size="sm" onClick={adjustRotation} title="回転" variant="outline">
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={() => adjustPosition('right', true)} title="右へ微調整" variant="outline" className="text-xs">
              <ArrowRight className="h-3 w-3" />
              1px
            </Button>
            
            <div></div>
            <Button size="sm" onClick={() => adjustPosition('down', true)} title="下へ微調整" variant="outline" className="text-xs">
              <ArrowDown className="h-3 w-3" />
              1px
            </Button>
            <div></div>
          </div>
        </div>
      )}
      
      {/* PDFビューア */}
      <div 
        ref={containerRef}
        className="relative w-full border rounded overflow-auto bg-gray-800"
        onMouseDown={handleDragStart}
        onMouseMove={handleDrag}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        style={{ 
          cursor: interactionMode === 'drag' ? 'move' : 'default',
          height: containerHeight ? `${containerHeight}px` : 'auto',
          minHeight: '400px'
        }}
      >
        {/* 背景のPDF */}
        <div className="absolute top-0 left-0 w-full h-full">
          <iframe
            src={`${pdf1Url}#toolbar=0&zoom=page-fit`}
            className="w-full h-full"
            title="Background PDF"
            frameBorder="0"
          />
        </div>
        
        {/* オーバーレイのPDF */}
        <div 
          ref={pdf2ContainerRef}
          className="absolute top-0 left-0 w-full h-full"
          style={{ 
            opacity: opacity,
            mixBlendMode: blendMode as any,
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease'
          }}
        >
          <iframe
            src={`${pdf2Url}#toolbar=0&zoom=page-fit`}
            className="w-full h-full"
            title="Overlay PDF"
            frameBorder="0"
          />
        </div>
      </div>
      
      <div className="text-sm text-gray-500 mt-2">
        <div><strong>操作方法</strong></div>
        <ul className="list-disc pl-5">
          <li>ボタン操作モード: 矢印ボタンで位置調整（標準・微調整）</li>
          <li>ドラッグ操作モード: マウスでドラッグして直感的に位置調整</li>
          <li>キーボードショートカット: 矢印キーで移動、Shift+矢印で大きく移動、+/-で拡大縮小、Rで回転、0でリセット</li>
          <li>スクロール: マウスホイールやスクロールバーでスクロールできます</li>
        </ul>
      </div>
    </div>
  );
}
