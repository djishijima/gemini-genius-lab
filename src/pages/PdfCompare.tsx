import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ArrowLeft, RefreshCcw, Upload, FileDiff, Loader2, Percent } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import * as pdfjsLib from 'pdfjs-dist';
import * as DiffLib from 'diff';
import Joyride, { Step } from 'react-joyride';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

interface DiffStats {
  additions: number;
  deletions: number;
  unchanged: number;
  similarity: number;
}

export default function PdfCompare() {
  const [pdf1Text, setPdf1Text] = useState("");
  const [pdf2Text, setPdf2Text] = useState("");
  const [differences, setDifferences] = useState<DiffLib.Change[]>([]);
  const [diffStats, setDiffStats] = useState<DiffStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [runTutorial, setRunTutorial] = useState(true);
  const [selectedDiffIndex, setSelectedDiffIndex] = useState<number | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);

  const steps: Step[] = [
    {
      target: '.upload-section-1',
      content: 'まず、1つ目のPDFファイルをここにアップロードしてください。',
      placement: 'bottom',
    },
    {
      target: '.upload-section-2',
      content: '次に、2つ目のPDFファイルをここにアップロードしてください。',
      placement: 'bottom',
    },
    {
      target: '.compare-button',
      content: '両方のファイルをアップロードしたら、このボタンをクリックして内容を比較します。',
      placement: 'top',
    }
  ];

  const extractTextFromPdf = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const pdfData = new Uint8Array(e.target?.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
          let text = "";
          
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const content = await page.getTextContent();
            const strings = content.items.map((item: any) => item.str);
            text += strings.join(" ") + "\n";
          }
          
          resolve(text);
        } catch (error) {
          console.error("Error reading PDF:", error);
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const calculateSimilarity = (text1: string, text2: string): number => {
    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;
    const longerLength = longer.length;
    
    if (longerLength === 0) {
      return 100;
    }
    
    const editDistance = DiffLib.diffChars(longer, shorter).reduce((acc, change) => {
      if (change.added || change.removed) {
        return acc + change.value.length;
      }
      return acc;
    }, 0);
    
    return (1 - editDistance / longerLength) * 100;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, isPdf1: boolean) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "エラー",
        description: "PDFファイ��を選択してください。",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const text = await extractTextFromPdf(file);
      if (isPdf1) {
        setPdf1Text(text);
      } else {
        setPdf2Text(text);
      }

      toast({
        title: "成功",
        description: "PDFの読み込みが完了しました。",
      });
    } catch (error) {
      console.error("Error processing PDF:", error);
      toast({
        title: "エラー",
        description: "PDFの処理中にエラーが発生しました。",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>, isPdf1: boolean) => {
    const text = event.target.value;
    if (isPdf1) {
      setPdf1Text(text);
    } else {
      setPdf2Text(text);
    }
  };

  const comparePdfs = useCallback(() => {
    if (!pdf1Text || !pdf2Text) {
      toast({
        title: "エラー",
        description: "2つのテキストを入力またはPDFをアップロードしてください。",
        variant: "destructive"
      });
      return;
    }

    const diffs = DiffLib.diffWords(pdf1Text, pdf2Text);
    setDifferences(diffs);

    const stats = diffs.reduce(
      (acc, diff) => {
        if (diff.added) {
          acc.additions += diff.value.length;
        } else if (diff.removed) {
          acc.deletions += diff.value.length;
        } else {
          acc.unchanged += diff.value.length;
        }
        return acc;
      },
      { additions: 0, deletions: 0, unchanged: 0, similarity: 0 }
    );

    stats.similarity = calculateSimilarity(pdf1Text, pdf2Text);
    setDiffStats(stats);
  }, [pdf1Text, pdf2Text, toast]);

  const handleReset = () => {
    setPdf1Text("");
    setPdf2Text("");
    setDifferences([]);
    setDiffStats(null);
    if (fileInput1Ref.current) fileInput1Ref.current.value = "";
    if (fileInput2Ref.current) fileInput2Ref.current.value = "";
  };

  const splitDifferences = useCallback(() => {
    const removed: DiffLib.Change[] = [];
    const added: DiffLib.Change[] = [];
    
    differences.forEach((diff) => {
      if (diff.removed) {
        removed.push(diff);
      } else if (diff.added) {
        added.push(diff);
      }
    });

    return { removed, added };
  }, [differences]);

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
  };

  return (
    <div className="container mx-auto p-6">
      <Joyride
        steps={steps}
        run={runTutorial}
        continuous
        showProgress
        showSkipButton
        styles={{
          options: {
            primaryColor: '#3B82F6',
          },
        }}
        callback={(data) => {
          if (data.status === 'finished' || data.status === 'skipped') {
            setRunTutorial(false);
          }
        }}
      />

      <Button 
        variant="ghost" 
        onClick={() => navigate("/")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        戻る
      </Button>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>PDF比較ツール</CardTitle>
            <CardDescription>
              2つのPDFファイルをアップロードまたはテキストを入力して内容を比較します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="upload-section-1 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">PDF 1</label>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileUpload(e, true)}
                    disabled={loading}
                    className="w-full"
                    ref={fileInput1Ref}
                  />
                </div>
                <Textarea
                  value={pdf1Text}
                  onChange={(e) => handleTextChange(e, true)}
                  placeholder="テキストを直接入力するか、PDFをアップロードしてください..."
                  className="min-h-[200px]"
                />
              </div>
              <div className="upload-section-2 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">PDF 2</label>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileUpload(e, false)}
                    disabled={loading}
                    className="w-full"
                    ref={fileInput2Ref}
                  />
                </div>
                <Textarea
                  value={pdf2Text}
                  onChange={(e) => handleTextChange(e, false)}
                  placeholder="テキストを直接入力するか、PDFをアップロードしてください..."
                  className="min-h-[200px]"
                />
              </div>
            </div>
            <div className="flex justify-between">
              <Button
                variant="secondary"
                onClick={handleReset}
                disabled={loading}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                リセット
              </Button>
              <Button
                onClick={comparePdfs}
                disabled={loading || !pdf1Text || !pdf2Text}
                className="compare-button"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileDiff className="mr-2 h-4 w-4" />
                )}
                比較開始
              </Button>
            </div>
          </CardContent>
        </Card>

        {differences.length > 0 && (
          <div className="grid gap-6">
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
                        const isDiffStart = differences.some((diff, diffIndex) => 
                          diff.removed && pdf1Text.indexOf(diff.value, line.indexOf(diff.value)) !== -1
                        );
                        return (
                          <div 
                            key={`original-${index}`}
                            className={`mb-2 ${isDiffStart ? 'bg-red-100 p-2 rounded' : ''}`}
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
                        const isDiffStart = differences.some((diff, diffIndex) => 
                          diff.added && pdf2Text.indexOf(diff.value, line.indexOf(diff.value)) !== -1
                        );
                        return (
                          <div 
                            key={`new-${index}`}
                            className={`mb-2 ${isDiffStart ? 'bg-green-100 p-2 rounded' : ''}`}
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
                  {differences.map((diff, index) => (
                    <div 
                      key={index}
                      onClick={() => jumpToDiff(index)}
                      className={`
                        p-3 rounded-lg cursor-pointer transition-colors
                        ${diff.added ? 'bg-green-50 hover:bg-green-100' : 
                          diff.removed ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-50 hover:bg-gray-100'}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        {diff.added && <span className="text-green-600 font-semibold">追加:</span>}
                        {diff.removed && <span className="text-red-600 font-semibold">削除:</span>}
                        <span className="text-sm truncate">{diff.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {diffStats && (
              <Card>
                <CardHeader>
                  <CardTitle>類似度分析</CardTitle>
                  <CardDescription>
                    2つのPDFファイル間の類似度を表示しています
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Percent className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-blue-600">類似度</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        {diffStats.similarity.toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-green-600 font-medium">追加</p>
                      <p className="text-2xl font-bold text-green-600">{diffStats.additions}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <p className="text-sm text-red-600 font-medium">削除</p>
                      <p className="text-2xl font-bold text-red-600">{diffStats.deletions}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 font-medium">不変</p>
                      <p className="text-2xl font-bold text-gray-600">{diffStats.unchanged}</p>
                    </div>
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
