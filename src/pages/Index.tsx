
import { Button } from "@/components/ui/button";
import { FileText, Mic, FileDiff, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Joyride, { CallBackProps, Status } from 'react-joyride';
import { homeSteps } from "@/config/tour-steps";
import { useToast } from "@/components/ui/use-toast";
import { useEffect, useState } from "react";

export default function Index() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenHomeTour');
    if (!hasSeenTour) {
      setRunTour(true);
    }
  }, []);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    if ([Status.FINISHED, Status.SKIPPED].includes(status)) {
      localStorage.setItem('hasSeenHomeTour', 'true');
      toast({
        title: "チュートリアル完了",
        description: "ツアーガイドが完了しました。いつでも設定から再表示できます。",
      });
    }
  };
  
  return (
    <div className="container mx-auto p-6">
      <Joyride
        steps={homeSteps}
        run={runTour}
        continuous
        showSkipButton
        showProgress
        locale={{
          back: "戻る",
          close: "閉じる",
          last: "完了",
          next: "次へ",
          skip: "スキップ"
        }}
        styles={{
          options: {
            primaryColor: '#0EA5E9',
            zIndex: 1000,
          },
        }}
        callback={handleJoyrideCallback}
      />

      <h1 className="text-4xl font-bold mb-8">ツール一覧</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Button
          variant="outline"
          className="h-32 audio-recorder-card"
          onClick={() => navigate("/audio-recorder")}
        >
          <div className="flex flex-col items-center gap-2">
            <Mic className="h-6 w-6" />
            <span>音声入力</span>
          </div>
        </Button>
        <Button
          variant="outline"
          className="h-32 transcription-card"
          onClick={() => navigate("/transcription")}
        >
          <div className="flex flex-col items-center gap-2">
            <FileText className="h-6 w-6" />
            <span>InDesign スクリプト生成</span>
          </div>
        </Button>
        <Button
          variant="outline"
          className="h-32 pdf-compare-card"
          onClick={() => navigate("/pdf-compare")}
        >
          <div className="flex flex-col items-center gap-2">
            <FileDiff className="h-6 w-6" />
            <span>PDF比較ツール</span>
          </div>
        </Button>
        <Button
          variant="outline"
          className="h-32 settings-card"
          onClick={() => navigate("/settings")}
        >
          <div className="flex flex-col items-center gap-2">
            <Settings className="h-6 w-6" />
            <span>設定</span>
          </div>
        </Button>
      </div>
    </div>
  );
}
