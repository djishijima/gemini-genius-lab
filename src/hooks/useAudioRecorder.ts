
import { useState, useRef, useEffect } from 'react';
import { useRecorder } from './useRecorder';
import { useRecordingTimer } from './useRecordingTimer';
import { setupAudioAnalyzer, calculateAmplitude } from '@/utils/audioAnalyzer';

interface UseAudioRecorderOptions {
  onAmplitudeChange?: (amplitude: number) => void;
}

export function useAudioRecorder(options?: UseAudioRecorderOptions) {
  const [amplitude, setAmplitude] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const { 
    isRecording, 
    audioBlob, 
    audioStream,
    startRecording: startMediaRecording, 
    stopRecording, 
    setAudioBlob 
  } = useRecorder({
    onRecordingStatusChange: (recording) => {
      if (!recording) {
        setAmplitude(0);
      }
    }
  });
  
  const recordingTime = useRecordingTimer(isRecording);

  // Update parent component with amplitude value when it changes
  useEffect(() => {
    if (options?.onAmplitudeChange) {
      options.onAmplitudeChange(amplitude);
    }
  }, [amplitude, options]);

  // Set up audio analyzer when recording starts
  useEffect(() => {
    if (isRecording && audioStream) {
      try {
        const { audioContext, analyser } = setupAudioAnalyzer(audioStream);
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        
        calculateAmplitude(analyser, isRecording, setAmplitude);
      } catch (error) {
        console.error("AudioContext error:", error);
      }
    }
  }, [isRecording, audioStream]);

  // Clean up audio resources when recording stops
  useEffect(() => {
    if (!isRecording && audioStream) {
      const cleanupAudio = () => {
        console.log("オーディオリソースのクリーンアップ");
        
        for (const track of audioStream.getTracks()) {
          track.stop();
        }
        
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        
        setAmplitude(0);
      };
      
      const timeoutId = setTimeout(cleanupAudio, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [isRecording, audioStream]);

  const startRecording = async () => {
    setAmplitude(0);
    await startMediaRecording();
  };

  return {
    isRecording,
    audioBlob,
    recordingTime,
    amplitude,
    audioStream,
    startRecording,
    stopRecording,
    setAudioBlob,
  };
}
