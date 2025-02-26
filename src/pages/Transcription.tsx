
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { Mic, StopCircle, Copy } from "lucide-react";
import { AudioWaveform } from "@/components/AudioWaveform";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { processAudioForTranscription } from "@/utils/audioProcessing";

const Transcription = () => {
  const [transcription, setTranscription] = useState("");
  const { toast } = useToast();
  const {
    audioBlob,
    isRecording,
    startRecording,
    stopRecording,
    recordingTime,
    amplitude,
  } = useAudioRecorder();

  const handleTranscribe = async () => {
    if (!audioBlob) {
      toast({
        title: "エラー",
        description: "音声が録音されていません",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await processAudioForTranscription(audioBlob);
      setTranscription(result);
      toast({
        title: "完了",
        description: "文字起こしが完了しました",
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "文字起こしに失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(transcription);
    toast({
      title: "コピー完了",
      description: "テキストをクリップボードにコピーしました",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100 text-2xl">音声文字起こし</CardTitle>
          <CardDescription className="text-slate-400">
            音声を録音して、自動で文字起こしを行います
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="border-b border-slate-700">
          <CardTitle className="text-slate-100">録音</CardTitle>
          <CardDescription className="text-slate-400">
            {isRecording ? "録音中..." : "録音を開始してください"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex justify-center gap-4">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              {isRecording ? (
                <>
                  <StopCircle className="h-5 w-5" />
                  録音停止
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5" />
                  録音開始
                </>
              )}
            </Button>
            {audioBlob && (
              <Button
                onClick={handleTranscribe}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                文字起こし開始
              </Button>
            )}
          </div>

          <div className="h-32 relative border border-slate-700 rounded-lg overflow-hidden">
            <AudioWaveform
              isRecording={isRecording}
              recordingTime={recordingTime}
              amplitude={amplitude}
            />
          </div>
        </CardContent>
      </Card>

      {transcription && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-slate-100">文字起こし結果</CardTitle>
                <CardDescription className="text-slate-400">
                  テキストをコピーして利用できます
                </CardDescription>
              </div>
              <Button
                onClick={handleCopy}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                コピー
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] w-full rounded-md border border-slate-700">
              <div className="p-4">
                <div className="whitespace-pre-wrap text-slate-100">
                  {transcription}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Transcription;
