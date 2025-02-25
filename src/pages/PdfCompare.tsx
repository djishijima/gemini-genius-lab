
import React, { useState } from 'react';
import { diffLines } from 'diff';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import Joyride, { EVENTS, STATUS } from 'react-joyride';
import { useToast } from "@/hooks/use-toast";
import { calculateSimilarity } from '@/utils/calculateSimilarity';
import { PdfDropzone } from '@/components/pdf-compare/PdfDropzone';
import { ComparisonView } from '@/components/pdf-compare/ComparisonView';
import { DifferencesList } from '@/components/pdf-compare/DifferencesList';
import { tourSteps } from '@/config/tour-steps';
import type { Difference, SimilarityStats, TourState } from '@/types/pdf-compare';

export default function PdfCompare() {
  const [pdf1Text, setPdf1Text] = useState('');
  const [pdf2Text, setPdf2Text] = useState('');
  const [differences, setDifferences] = useState<Difference[]>([]);
  const [similarityStats, setSimilarityStats] = useState<SimilarityStats | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [pdf1Name, setPdf1Name] = useState('');
  const [pdf2Name, setPdf2Name] = useState('');
  const [selectedDiffIndex, setSelectedDiffIndex] = useState<number | null>(null);
  const [tourState, setTourState] = useState<TourState>({ run: false, steps: tourSteps });
  const [similarityThreshold, setSimilarityThreshold] = useState(0.8);
  const { toast } = useToast();

  const startTour = () => setTourState({ ...tourState, run: true });

  const handleJoyrideCallback = (data: any) => {
    const { status, type } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setTourState({ ...tourState, run: false });
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setTourState({ ...tourState });
    }
  };

  const onDrop1 = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setPdf1Name(file.name);
    const reader = new FileReader();
    reader.onload = () => setPdf1Text(reader.result as string);
    reader.readAsText(file);
  };

  const onDrop2 = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setPdf2Name(file.name);
    const reader = new FileReader();
    reader.onload = () => setPdf2Text(reader.result as string);
    reader.readAsText(file);
  };

  const comparePDFs = () => {
    setIsComparing(true);
    setTimeout(() => {
      const diff = diffLines(pdf1Text, pdf2Text);
      setDifferences(diff);

      const addedLines = diff.filter(part => part.added).reduce((count, part) => count + (part.count || 0), 0);
      const removedLines = diff.filter(part => part.removed).reduce((count, part) => count + (part.count || 0), 0);
      const similarity = calculateSimilarity(pdf1Text, pdf2Text, similarityThreshold);

      setSimilarityStats({
        addedLines,
        removedLines,
        similarityPercentage: similarity,
      });

      setIsComparing(false);
      toast({
        title: "比較完了!",
        description: "PDFの比較が完了しました。",
      });
    }, 50);
  };

  const synchronizedScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const scrollContainer = event.currentTarget;
    const pair = scrollContainer.className.includes('left')
      ? document.querySelector('.right-content')
      : document.querySelector('.left-content');

    if (pair instanceof HTMLElement) {
      pair.scrollTop = scrollContainer.scrollTop;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Joyride
        steps={tourState.steps}
        run={tourState.run}
        callback={handleJoyrideCallback}
        continuous
        showSkipButton
        styles={{
          options: {
            arrowColor: '#fff',
            backgroundColor: '#fff',
            primaryColor: '#007bff',
            textColor: '#333',
            width: 400,
            zIndex: 1000,
          },
        }}
      />
      <Button onClick={startTour}>ツアーを開始</Button>

      <div className="grid gap-6">
        <div className="grid md:grid-cols-2 gap-4">
          <PdfDropzone
            onDrop={onDrop1}
            fileName={pdf1Name}
            areaClassName="upload-area-1"
            placeholder="ここに元のPDFファイルをドロップまたはクリックして選択"
          />
          <PdfDropzone
            onDrop={onDrop2}
            fileName={pdf2Name}
            areaClassName="upload-area-2"
            placeholder="ここに比較対象のPDFファイルをドロップまたはクリックして選択"
          />
        </div>

        <Button onClick={comparePDFs} disabled={isComparing} className="compare-button">
          {isComparing ? "比較中..." : "比較"}
        </Button>

        <div className="mb-4">
          <label htmlFor="similarityThreshold" className="block text-sm font-medium text-gray-700">
            類似性閾値 ({similarityThreshold * 100}%)
          </label>
          <Slider
            id="similarityThreshold"
            defaultValue={[similarityThreshold * 100]}
            max={100}
            step={1}
            onValueChange={(value) => setSimilarityThreshold(value[0] / 100)}
          />
        </div>

        {differences.length > 0 && (
          <div className="grid gap-6">
            <ComparisonView
              pdf1Text={pdf1Text}
              pdf2Text={pdf2Text}
              differences={differences}
              onScroll={synchronizedScroll}
            />
            <DifferencesList
              differences={differences}
              onDiffClick={setSelectedDiffIndex}
            />
            {similarityStats && (
              <Card>
                <CardHeader>
                  <CardTitle>類似度統計</CardTitle>
                  <CardDescription>PDF間の類似度に関する統計情報です。</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p>追加された行数: {similarityStats.addedLines}</p>
                    <p>削除された行数: {similarityStats.removedLines}</p>
                    <p>類似度: {similarityStats.similarityPercentage.toFixed(2)}%</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
