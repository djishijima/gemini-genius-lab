
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { initPdfJs, checkPdfJsSetup } from "@/utils/pdfInitializer";
import { DisplayMode } from "@/types/pdf-compare";
import { usePdfCompare } from "@/hooks/usePdfCompare";
import { PdfCompareControls } from "@/components/pdf-compare/PdfCompareControls";

// 初期化を実行
const pdfJsInitialized = initPdfJs();

const PdfCompare: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  // 表示モードを設定（PDF比較機能を強化）
  const [displayMode, setDisplayMode] = useState<'chat' | 'text' | 'side-by-side' | 'highlight' | 'visual-diff' | 'overlay'>('chat');
  const [showSimilarity, setShowSimilarity] = useState(true);
  
  // PDF表示モードのラベルとアイコンをわかりやすく定義
  const displayModes: DisplayMode[] = [
    { id: 'chat', label: 'AIチャット分析', icon: FileText },
    { id: 'text', label: 'テキスト比較', icon: FileText },
    { id: 'highlight', label: 'PDF差分ハイライト', icon: FileText, tooltip: '元のPDFに差分をハイライト表示' },
    { id: 'overlay', label: 'オーバーレイ表示', icon: Layers, tooltip: '2つのPDFを重ねて表示' },
    { id: 'side-by-side', label: 'ページ比較', icon: FileText },
    { id: 'visual-diff', label: '視覚的差分', icon: FileText },
  ];

  // カスタムフックから状態と関数を取得
  const {
    pdf1,
    pdf2,
    text1,
    text2,
    pdf1Text,
    pdf2Text, 
    differences,
    similarityScore,
    loading,
    progress,
    numPages1,
    numPages2,
    selectedDiffIndex,
    chatMessages,
    fileInput1Ref,
    fileInput2Ref,
    setText1,
    setText2,
    handlePdf1Change,
    handlePdf2Change,
    comparePdfs,
    onDocumentLoadSuccess,
    setSelectedDiffIndex,
    setChatMessages
  } = usePdfCompare();
  
  // ページロード時にPDF.jsの設定を確認
  useEffect(() => {
    checkPdfJsSetup();
    console.log("Component loaded, checking dependencies...");
  }, []);

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
        
        {/* 比較ボタンとコントロール */}
        <PdfCompareControls 
          loading={loading}
          progress={progress}
          displayMode={displayMode}
          setDisplayMode={setDisplayMode}
          comparePdfs={comparePdfs}
          showSimilarity={showSimilarity}
          setShowSimilarity={setShowSimilarity}
          canCompare={(!text1 && !pdf1) || (!text2 && !pdf2) ? false : true}
          displayModes={displayModes}
        />
        
        {differences.length > 0 && (
          <div className="grid gap-6">
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
