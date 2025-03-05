import React, { useEffect, useState, useRef } from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

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
  
  const pdf2ContainerRef = useRef<HTMLDivElement>(null);

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

  if (!pdf1Url || !pdf2Url) {
    return (
      <div className="flex items-center justify-center h-full border rounded p-4">
        <p>両方のPDFファイルが必要です</p>
      </div>
    );
  }

  // 位置調整関数
  const adjustPosition = (direction: 'up' | 'down' | 'left' | 'right', amount: number = 10) => {
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

  // スケール調整関数
  const adjustScale = (increase: boolean) => {
    setScale(prev => increase ? prev + 0.05 : Math.max(0.1, prev - 0.05));
  };
  
  // 回転調整関数
  const adjustRotation = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // ブレンドモード変更関数
  const changeBlendMode = () => {
    const modes = ['difference', 'multiply', 'screen', 'overlay', 'darken', 'lighten'];
    const currentIndex = modes.indexOf(blendMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setBlendMode(modes[nextIndex]);
  };
  
  // リセット関数
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
      <div className="control-panel grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-100 rounded-lg">
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
      </div>
      
      {/* 位置調整コントロール */}
      <div className="position-controls flex justify-center space-x-4 mb-4">
        <div className="flex flex-col items-center">
          <Button size="sm" onClick={() => adjustPosition('up')} title="上へ移動">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <div className="flex space-x-2 my-1">
            <Button size="sm" onClick={() => adjustPosition('left')} title="左へ移動">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={() => adjustPosition('right')} title="右へ移動">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <Button size="sm" onClick={() => adjustPosition('down')} title="下へ移動">
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex flex-col space-y-2">
          <Button size="sm" onClick={adjustRotation} title="回転">
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={resetAdjustments} title="リセット">
            リセット
          </Button>
        </div>
      </div>
      
      {/* PDFビューア */}
      <div className="relative w-full h-[calc(100vh-30rem)] border rounded overflow-hidden bg-gray-800">
        {/* 背景のPDF */}
        <div className="absolute top-0 left-0 w-full h-full">
          <iframe
            src={`${pdf1Url}#toolbar=0`}
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
            src={`${pdf2Url}#toolbar=0`}
            className="w-full h-full"
            title="Overlay PDF"
            frameBorder="0"
          />
        </div>
      </div>
      
      <div className="text-sm text-gray-500 mt-2">
        操作方法: 矢印ボタンで位置調整、拡大/縮小ボタンでサイズ調整、回転ボタンで90度回転
      </div>
    </div>
  );
}
