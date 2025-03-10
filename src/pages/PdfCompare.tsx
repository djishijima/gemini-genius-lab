
import React, { useState, useRef, useEffect, useCallback } from "react";
import { diffWords } from "diff";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Layers, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PDFInputSection } from "@/components/pdf-compare/PDFInputSection";
import { SimilarityCard } from "@/components/pdf-compare/SimilarityCard";
import { PdfOverlayView } from "@/components/pdf-compare/PdfOverlayView";
import { PdfHighlightView } from "@/components/pdf-compare/PdfHighlightView";
import { PdfVisualDiffView } from "@/components/pdf-compare/PdfVisualDiffView";
import { SideBySidePdfView } from "@/components/pdf-compare/SideBySidePdfView";
import { ChatView } from "@/components/pdf-compare/ChatView";
import { TextView } from "@/components/pdf-compare/TextView";
import { useToast } from "@/components/ui/use-toast";
import { 
  initPdfJs, 
  checkPdfJsSetup, 
  extractFileContent,
  getPdfUrl 
} from "@/utils/pdfInitializer";
import { Difference, DiffResult, DisplayMode, ChatMessage } from "@/types/pdf-compare";

// 初期化を実行
const pdfJsInitialized = initPdfJs();

const PdfCompare: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pdf1, setPdf1] = useState<File | null>(null);
  const [pdf2, setPdf2] = useState<File | null>(null);
  const [text1, setText1] = useState<string>("");
  const [text2, setText2] = useState<string>("");
  const [pdf1Text, setPdf1Text] = useState<string>("");
  const [pdf2Text, setPdf2Text] = useState<string>("");
  const [differences, setDifferences] = useState<Difference[]>([]);
  const [similarityScore, setSimilarityScore] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [numPages1, setNumPages1] = useState<number>(0);
  const [numPages2, setNumPages2] = useState<number>(0);
  // 表示モードを設定（PDF比較機能を強化）
  const [displayMode, setDisplayMode] = useState<'chat' | 'text' | 'side-by-side' | 'highlight' | 'visual-diff' | 'overlay'>('chat');
  
  // PDF表示モードのラベルとアイコンをわかりやすく定義
  const displayModes: DisplayMode[] = [
    { id: 'chat', label: 'AIチャット分析', icon: FileText },
    { id: 'text', label: 'テキスト比較', icon: FileText },
    { id: 'highlight', label: 'PDF差分ハイライト', icon: FileText, tooltip: '元のPDFに差分をハイライト表示' },
    { id: 'overlay', label: 'オーバーレイ表示', icon: Layers, tooltip: '2つのPDFを重ねて表示' },
    { id: 'side-by-side', label: 'ページ比較', icon: FileText },
    { id: 'visual-diff', label: '視覚的差分', icon: FileText },
  ];
  // チャットメッセージを管理する状態
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);
  const [selectedDiffIndex, setSelectedDiffIndex] = useState<number | null>(null);
  const [showSimilarity, setShowSimilarity] = useState(true);
  const [createdUrls, setCreatedUrls] = useState<string[]>([]);

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

  // AI分析結果を生成する関数
  const generateAiAnalysis = useCallback((diffs: Difference[], similarityScore: number) => {
    // 差分の重要度を判断
    const criticalDiffs = diffs.filter(diff => {
      // 追加されたものや削除されたものを重要と判断
      return (diff.added || diff.removed) && diff.value.length > 10;
    });
    
    // 重要な差分トップ5を抓える
    const topDiffs = criticalDiffs.slice(0, 5);
    
    // AI分析コメントの生成
    let analysis = `ドキュメントの類似度は${Math.round(similarityScore * 100)}%です。\n`;
    
    if (criticalDiffs.length === 0) {
      analysis += `重要な差分は見つかりませんでした。変更は小規模もしくは書式のみの可能性があります。`;
    } else {
      analysis += `主要な差分ポイント：\n`;
      
      topDiffs.forEach((diff, index) => {
        analysis += `${index + 1}. `;
        if (diff.added) {
          analysis += `[追加] ${diff.value.substring(0, 50)}${diff.value.length > 50 ? '...' : ''}\n`;
        } else if (diff.removed) {
          analysis += `[削除] ${diff.value.substring(0, 50)}${diff.value.length > 50 ? '...' : ''}\n`;
        }
      });
      
      analysis += `\n合計 ${criticalDiffs.length} 箇所の重要な差分が見つかりました。`;
    }
    
    setAiAnalysis(analysis);
    return analysis;
  }, []);

  const comparePdfs = useCallback(async () => {
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

      setPdf1Text(textContent1);
      setPdf2Text(textContent2);

      const diffResult = diffWords(textContent1, textContent2);

      const differencesWithLines = processDifferences(diffResult, textContent1, textContent2);
      setDifferences(differencesWithLines);

      const similarityScore = calculateSimilarity(diffResult, textContent1, textContent2);
      setSimilarityScore(similarityScore);
      
      // AI分析を生成
      const analysis = generateAiAnalysis(differencesWithLines, similarityScore);
      
      // 初期チャットメッセージを設定
      setChatMessages([
        {
          role: 'assistant',
          content: `2つのPDFを比較しました。類似度は${Math.round(similarityScore * 100)}%です。差分は${differencesWithLines.filter(d => d.added || d.removed).length}箇所あります。詳細について質問してください。`
        }
      ]);
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
  }, [pdf1, pdf2, text1, text2, generateAiAnalysis]);

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
    return Number((totalLength === 0 ? 0 : (unchangedLength / totalLength) * 100).toFixed(2));
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
  
  // BlobURLを作成し、説明配列に追加する関数
  const createAndTrackBlobUrl = (file: File | null) => {
    if (!file) return null;
    try {
      const url = URL.createObjectURL(file);
      setCreatedUrls(prev => [...prev, url]);
      return url;
    } catch (error) {
      console.error('Failed to create tracked Blob URL:', error);
      return null;
    }
  };
  
  // ページロード時にPDF.jsの設定を確認
  useEffect(() => {
    checkPdfJsSetup();
    console.log("Component loaded, checking dependencies...");
  }, []);

  // コンポーネントアンマウント時に作成したBlobURLを破棄
  useEffect(() => {
    return () => {
      createdUrls.forEach(url => {
        try {
          URL.revokeObjectURL(url);
          console.log('Revoked Blob URL:', url);
        } catch (error) {
          console.error('Failed to revoke Blob URL:', error);
        }
      });
    };
  }, [createdUrls]);

  useEffect(() => {
    if (pdf1 && pdf2) {
      comparePdfs();
    }
  }, [pdf1, pdf2, comparePdfs]);

  const PDFInputSectionComponent = PDFInputSection;

  return (
    <div className="container mx-auto p-6">
      <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        戻る
      </Button>
      <div>
        <div className="grid md:grid-cols-2 gap-4">
          <PDFInputSectionComponent
            title="元のテキスト/PDF"
            description="テキストを入力またはPDFを選択"
            text={text1}
            onTextChange={setText1}
            pdf={pdf1}
            onPdfChange={handlePdf1Change}
            inputRef={fileInput1Ref}
          />
          <PDFInputSectionComponent
            title="新しいテキスト/PDF"
            description="テキストを入力またはPDFを選択"
            text={text2}
            onTextChange={setText2}
            pdf={pdf2}
            onPdfChange={handlePdf2Change}
            inputRef={fileInput2Ref}
          />
        </div>
        <Button
          className="compare-button w-full bg-gradient-to-r from-[#0EA5E9] to-[#8B5CF6] hover:from-[#0284C7] hover:to-[#7C3AED] text-white font-bold text-lg py-6 shadow-lg transform transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] active:scale-[0.98]"
          onClick={comparePdfs}
          disabled={loading || (!text1 && !pdf1) || (!text2 && !pdf2)}
        >
          {loading ? (
            <>
              比較中...
              <Progress value={progress} className="mt-2" />
            </>
          ) : (
            "比較する"
          )}
        </Button>
        {differences.length > 0 && (
          <div className="grid gap-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setShowSimilarity(!showSimilarity)}
                  className="text-slate-200"
                >
                  類似度表示: {showSimilarity ? "非表示" : "表示"}
                </Button>
                <div className="flex items-center space-x-2 border rounded-md p-1">
                  {displayModes.map(mode => {
                    return (
                      <Button
                        key={mode.id}
                        variant={displayMode === mode.id ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setDisplayMode(mode.id)}
                        className="flex items-center"
                        title={mode.tooltip}
                        style={(mode.id === 'highlight' || mode.id === 'overlay') ? {
                          position: 'relative',
                          boxShadow: displayMode === mode.id ? 'none' : '0 0 0 1px #e9ecef',
                          background: displayMode === mode.id ? undefined : 'rgba(237, 242, 247, 0.2)',
                        } : undefined}
                      >
                        <mode.icon className="mr-1 h-4 w-4" />
                        {mode.label}
                        {(mode.id === 'highlight' || mode.id === 'overlay') && 
                          <span
                            className='absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center'
                            style={{ fontSize: '0.6rem' }}
                          />
                        }
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
            {showSimilarity && (
              <SimilarityCard
                similarityScore={similarityScore}
                addedCount={differences.filter((d) => d.added).length}
                removedCount={differences.filter((d) => d.removed).length}
              />
            )}

            {displayMode === 'text' && (
              <TextView
                pdf1={pdf1}
                pdf2={pdf2}
                differences={differences}
                selectedDiffIndex={selectedDiffIndex}
                setSelectedDiffIndex={setSelectedDiffIndex}
                numPages1={numPages1}
                numPages2={numPages2}
              />
            )}
            
            {displayMode === 'highlight' && (
              <PdfHighlightView
                pdf1={pdf1}
                pdf2={pdf2}
                differences={differences}
                numPages1={numPages1}
                numPages2={numPages2}
                selectedDiffIndex={selectedDiffIndex}
                onDiffClick={setSelectedDiffIndex}
                onError={(error) => {
                  console.error('PDF Highlight View error:', error);
                  toast({
                    title: "PDF読み込みエラー",
                    description: `PDFの表示に問題が発生しました: ${error?.message || 'unknown error'}`,
                    variant: "destructive",
                  });
                }}
              />
            )}
            
            {displayMode === 'overlay' && (
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
            )}
            
            {displayMode === 'visual-diff' && (
              <PdfVisualDiffView
                pdf1={pdf1}
                pdf2={pdf2}
                numPages1={numPages1}
                numPages2={numPages2}
                differences={differences}
              />
            )}

            {displayMode === 'side-by-side' && (
              <SideBySidePdfView
                pdf1={pdf1}
                pdf2={pdf2}
                numPages1={numPages1}
                numPages2={numPages2}
              />
            )}
            
            {displayMode === 'chat' && (
              <ChatView
                differences={differences}
                similarityScore={similarityScore}
                pdf1Text={pdf1Text}
                pdf2Text={pdf2Text}
                initialMessages={chatMessages}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfCompare;
