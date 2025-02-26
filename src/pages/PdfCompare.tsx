import React, { useState } from 'react';
import { diffWords } from 'diff';
import Joyride, { STATUS } from 'react-joyride';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import * as pdfjsLib from 'pdfjs-dist';
import { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import 'pdfjs-dist/build/pdf.worker.entry';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

interface Difference {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export default function PdfCompare() {
  const navigate = useNavigate();
  const [pdf1, setPdf1] = useState<File | null>(null);
  const [pdf2, setPdf2] = useState<File | null>(null);
  const [pdf1Text, setPdf1Text] = useState<string>('');
  const [pdf2Text, setPdf2Text] = useState<string>('');
  const [differences, setDifferences] = useState<Difference[]>([]);
  const [similarityScore, setSimilarityScore] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const [numPages1, setNumPages1] = useState<number | null>(null);
  const [numPages2, setNumPages2] = useState<number | null>(null);

  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState([
    {
      target: '.upload-section-1',
      content: 'ここに最初のPDFファイルをアップロードします。',
    },
    {
      target: '.upload-section-2',
      content: 'ここに2番目のPDFファイルをアップロードします。',
    },
    {
      target: '.compare-button',
      content: 'ファイルをアップロードしたら、このボタンをクリックして比較を開始します。',
    },
    {
      target: '.comparison-result',
      content: '比較結果がここに表示されます。変更箇所は色分けされ、一覧で確認できます。',
    },
  ]);

  const handleJoyrideCallback = (data: any) => {
    const { status, type } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
    }

    console.log(data)
  };

  const handlePdf1Change = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setPdf1(event.target.files[0]);
    }
  };

  const handlePdf2Change = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setPdf2(event.target.files[0]);
    }
  };

  const extractFileContent = async (file: File): Promise<string> => {
    if (file.type === 'text/plain') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            resolve(event.target.result as string);
          } else {
            reject(new Error('テキストファイルの読み込みに失敗しました'));
          }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
      });
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async function () {
        try {
          const typedArray = new Uint8Array(reader.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item) => {
                if ('str' in item) {
                  return (item as TextItem).str;
                }
                return '';
              })
              .join(' ');
            fullText += pageText + '\n';
          }
          resolve(fullText);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  const comparePdfs = async () => {
    if (!pdf1 || !pdf2) {
      alert('ファイルを両方アップロードしてください。');
      return;
    }

    setLoading(true);
    try {
      const text1 = await extractFileContent(pdf1);
      const text2 = await extractFileContent(pdf2);

      setPdf1Text(text1);
      setPdf2Text(text2);

      const diffResult = diffWords(text1, text2);
      setDifferences(diffResult);

      const unchangedLength = diffResult.filter(part => !part.added && !part.removed).reduce((sum, part) => sum + part.value.length, 0);
      const totalLength = Math.max(text1.length, text2.length);
      const score = totalLength === 0 ? 0 : (unchangedLength / totalLength) * 100;
      setSimilarityScore(parseFloat(score.toFixed(2)));

    } catch (error) {
      console.error("ファイルの比較中にエラーが発生しました:", error);
      alert('ファイルの比較中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  const [selectedDiffIndex, setSelectedDiffIndex] = useState<number | null>(null);

  const synchronizedScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const scrollContainer = event.currentTarget;
    const pair = scrollContainer.className.includes('left')
      ? document.querySelector('.right-content')
      : document.querySelector('.left-content');

    if (pair instanceof HTMLElement) {
      pair.scrollTop = scrollContainer.scrollTop;
    }
  };

  const jumpToDiff = (index: number) => {
    setSelectedDiffIndex(index);

    const diffElementId = `diff-${index}`;
    const diffElement = document.getElementById(diffElementId);

    if (diffElement) {
      diffElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });

      diffElement.classList.add('bg-yellow-200');
      setTimeout(() => {
        diffElement.classList.remove('bg-yellow-200');
      }, 1000);
    }
  };

  const calculateDiffLineNumber = (text: string, diffValue: string): number => {
    const lines = text.split('\n');
    let lineNumber = 0;
    let accumulatedLength = 0;

    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1;
      if (accumulatedLength + lineLength > text.indexOf(diffValue)) {
        lineNumber = i + 1;
        break;
      }
      accumulatedLength += lineLength;
    }

    return lineNumber;
  };

  return (
    <div className="container mx-auto p-6">
      <Button 
        variant="ghost" 
        onClick={() => navigate("/")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        戻る
      </Button>

      <Joyride
        steps={steps}
        run={run}
        continuous={true}
        callback={handleJoyrideCallback}
        showSkipButton={true}
        styles={{
          options: {
            arrowColor: '#fff',
            primaryColor: '#4ade80',
            textColor: '#374151',
            width: 500,
            zIndex: 1000,
          }
        }}
      />

      <div className="grid gap-6">

        <div className="grid md:grid-cols-2 gap-4">
          <div className="upload-section-1">
            <Card>
              <CardHeader>
                <CardTitle>元のファイルをアップロード</CardTitle>
                <CardDescription>比較の基準となるPDFまたはテキストファイルを選択してください。</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Label htmlFor="pdf1">ファイルを選択:</Label>
                  <Input 
                    type="file" 
                    id="pdf1" 
                    accept=".pdf,.txt,application/pdf,text/plain" 
                    onChange={handlePdf1Change} 
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="upload-section-2">
            <Card>
              <CardHeader>
                <CardTitle>新しいファイルをアップロード</CardTitle>
                <CardDescription>変更を比較するPDFまたはテキストファイルを選択してください。</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Label htmlFor="pdf2">ファイルを選択:</Label>
                  <Input 
                    type="file" 
                    id="pdf2" 
                    accept=".pdf,.txt,application/pdf,text/plain" 
                    onChange={handlePdf2Change} 
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Button className="compare-button" onClick={comparePdfs} disabled={loading}>
          {loading ? (
            <>
              比較中...
              <Progress value={50} className="mt-2" />
            </>
          ) : 'PDFを比較する'}
        </Button>

        {differences.length > 0 && (
          <div className="grid gap-6 comparison-result">
            <Card>
              <CardHeader>
                <CardTitle>PDF比較ビュー</CardTitle>
                <CardDescription>
                  左側が元のPDF、右側が新しいPDFの内容です。変更箇所は色分けされています。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">元のPDF</h3>
                    <div
                      className="left-content bg-gray-50 p-4 rounded-lg overflow-auto max-h-[600px]"
                      onScroll={synchronizedScroll}
                    >
                      {pdf1Text.split('\n').map((line, index) => {
                        const isDiffPresent = differences.some(diff =>
                          diff.removed && line.includes(diff.value)
                        );

                        return (
                          <div
                            key={`original-${index}`}
                            className={`mb-2 ${isDiffPresent ? 'bg-red-100 p-2 rounded' : ''}`}
                          >
                            {line}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">新しいPDF</h3>
                    <div
                      className="right-content bg-gray-50 p-4 rounded-lg overflow-auto max-h-[600px]"
                      onScroll={synchronizedScroll}
                    >
                      {pdf2Text.split('\n').map((line, index) => {
                        const isDiffPresent = differences.some(diff =>
                          diff.added && line.includes(diff.value)
                        );

                        return (
                          <div
                            key={`new-${index}`}
                            className={`mb-2 ${isDiffPresent ? 'bg-green-100 p-2 rounded' : ''}`}
                          >
                            {line}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>変更箇所一覧</CardTitle>
                <CardDescription>
                  クリックすると該当箇所にジャンプします
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {differences.map((diff, index) => {
                    const lineNumber = diff.added ? calculateDiffLineNumber(pdf2Text, diff.value) : calculateDiffLineNumber(pdf1Text, diff.value);

                    return (
                      <div
                        key={index}
                        id={`diff-${index}`}
                        onClick={() => jumpToDiff(index)}
                        className={`
                        p-3 rounded-lg cursor-pointer transition-colors
                        ${diff.added ? 'bg-green-50 hover:bg-green-100' :
                            diff.removed ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-50 hover:bg-gray-100'}
                      `}
                      >
                        <div className="flex items-start gap-2">
                          {diff.added && <span className="text-green-600 font-semibold">追加:</span>}
                          {diff.removed && <span className="text-red-600 font-semibold">削除:</span>}
                          <div>
                            <span className="text-sm truncate">{diff.value}</span>
                            <span className="text-xs text-gray-500 ml-2"> (Line: {lineNumber})</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>類似度</CardTitle>
                <CardDescription>PDFドキュメント間の類似性の割合。</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{similarityScore}%</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
