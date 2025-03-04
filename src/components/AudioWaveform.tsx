
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
  const isAnimatingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;

    // Cancel any existing animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Clear canvas initially
    ctx.fillStyle = 'rgb(20, 20, 20)';
    ctx.fillRect(0, 0, width, height);

    // Flag to track animation state
    isAnimatingRef.current = isRecording;

    // Waveform animation function
    const drawWaveform = () => {
      if (!ctx || !canvasRef.current || !isAnimatingRef.current) return;
      
      // Clear canvas
      ctx.fillStyle = 'rgb(20, 20, 20)';
      ctx.fillRect(0, 0, width, height);
      
      // Draw waveform
      const centerY = height / 2;
      const waveHeight = height * 0.7 * amplitude; // Scale amplitude for visualization
      
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
        // Create random wave effect based on amplitude
        const randomFactor = Math.random() * 0.4 + 0.8; // Random value between 0.8 and 1.2
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
      
      // Continue animation
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
    };
    
    // Start waveform drawing if recording
    if (isRecording) {
      console.log("Starting waveform animation");
      drawWaveform();
    } else {
      // If not recording, just draw a flat line
      ctx.fillStyle = 'rgb(20, 20, 20)';
      ctx.fillRect(0, 0, width, height);
      
      const centerY = height / 2;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.strokeStyle = 'rgb(99, 102, 241)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    
    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        console.log("Cleaning up waveform animation");
        isAnimatingRef.current = false;
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
