
import { useState, useRef, useCallback } from 'react';
import { useToast } from "@/components/ui/use-toast";

interface UseRecorderOptions {
  onRecordingStatusChange?: (isRecording: boolean) => void;
}

export function useRecorder(options?: UseRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      
      if (audioStream) {
        for (const track of audioStream.getTracks()) {
          track.stop();
        }
        setAudioStream(null);
      }
      
      // クリア
      setAudioBlob(null);
      audioChunksRef.current = [];
      
      console.log("マイクへのアクセスを要求中...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      console.log("マイクへのアクセスが許可されました");
      
      setAudioStream(stream);
      
      if (!window.MediaRecorder) {
        throw new Error("お使いのブラウザはMediaRecorderをサポートしていません");
      }
      
      const recorderOptions = { mimeType: 'audio/webm' };
      const recorder = new MediaRecorder(stream, recorderOptions);
      console.log("MediaRecorderが作成されました:", recorder.state);
      
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        console.log("データ取得:", event.data.size, "bytes");
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder エラー:", event);
        toast({
          title: "録音エラー",
          description: "録音中にエラーが発生しました",
          variant: "destructive"
        });
      };

      recorder.onstop = async () => {
        console.log("録音停止");
        setIsRecording(false);
        
        if (options?.onRecordingStatusChange) {
          options.onRecordingStatusChange(false);
        }
        
        if (audioChunksRef.current.length === 0) {
          toast({
            title: "エラー",
            description: "録音データが取得できませんでした",
            variant: "destructive"
          });
          return;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log("録音データサイズ:", audioBlob.size, "bytes");
        setAudioBlob(audioBlob);
      };

      console.log("録音を開始します...");
      recorder.start(1000);
      console.log("録音状態:", recorder.state);
      
      setIsRecording(true);
      if (options?.onRecordingStatusChange) {
        options.onRecordingStatusChange(true);
      }
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "エラー",
        description: `録音の開始に失敗しました: ${error.message || "不明なエラー"}`,
        variant: "destructive"
      });
    }
  };

  const stopRecording = useCallback(() => {
    console.log("録音を停止します...");
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          console.log("MediaRecorder停止");
        }
      } catch (error) {
        console.error("録音停止エラー:", error);
        toast({
          title: "エラー",
          description: "録音の停止中にエラーが発生しました",
          variant: "destructive"
        });
      }
    }
  }, [toast]);

  return {
    isRecording,
    audioBlob,
    audioStream,
    startRecording,
    stopRecording,
    setAudioBlob,
  };
}
