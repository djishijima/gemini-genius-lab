
import { useState, useRef, useEffect, useCallback } from "react";
import { diffWords } from "diff";
import { useToast } from "@/components/ui/use-toast";
import { extractFileContent } from "@/utils/pdfInitializer";
import { Difference, DiffResult, ChatMessage } from "@/types/pdf-compare";

export function usePdfCompare() {
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
  const [selectedDiffIndex, setSelectedDiffIndex] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);
  const [createdUrls, setCreatedUrls] = useState<string[]>([]);

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
          role: 'assistant' as const,
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
  }, [pdf1, pdf2, text1, text2, generateAiAnalysis, toast]);

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

  return {
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
    createAndTrackBlobUrl,
    setSelectedDiffIndex,
    setChatMessages
  };
}
