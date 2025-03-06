import { Button } from "@/components/ui/button";
import { Mic, StopCircle, Volume2 } from "lucide-react";
import { formatTime } from "@/utils/formatTime";
import { useEffect, useState } from "react";

interface AudioRecorderControlsProps {
  isRecording: boolean;
  recordingTime: number;
  amplitude: number;
  audioStream: MediaStream | null;
  isProcessing: boolean;
  isTranscribing: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onFileInputClick: () => void; // 互換性のために残しておく
}

export function AudioRecorderControls({
  isRecording,
  recordingTime,
  amplitude,
  audioStream,
  isProcessing,
  isTranscribing,
  onStartRecording,
  onStopRecording,
}: AudioRecorderControlsProps) {
  const [audioLevel, setAudioLevel] = useState<number[]>([0, 0, 0, 0, 0]);

  useEffect(() => {
    let animationId: number;
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let dataArray: Uint8Array | null = null;

    const updateAudioLevel = () => {
      if (audioStream && isRecording) {
        if (!audioContext) {
          audioContext = new AudioContext();
          const source = audioContext.createMediaStreamSource(audioStream);
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 32;
          source.connect(analyser);
          dataArray = new Uint8Array(analyser.frequencyBinCount);
        }

        if (analyser && dataArray) {
          analyser.getByteFrequencyData(dataArray);
          // 音声レベルの計算 (0-100の範囲に正規化)
          const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
          const normalized = Math.min(100, Math.max(0, average * 2));
          
          // 新しいレベル配列を作成（古いものをシフトして新しい値を追加）
          setAudioLevel(prev => {
            const newLevels = [...prev.slice(1), normalized];
            return newLevels;
          });
        }
      }
      animationId = requestAnimationFrame(updateAudioLevel);
    };

    if (isRecording && audioStream) {
      updateAudioLevel();
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [isRecording, audioStream]);

  return (
    <div className="flex flex-col items-center space-y-4 p-6 border rounded-lg bg-muted/10">
      {isRecording ? (
        <div className="w-full space-y-4">
          <div className="flex flex-col items-center w-full space-y-2 p-3 border rounded-lg bg-red-50 dark:bg-red-950/20">
            <div className="flex items-center space-x-2 w-full">
              <div className="h-4 w-4 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-500 font-semibold text-lg">録音中</span>
              <span className="ml-2 font-mono text-xl font-bold">{formatTime(recordingTime)}</span>
              <Volume2 className="ml-auto h-5 w-5 text-red-500 animate-pulse" />
            </div>
            
            {/* 音声波形アニメーション */}
            <div className="flex items-end justify-center space-x-1 h-12 w-full mt-2">
              {audioLevel.map((level, index) => (
                <div 
                  key={index}
                  className="w-3 bg-red-500 rounded-t-sm transition-all duration-100"
                  style={{ 
                    height: `${Math.max(10, level)}%`,
                    opacity: level > 10 ? 1 : 0.7
                  }}
                />
              ))}
            </div>
          </div>
          
          <div className="w-full flex justify-center">
            <Button
              size="lg"
              variant="destructive"
              onClick={onStopRecording}
              className="w-full max-w-md shadow-lg hover:shadow-red-200/50"
              disabled={isProcessing || isTranscribing}
            >
              <StopCircle className="mr-2 h-5 w-5" />
              録音を停止
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full flex justify-center">
          <Button
            size="lg"
            variant="default"
            onClick={onStartRecording}
            className="w-full max-w-md"
            disabled={isProcessing || isTranscribing}
          >
            <Mic className="mr-2 h-5 w-5" />
            録音を開始
          </Button>
        </div>
      )}
    </div>
  );
}
