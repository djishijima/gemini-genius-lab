import React, { useEffect, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface IframeOverlayViewProps {
  pdf1: File | null;
  pdf2: File | null;
}

export function IframeOverlayView({ pdf1, pdf2 }: IframeOverlayViewProps) {
  const [pdf1Url, setPdf1Url] = useState<string | null>(null);
  const [pdf2Url, setPdf2Url] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(0.5);

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

  return (
    <div className="pdf-overlay-container space-y-4">
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
      
      <div className="relative w-full h-[calc(100vh-20rem)] border rounded">
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
          className="absolute top-0 left-0 w-full h-full"
          style={{ 
            opacity: opacity,
            mixBlendMode: 'difference'
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
    </div>
  );
}
