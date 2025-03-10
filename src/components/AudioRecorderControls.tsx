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
        try {
          // AudioContextの初期化
          if (!audioContext) {
            console.log('音声分析のAudioContextを初期化中...');
            // 明示的な型定義でanyを回避
            type AudioContextType = typeof AudioContext
            type WebkitAudioContextType = typeof AudioContext
            const AudioContextClass = window.AudioContext || ((window as unknown as {webkitAudioContext: WebkitAudioContextType}).webkitAudioContext);
            audioContext = new AudioContextClass();
            const source = audioContext.createMediaStreamSource(audioStream);
            analyser = audioContext.createAnalyser();
            // 小さい値に設定してパフォーマンスを改善
            analyser.fftSize = 128;
            // 時間周波数特性を適用
            analyser.smoothingTimeConstant = 0.8;
            source.connect(analyser);
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            console.log('音声分析器の初期化完了：', {
              fftSize: analyser.fftSize,
              frequencyBinCount: analyser.frequencyBinCount,
              channelCount: audioContext.destination.channelCount
            });
          }

          // 音声データの取得と表示
          if (analyser && dataArray) {
            // 周波数データを取得
            analyser.getByteFrequencyData(dataArray);
            
            // 幅値の計算方法を改善（ログスケールに近い処理）
            const values = Array.from(dataArray.slice(0, 5));
            const maxValue = Math.max(...values, 1); // 0による割り算を避ける
            
            // 正規化と強調
            const normalizedValues = values.map(v => {
              // 非線形なスケーリングで視覚的に分かりやすくする - Math.powの代わりに**演算子を使用
              const normalized = ((v / maxValue) ** 0.7) * 100;
              return Math.min(100, Math.max(15, normalized));
            });
            
            // 最大値が30より小さい場合はランダムな動きを付ける
            const finalValues = maxValue < 30 ? 
              normalizedValues.map(v => v + Math.random() * 20) : 
              normalizedValues;
              
            setAudioLevel(finalValues);
          }
        } catch (error) {
          console.error('音声波形の更新中にエラーが発生しました:', error);
        }
      } else if (!isRecording) {
        // 非録音時は音量を下げる
        setAudioLevel([15, 15, 15, 15, 15]);
      }
      
      // アニメーションフレームを続ける
      animationId = requestAnimationFrame(updateAudioLevel);
    };

    // 録音が開始されたら音声レベルの更新を開始
    if (isRecording && audioStream) {
      console.log('音声波形のアニメーションを開始します');
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
                  key={`wave-bar-${index}-${level.toFixed(2)}`}
                  className="w-4 bg-red-500 rounded-t-md transition-all duration-75 transform hover:scale-110"
                  style={{ 
                    height: `${level}%`,
                    opacity: 0.7 + (level / 300)
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
