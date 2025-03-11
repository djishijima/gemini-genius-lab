
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PDFInputSection } from "@/components/pdf-compare/PDFInputSection";
import { SimilarityCard } from "@/components/pdf-compare/SimilarityCard";
import { PdfOverlayView } from "@/components/pdf-compare/PdfOverlayView";
import { useToast } from "@/components/ui/use-toast";
import { initPdfJs, checkPdfJsSetup, extractFileContent } from "@/utils/pdfInitializer";
import type { DisplayMode } from "@/types/pdf-compare";

// 初期化を実行
const pdfJsInitialized = initPdfJs();

const PdfCompare = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [displayMode] = useState<'overlay'>('overlay');
  const [showSimilarity, setShowSimilarity] = useState(true);
  
  // PDF表示モード - オーバーレイのみに簡略化
  const displayModes: DisplayMode[] = [
    { id: 'overlay', label: 'オーバーレイ比較', icon: Layers, tooltip: '2つのPDFを重ねて比較' },
  ];

  // PDF関連の状態
  const [pdf1, setPdf1] = useState<File | null>(null);
  const [pdf2, setPdf2] = useState<File | null>(null);
  const [text1, setText1] = useState<string>("");
  const [text2, setText2] = useState<string>("");
  const [differences, setDifferences] = useState<Difference[]>([]);
  const [similarityScore, setSimilarityScore] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [numPages1, setNumPages1] = useState<number>(0);
  const [numPages2, setNumPages2] = useState<number>(0);
  
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);
  
  // ページロード時にPDF.jsの設定を確認
  useEffect(() => {
    checkPdfJsSetup();
    console.log("Component loaded, checking dependencies...");
  }, []);

  const handlePdf1Change = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setPdf1(file);
    if (file) {
      setLoading(true);
      try {
        const content = await extractFileContent(file);
        setText1(content);
      } catch (error) {
        console.error("PDF読み込みエラー:", error);
        toast({
          title: "PDFの読み込みに失敗しました",
          description: `ファイルを確認してください: ${error instanceof Error ? error.message : '不明なエラー'}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePdf2Change = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setPdf2(file);
    if (file) {
      setLoading(true);
      try {
        const content = await extractFileContent(file);
        setText2(content);
      } catch (error) {
        console.error("PDF読み込みエラー:", error);
        toast({
          title: "PDFの読み込みに失敗しました",
          description: `ファイルを確認してください: ${error instanceof Error ? error.message : '不明なエラー'}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const processDifferences = (diffResult: DiffResult[], text1: string, text2: string): Difference[] => {
    let currentLine1 = 1;
    let currentLine2 = 1;
    return diffResult.map((diff) => {
      const lines1: number[] = [];
      const lines2: number[] = [];

      if (!diff.added) {
        for (const _ of diff.value.split("\n")) {
          lines1.push(currentLine1++);
        }
        currentLine1--;
      }

      if (!diff.removed) {
        for (const _ of diff.value.split("\n")) {
          lines2.push(currentLine2++);
        }
        currentLine2--;
      }

      return { ...diff, lines1, lines2 };
    });
  };

  const calculateSimilarity = (diffResult: DiffResult[], text1: string, text2: string) => {
    const unchangedLength = diffResult
      .filter((part) => !part.added && !part.removed)
      .reduce((sum, part) => sum + part.value.length, 0);
    const totalLength = Math.max(text1.length, text2.length);
    return Number((totalLength === 0 ? 0 : unchangedLength / totalLength).toFixed(2));
  };

  const comparePdfs = async () => {
    if ((!text1 && !pdf1) || (!text2 && !pdf2)) {
      toast({
        title: "入力エラー",
        description: "テキストを入力するかPDFをアップロードしてください。",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      const textContent1 = text1 || (pdf1 ? await extractFileContent(pdf1) : "");
      const textContent2 = text2 || (pdf2 ? await extractFileContent(pdf2) : "");
      
      // diff-jsをインポート
      const { diffWords } = await import('diff');
      const diffResult = diffWords(textContent1, textContent2);

      const differencesWithLines = processDifferences(diffResult, textContent1, textContent2);
      setDifferences(differencesWithLines);

      const similarityScore = calculateSimilarity(diffResult, textContent1, textContent2);
      setSimilarityScore(similarityScore);
    } catch (error) {
      console.error("比較中にエラーが発生しました:", error);
      toast({
        title: "比較エラー",
        description: "比較中にエラーが発生しました。ファイルを確認してください。",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  // PDF読み込み時にページ数を更新
  const onDocumentLoadSuccess = (pdf: any, isPdf1: boolean) => {
    if (isPdf1) {
      setNumPages1(pdf.numPages);
      console.log('PDF1読み込み成功:', pdf.numPages, 'ページ');
    } else {
      setNumPages2(pdf.numPages);
      console.log('PDF2読み込み成功:', pdf.numPages, 'ページ');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        戻る
      </Button>
      <div>
        <div className="grid md:grid-cols-2 gap-4">
          <PDFInputSection
            title="元のテキスト/PDF"
            description="テキストを入力またはPDFを選択"
            text={text1}
            onTextChange={setText1}
            pdf={pdf1}
            onPdfChange={handlePdf1Change}
            inputRef={fileInput1Ref}
          />
          <PDFInputSection
            title="新しいテキスト/PDF"
            description="テキストを入力またはPDFを選択"
            text={text2}
            onTextChange={setText2}
            pdf={pdf2}
            onPdfChange={handlePdf2Change}
            inputRef={fileInput2Ref}
          />
        </div>
        
        {/* 比較ボタン */}
        <Button
          className="compare-button w-full bg-gradient-to-r from-[#0EA5E9] to-[#8B5CF6] hover:from-[#0284C7] hover:to-[#7C3AED] text-white font-bold text-lg py-6 shadow-lg transform transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] active:scale-[0.98] mt-4 mb-4"
          onClick={comparePdfs}
          disabled={loading || !(text1 || pdf1) || !(text2 || pdf2)}
        >
          {loading ? (
            <>
              比較中...
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
            </>
          ) : (
            "比較する"
          )}
        </Button>
        
        {differences.length > 0 && (
          <div className="grid gap-6">
            {showSimilarity && (
              <SimilarityCard
                similarityScore={similarityScore}
                addedCount={differences.filter((d) => d.added).length}
                removedCount={differences.filter((d) => d.removed).length}
              />
            )}

            <PdfOverlayView
              pdf1={pdf1}
              pdf2={pdf2}
              numPages1={numPages1}
              numPages2={numPages2}
              initialOpacity={0.5}
              initialBlendMode="difference"
              onError={(error) => {
                console.error('PDF Overlay View error:', error);
                toast({
                  title: "PDF読み込みエラー",
                  description: `PDFの表示に問題が発生しました: ${error?.message || 'unknown error'}`,
                  variant: "destructive",
                });
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfCompare;
