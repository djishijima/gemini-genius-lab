
import { Button } from "@/components/ui/button";
import { Mic, StopCircle, Upload } from "lucide-react";
import { formatTime } from '@/utils/formatTime';

interface AudioRecorderControlsProps {
  isRecording: boolean;
  recordingTime: number;
  amplitude: number;
  audioStream: MediaStream | null;
  isProcessing: boolean;
  isTranscribing: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onFileInputClick: () => void;
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
  onFileInputClick
}: AudioRecorderControlsProps) {
  return (
    <>
      <div className="flex flex-col items-center space-y-4 p-6 border rounded-lg bg-muted/10">
        {isRecording ? (
          <div className="w-full space-y-4">
            {isRecording && (
              <div className="flex items-center space-x-2 mt-2">
                <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-500 font-medium">録音中</span>
                <span className="ml-2 font-mono text-lg">{formatTime(recordingTime)}</span>
              </div>
            )}
            <div className="w-full flex justify-center">
              <Button
                size="lg"
                variant="destructive"
                onClick={onStopRecording}
                className="w-full max-w-md"
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

      <div className="space-y-2">
        <Button
          variant="outline"
          onClick={onFileInputClick}
          className="w-full"
          disabled={isRecording || isProcessing || isTranscribing}
        >
          <Upload className="mr-2 h-4 w-4" />
          音声ファイルをアップロード
        </Button>
      </div>
    </>
  );
}
