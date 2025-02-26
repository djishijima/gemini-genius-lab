
import React, { useState } from 'react';
import { diffWords } from 'diff';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as pdfjsLib from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import 'pdfjs-dist/build/pdf.worker.entry';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

interface Difference {
  value: string;
  added?: boolean;
  removed?: boolean;
  lines1?: number[];
  lines2?: number[];
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
  const [progress, setProgress] = useState(0);

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
            const progressValue = Math.round((i / pdf.numPages) * 100);
            setProgress(progressValue);
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
    setProgress(0);

    try {
      const [text1, text2] = await Promise.all([
        extractFileContent(pdf1),
        extractFileContent(pdf2)
      ]);

      setPdf1Text(text1);
      setPdf2Text(text2);

      const diffResult = diffWords(text1, text2);

      let currentLine1 = 1;
      let currentLine2 = 1;
      const differencesWithLines = diffResult.map(diff => {
        const lines1 = [];
        const lines2 = [];

        if (!diff.added) {
          const lines = diff.value.split('\n');
          for (let i = 0; i < lines.length; i++) {
            lines1.push(currentLine1);
            currentLine1++;
          }
          currentLine1--;
        }

        if (!diff.removed) {
          const lines = diff.value.split('\n');
          for (let i = 0; i < lines.length; i++) {
            lines2.push(currentLine2);
            currentLine2++;
          }
          currentLine2--;
        }

        return {
          ...diff,
          lines1,
          lines2
        };
      });

      setDifferences(differencesWithLines);

      const unchangedLength = diffResult
        .filter(part => !part.added && !part.removed)
        .reduce((sum, part) => sum + part.value.length, 0);
      const totalLength = Math.max(text1.length, text2.length);
      const score = totalLength === 0 ? 0 : (unchangedLength / totalLength) * 100;
      setSimilarityScore(parseFloat(score.toFixed(2)));

    } catch (error) {
      console.error("ファイルの比較中にエラーが発生しました:", error);
      alert('ファイルの比較中にエラーが発生しました。');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const jumpToDiff = (index: number) => {
    const diff = differences[index];
    const line1 = diff.lines1?.[0] ?? 1;
    const line2 = diff.lines2?.[0] ?? 1;

    const element1 = document.getElementById(`original-line-${line1}`);
    const element2 = document.getElementById(`new-line-${line2}`);

    element1?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    element2?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

      <div className="grid gap-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="upload-section-1">
            <Card>
              <CardHeader>
                <CardTitle>元のファイルをアップロード</CardTitle>
                <CardDescription>PDFファイルを選択してください</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Label htmlFor="pdf1">ファイルを選択:</Label>
                  <Input 
                    type="file" 
                    id="pdf1" 
                    accept=".pdf,application/pdf"
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
                <CardDescription>PDFファイルを選択してください</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Label htmlFor="pdf2">ファイルを選択:</Label>
                  <Input 
                    type="file" 
                    id="pdf2" 
                    accept=".pdf,application/pdf"
                    onChange={handlePdf2Change}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Button 
          className="compare-button" 
          onClick={comparePdfs} 
          disabled={loading}
        >
          {loading ? (
            <>
              比較中...
              <Progress value={progress} className="mt-2" />
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
                    <ScrollArea className="h-[500px] w-full rounded-md border">
                      <div className="p-4">
                        {pdf1Text.split('\n').map((line, index) => {
                          const lineNumber = index + 1;
                          const isDiffPresent = differences.some(diff =>
                            diff.removed && diff.lines1?.includes(lineNumber)
                          );
                          return (
                            <div
                              key={`original-line-${lineNumber}`}
                              id={`original-line-${lineNumber}`}
                              className={`mb-2 ${isDiffPresent ? 'bg-red-100 p-2 rounded' : ''}`}
                            >
                              {line}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">新しいPDF</h3>
                    <ScrollArea className="h-[500px] w-full rounded-md border">
                      <div className="p-4">
                        {pdf2Text.split('\n').map((line, index) => {
                          const lineNumber = index + 1;
                          const isDiffPresent = differences.some(diff =>
                            diff.added && diff.lines2?.includes(lineNumber)
                          );
                          return (
                            <div
                              key={`new-line-${lineNumber}`}
                              id={`new-line-${lineNumber}`}
                              className={`mb-2 ${isDiffPresent ? 'bg-green-100 p-2 rounded' : ''}`}
                            >
                              {line}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
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
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {differences.map((diff, index) => {
                      const addedLine = diff.added && diff.lines2?.[0];
                      const removedLine = diff.removed && diff.lines1?.[0];
                      return (
                        <div
                          key={`diff-${index}`}
                          onClick={() => jumpToDiff(index)}
                          className={`
                            p-3 rounded-lg cursor-pointer transition-colors
                            ${diff.added ? 'bg-green-50 hover:bg-green-100' :
                              diff.removed ? 'bg-red-50 hover:bg-red-100' : 
                              'bg-gray-50 hover:bg-gray-100'}
                          `}
                        >
                          <div className="flex items-start gap-2">
                            {diff.added && 
                              <span className="text-green-600 font-semibold">追加:</span>
                            }
                            {diff.removed && 
                              <span className="text-red-600 font-semibold">削除:</span>
                            }
                            <div>
                              <span className="text-sm truncate">{diff.value}</span>
                              <span className="text-xs text-gray-500 ml-2">
                                {addedLine && `(Line: ${addedLine})`}
                                {removedLine && `(Line: ${removedLine})`}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
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
