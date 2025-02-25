import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ArrowLeft, RefreshCcw, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import * as pdfjsLib from 'pdfjs-dist';

// PDFワーカーの設定を変更
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

export default function PdfCompare() {
  const [pdf1Text, setPdf1Text] = useState("");
  const [pdf2Text, setPdf2Text] = useState("");
  const [differences, setDifferences] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, isPdf1: boolean) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
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

  const comparePdfs = useCallback(() => {
    if (!pdf1Text || !pdf2Text) {
      toast({
        title: "エラー",
        description: "2つのPDFファイルをアップロードしてください。",
        variant: "destructive"
      });
      return;
    }

    const lines1 = pdf1Text.split('\n');
    const lines2 = pdf2Text.split('\n');
    const diffs: string[] = [];

    // Simple line-by-line comparison
    const maxLines = Math.max(lines1.length, lines2.length);
    for (let i = 0; i < maxLines; i++) {
      if (lines1[i] !== lines2[i]) {
        diffs.push(`行 ${i + 1}:`);
        if (lines1[i]) diffs.push(`- ${lines1[i]}`);
        if (lines2[i]) diffs.push(`+ ${lines2[i]}`);
        diffs.push('---');
      }
    }

    setDifferences(diffs);
  }, [pdf1Text, pdf2Text, toast]);

  const handleReset = () => {
    setPdf1Text("");
    setPdf2Text("");
    setDifferences([]);
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
        <Card>
          <CardHeader>
            <CardTitle>PDF比較ツール</CardTitle>
            <CardDescription>
              2つのPDFファイルをアップロードして内容を比較します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">PDF 1</label>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileUpload(e, true)}
                  disabled={loading}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">PDF 2</label>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileUpload(e, false)}
                  disabled={loading}
                  className="w-full"
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
              >
                <Upload className="mr-2 h-4 w-4" />
                比較開始
              </Button>
            </div>
          </CardContent>
        </Card>

        {differences.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>比較結果</CardTitle>
              <CardDescription>
                2つのPDFファイル間の違いを表示しています
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[600px] text-sm">
                {differences.map((diff, index) => (
                  <div 
                    key={index}
                    className={
                      diff.startsWith('+') ? 'text-green-500' :
                      diff.startsWith('-') ? 'text-red-500' :
                      diff.startsWith('---') ? 'text-muted-foreground' :
                      'font-semibold'
                    }
                  >
                    {diff}
                  </div>
                ))}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
