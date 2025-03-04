
import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from "@/components/ui/use-toast";

interface UseAudioRecorderOptions {
  onAmplitudeChange?: (amplitude: number) => void;
}

export function useAudioRecorder(options?: UseAudioRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [amplitude, setAmplitude] = useState(0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  const { toast } = useToast();

  // Update parent component with amplitude value when it changes
  useEffect(() => {
    if (options?.onAmplitudeChange) {
      options.onAmplitudeChange(amplitude);
    }
  }, [amplitude, options]);

  // Handle recording time tracking
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRecording]);

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
        
        setAudioStream(null);
        setAmplitude(0);
      };
      
      const timeoutId = setTimeout(cleanupAudio, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [isRecording, audioStream]);

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
      
      const options = { mimeType: 'audio/webm' };
      const recorder = new MediaRecorder(stream, options);
      console.log("MediaRecorderが作成されました:", recorder.state);
      
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      // Create audio context and analyser for amplitude calculation
      try {
        // Fix the AudioContext reference
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        
        // Calculate amplitude
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const calculateAmplitude = () => {
          if (!analyserRef.current || !isRecording) return;
          
          analyserRef.current.getByteFrequencyData(dataArray);
          const sum = dataArray.reduce((acc, value) => acc + value, 0);
          const avg = sum / dataArray.length;
          const normalizedAmplitude = avg / 128.0;
          
          const newAmplitude = normalizedAmplitude > 0 ? normalizedAmplitude : 0.05;
          setAmplitude(newAmplitude);
          
          if (isRecording) {
            requestAnimationFrame(calculateAmplitude);
          }
        };
        
        // Start amplitude calculation
        requestAnimationFrame(calculateAmplitude);
      } catch (error) {
        console.error("AudioContext error:", error);
      }

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
      setRecordingTime(0);
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
    recordingTime,
    amplitude,
    audioStream,
    startRecording,
    stopRecording,
    setAudioBlob, // Expose this for file uploads
  };
}
