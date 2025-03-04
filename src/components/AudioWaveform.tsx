
import { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  isRecording?: boolean;
  recordingTime?: number;
  amplitude?: number;
  audioStream?: MediaStream;
}

export function AudioWaveform({ isRecording, amplitude = 0.5, audioStream }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;

    // アニメーションフレームをキャンセル
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // 波形のアニメーション関数
    const drawWaveform = () => {
      if (!ctx || !canvasRef.current) return;
      
      // キャンバスをクリア
      ctx.fillStyle = 'rgb(20, 20, 20)';
      ctx.fillRect(0, 0, width, height);
      
      if (isRecording) {
        // 波形の描画
        const centerY = height / 2;
        const waveHeight = height * 0.7 * amplitude; // 視覚化のために振幅をスケーリング
        
        // 中心線の描画
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.strokeStyle = 'rgb(99, 102, 241)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // 動的な波形の描画
        ctx.beginPath();
        
        // 波のセグメント数
        const segments = 20;
        const segmentWidth = width / segments;
        
        ctx.moveTo(0, centerY);
        
        for (let i = 0; i <= segments; i++) {
          const x = i * segmentWidth;
          // 振幅に基づいてランダムな波形効果を作成
          const randomFactor = Math.random() * 0.4 + 0.8; // 0.8から1.2の間のランダム値
          const y = centerY + Math.sin(i * 0.5 + Date.now() * 0.005) * waveHeight * randomFactor;
          ctx.lineTo(x, y);
        }
        
        ctx.strokeStyle = 'rgb(129, 140, 248)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 境界線の描画
        ctx.beginPath();
        ctx.moveTo(0, centerY - waveHeight);
        ctx.lineTo(width, centerY - waveHeight);
        ctx.moveTo(0, centerY + waveHeight);
        ctx.lineTo(width, centerY + waveHeight);
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // アニメーションを継続
        animationFrameRef.current = requestAnimationFrame(drawWaveform);
      }
    };
    
    // 波形の描画を開始
    if (isRecording) {
      drawWaveform();
    }
    
    // クリーンアップ
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isRecording, amplitude]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={100}
      className="w-full h-full rounded-lg bg-[rgb(20,20,20)]"
    />
  );
}
