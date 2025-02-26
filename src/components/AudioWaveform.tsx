
import { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  isRecording: boolean;
  recordingTime: number;
  amplitude: number;
}

export function AudioWaveform({ isRecording, amplitude }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = 'rgb(20, 20, 20)';
    ctx.fillRect(0, 0, width, height);

    if (isRecording) {
      // Draw waveform
      const centerY = height / 2;
      const waveHeight = height * amplitude;

      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.strokeStyle = 'rgb(99, 102, 241)';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, centerY - waveHeight / 2);
      ctx.lineTo(width, centerY - waveHeight / 2);
      ctx.moveTo(0, centerY + waveHeight / 2);
      ctx.lineTo(width, centerY + waveHeight / 2);
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
      ctx.stroke();
    }
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
