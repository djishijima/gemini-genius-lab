import { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  isRecording?: boolean;
  recordingTime?: number;
  amplitude?: number;
  audioStream?: MediaStream;
}

export function AudioWaveform({ isRecording, amplitude = 0.5, audioStream }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = 'rgb(20, 20, 20)';
    ctx.fillRect(0, 0, width, height);

    // Draw waveform if recording
    if (isRecording) {
      // Draw waveform
      const centerY = height / 2;
      const waveHeight = height * 0.7 * amplitude; // Scale amplitude for better visualization
      
      // Draw center line
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.strokeStyle = 'rgb(99, 102, 241)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Draw dynamic waveform
      ctx.beginPath();
      
      // Number of wave segments
      const segments = 20;
      const segmentWidth = width / segments;
      
      ctx.moveTo(0, centerY);
      
      for (let i = 0; i <= segments; i++) {
        const x = i * segmentWidth;
        // Create a randomized wave effect based on amplitude
        const randomFactor = Math.random() * 0.4 + 0.8; // Random between 0.8 and 1.2
        const y = centerY + Math.sin(i * 0.5 + Date.now() * 0.005) * waveHeight * randomFactor;
        ctx.lineTo(x, y);
      }
      
      ctx.strokeStyle = 'rgb(129, 140, 248)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw boundary lines
      ctx.beginPath();
      ctx.moveTo(0, centerY - waveHeight);
      ctx.lineTo(width, centerY - waveHeight);
      ctx.moveTo(0, centerY + waveHeight);
      ctx.lineTo(width, centerY + waveHeight);
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Request animation frame to keep the waveform moving
      const animationId = requestAnimationFrame(() => {
        if (isRecording) {
          // This will trigger the effect again
          const canvasElement = canvasRef.current;
          if (canvasElement) {
            const context = canvasElement.getContext('2d');
            if (context) {
              context.clearRect(0, 0, width, height);
            }
          }
        }
      });
      
      return () => {
        cancelAnimationFrame(animationId);
      };
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
