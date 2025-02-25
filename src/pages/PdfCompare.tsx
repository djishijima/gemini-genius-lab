
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

// PDFワーカーの設定を変更
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
        description: "PDFファイルを選択してください。",
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

        {differences.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>比較結果</CardTitle>
              <CardDescription>
                2つのPDFファイル間の違いを表示しています
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg overflow-auto max-h-[600px] text-sm">
                {differences.map((diff, index) => (
                  <span
                    key={index}
                    className={
                      diff.added ? 'text-green-500 bg-green-50 px-1 mx-1 rounded' :
                      diff.removed ? 'text-red-500 bg-red-50 px-1 mx-1 rounded line-through' :
                      'text-foreground'
                    }
                  >
                    {diff.value}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
