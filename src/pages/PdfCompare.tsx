
import React, { useState } from 'react';
import { diffWords } from 'diff';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.entry';
import Joyride, { EVENTS, STATUS } from 'react-joyride';
import { useToast } from "@/hooks/use-toast";
import { PdfDropzone } from '@/components/pdf-compare/PdfDropzone';
import { ComparisonView } from '@/components/pdf-compare/ComparisonView';
import { DifferencesList } from '@/components/pdf-compare/DifferencesList';
import { tourSteps } from '@/config/tour-steps';
import type { Difference, SimilarityStats, TourState } from '@/types/pdf-compare';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";

// PDF.jsの設定
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

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
  const { toast } = useToast();

  const extractTextFromPdf = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event: any) => {
        try {
          const typedArray = new Uint8Array(event.target.result);
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
          let fullText = '';

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n';
          }

          resolve(fullText);
        } catch (error) {
          console.error("PDF parsing error:", error);
          reject(error);
        }
      };

      reader.onerror = (error) => {
        console.error("File reading error:", error);
        reject(error);
      };

      reader.readAsArrayBuffer(file);
    });
  };

  const onDrop1 = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setPdf1Name(file.name);
    try {
      const text = await extractTextFromPdf(file);
      setPdf1Text(text);
    } catch (error) {
      toast({
        title: "PDFの読み込みに失敗しました。",
        description: "PDFファイルが壊れているか、形式が正しくありません。",
        variant: "destructive",
      });
    }
  };

  const onDrop2 = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setPdf2Name(file.name);
    try {
      const text = await extractTextFromPdf(file);
      setPdf2Text(text);
    } catch (error) {
      toast({
        title: "PDFの読み込みに失敗しました。",
        description: "PDFファイルが壊れているか、形式が正しくありません。",
        variant: "destructive",
      });
    }
  };

  const comparePDFs = () => {
    setIsComparing(true);
    setTimeout(() => {
      const diff = diffWords(pdf1Text, pdf2Text);
      setDifferences(diff);

      const addedLines = diff.filter(part => part.added).reduce((count, part) => count + (part.count || 0), 0);
      const removedLines = diff.filter(part => part.removed).reduce((count, part) => count + (part.count || 0), 0);
      
      const unchangedWords = diff.filter(part => !part.added && !part.removed).length;
      const totalWords = pdf1Text.split(/\s+/).length + pdf2Text.split(/\s+/).length;
      const similarity = totalWords > 0 ? (unchangedWords * 2) / totalWords * 100 : 0;

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
      <div className="grid gap-6">
        <div className="grid md:grid-cols-2 gap-4">
          <PdfDropzone
            onDrop={onDrop1}
            fileName={pdf1Name}
            areaClassName="upload-area-1"
            placeholder="ここに元のPDFファイルをドロップまたはクリックして選択"
            accept={{ 'application/pdf': ['.pdf'] }}
          />
          <PdfDropzone
            onDrop={onDrop2}
            fileName={pdf2Name}
            areaClassName="upload-area-2"
            placeholder="ここに比較対象のPDFファイルをドロップまたはクリックして選択"
            accept={{ 'application/pdf': ['.pdf'] }}
          />
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="compare-button" disabled={isComparing || !pdf1Text || !pdf2Text}>
              {isComparing ? (
                <>
                  比較中...
                  <Progress className="w-[100px] ml-2" value={50} />
                </>
              ) : 'PDFを比較する'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>本当に比較しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                PDFの比較を開始します。比較には時間がかかる場合があります。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={comparePDFs}>比較する</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
