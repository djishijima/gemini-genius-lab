import React, { useState, useRef, useEffect, useCallback } from "react";
import type { FC } from "react";
import { diffWords } from "diff";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Layers, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { PDFInputSection } from "@/components/pdf-compare/PDFInputSection";
import { SimilarityCard } from "@/components/pdf-compare/SimilarityCard";
import { DiffDisplay } from "@/components/pdf-compare/DiffDisplay";
import { DiffList } from "@/components/pdf-compare/DiffList";
import { PdfOverlayView } from "@/components/pdf-compare/PdfOverlayView";
import { PdfHighlightView } from "@/components/pdf-compare/PdfHighlightView";
// Import react-pdf components and worker
import { Document, Page } from "react-pdf";
import { pdfjs } from 'react-pdf';
import { IframePdfViewer } from "@/components/pdf-compare/IframePdfViewer";
import { IframeOverlayView } from "@/components/pdf-compare/IframeOverlayView";
import { PdfVisualDiffView } from "@/components/pdf-compare/PdfVisualDiffView";
import { SideBySidePdfView } from "@/components/pdf-compare/SideBySidePdfView";

// PDF.jsワーカーの設定
// グローバル変数を定義（TypeScriptのため）
declare global {
  interface Window {
    pdfjsOptions: {
      cMapUrl: string;
      cMapPacked: boolean;
    };
  }
}

// PDF.jsの設定を安全に初期化する
const initPdfJs = () => {
  try {
    // react-pdfのワーカー設定
    // CDNからワーカーをロードして互換性問題を回避
    const pdfjsCDN = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsCDN;
    
    // PDF表示オプションをグローバル変数として設定
    window.pdfjsOptions = {
      cMapUrl: 'https://unpkg.com/pdfjs-dist@3.4.120/cmaps/',
      cMapPacked: true,
    };
    
    // pdfjs-distライブラリに対してもグローバル設定を適用
    if (pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsCDN;
    }
    
    console.log('PDF.js設定完了:', {
      'react-pdfバージョン': pdfjs.version,
      'PDF.jsバージョン': pdfjsLib?.version,
      'ワーカーURL': pdfjs.GlobalWorkerOptions.workerSrc,
      'オプション': window.pdfjsOptions
    });
    
    return true;
  } catch (error) {
    console.error('PDF.js初期化エラー:', error);
    return false;
  }
};

// 初期化を実行
const pdfJsInitialized = initPdfJs();

interface DiffResult {
  value: string;
  added?: boolean;
  removed?: boolean;
}

interface Difference extends DiffResult {
  lines1?: number[];
  lines2?: number[];
}

// PDF.jsのインポートを確認するための関数を追加
const checkPdfJsSetup = () => {
  console.log("PDF.js setup check...");
  console.log("pdfjs.version:", pdfjs.version);
  console.log("pdfjs.GlobalWorkerOptions.workerSrc:", pdfjs.GlobalWorkerOptions.workerSrc);
  console.log("pdfjsLib version check:", typeof pdfjsLib.getDocument);
  // PDF.jsのCMapリソースを確認
  console.log("Checking if CMap files are accessible...");
  fetch('/cmaps/Adobe-Japan1-UCS2.bcmap')
    .then(response => {
      if (response.ok) {
        console.log("CMap resource is accessible!");
      } else {
        console.error("CMap resource is NOT accessible. Status:", response.status);
      }
    })
    .catch(error => {
      console.error("Error fetching CMap resource:", error);
    });

  // Workerファイルのアクセス確認
  fetch('/pdf.worker.min.js')
    .then(response => {
      if (response.ok) {
        console.log("Worker file is accessible!");
      } else {
        console.error("Worker file is NOT accessible. Status:", response.status);
      }
    })
    .catch(error => {
      console.error("Error fetching worker file:", error);
    });
};

const PdfCompare: React.FC = () => {
  const navigate = useNavigate();
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
  // 表示モードをシンプルにし、初期表示をチャットモードに設定
  const [displayMode, setDisplayMode] = useState<'chat' | 'text' | 'side-by-side' | 'highlight' | 'visual-diff' | 'overlay'>('chat');
  // チャットメッセージを管理する状態
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [userInput, setUserInput] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const [leftScrollTop, setLeftScrollTop] = useState(0);
  const [rightScrollTop, setRightScrollTop] = useState(0);
  const [selectedDiffIndex, setSelectedDiffIndex] = useState<number | null>(null);
  const [showSimilarity, setShowSimilarity] = useState(true);

  const extractFileContent = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const typedArray = new Uint8Array(reader.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item) => ("str" in item ? (item as TextItem).str : ""))
              .join(" ");
            fullText += `${pageText}\n`;
            setProgress(Math.round((i / pdf.numPages) * 100));
          }
          resolve(fullText);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }, []);

  const handlePdf1Change = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setPdf1(file);
    if (file) {
      const content = await extractFileContent(file);
      setText1(content);
    }
  };

  const handlePdf2Change = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setPdf2(file);
    if (file) {
      const content = await extractFileContent(file);
      setText2(content);
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
      alert("テキストを入力するかPDFをアップロードしてください。");
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
      alert("比較中にエラーが発生しました。");
    } finally {
      setLoading(false);
      setProgress(100);
    }
  }, [pdf1, pdf2, text1, text2, extractFileContent, generateAiAnalysis]);

  // ユーザーメッセージを送信し、AI応答を生成する関数
  const handleSendMessage = useCallback(() => {
    if (!userInput.trim() || !differences.length) return;
    
    // ユーザーメッセージを追加
    const newMessages = [
      ...chatMessages,
      { role: 'user', content: userInput }
    ];
    setChatMessages(newMessages);
    setUserInput('');
    
    // AI応答を生成（実際のAPIコールに置き換えることも可能）
    setTimeout(() => {
      const aiResponse = generateAiResponse(userInput, differences, similarityScore, pdf1Text, pdf2Text);
      setChatMessages(prevMessages => [...prevMessages, { role: 'assistant', content: aiResponse }]);
    }, 500);
  }, [userInput, chatMessages, differences, similarityScore, pdf1Text, pdf2Text]);
  
  // AI応答を生成する関数
  const generateAiResponse = (query: string, diffs: Difference[], score: number, text1: string, text2: string): string => {
    const queryLower = query.toLowerCase();
    
    // 主要な差分を抽出
    const addedDiffs = diffs.filter(d => d.added).map(d => d.value);
    const removedDiffs = diffs.filter(d => d.removed).map(d => d.value);
    
    // クエリタイプに応じた応答の生成
    if (queryLower.includes('類似') || queryLower.includes('似てる') || queryLower.includes('似ている')) {
      return `類似度は${Math.round(score * 100)}%です。\n` + 
             `${score > 0.9 ? 'とても似ています。' : score > 0.7 ? 'やや似ています。' : score > 0.5 ? '部分的に似ています。' : 'あまり似ていません。'}`;
    }
    
    if (queryLower.includes('追加') || queryLower.includes('加え')) {
      if (addedDiffs.length === 0) {
        return '新しいドキュメントに追加された重要なテキストは見つかりませんでした。';
      }
      
      let response = `新しいドキュメントには${addedDiffs.length}箇所の追加があります。主な追加内容：\n`;
      addedDiffs.slice(0, 5).forEach((diff, i) => {
        response += `${i+1}. ${diff.substring(0, 100)}${diff.length > 100 ? '...' : ''}\n`;
      });
      return response;
    }
    
    if (queryLower.includes('削除') || queryLower.includes('除去')) {
      if (removedDiffs.length === 0) {
        return '元のドキュメントから削除された重要なテキストは見つかりませんでした。';
      }
      
      let response = `元のドキュメントから${removedDiffs.length}箇所の削除があります。主な削除内容：\n`;
      removedDiffs.slice(0, 5).forEach((diff, i) => {
        response += `${i+1}. ${diff.substring(0, 100)}${diff.length > 100 ? '...' : ''}\n`;
      });
      return response;
    }
    
    if (queryLower.includes('要約') || queryLower.includes('サマリ')) {
      return `2つのドキュメントの比較サマリー：\n` +
             `- 類似度: ${Math.round(score * 100)}%\n` +
             `- 追加された箇所: ${addedDiffs.length}\n` +
             `- 削除された箇所: ${removedDiffs.length}\n` +
             `- 主な変更点: ${diffs.filter(d => d.added || d.removed).length > 0 ? 
               '文書の構成や内容に変更があります。' : '主に書式や小さな変更のみです。'}`;
    }
    
    // デフォルトの応答
    return `2つのPDFを比較した結果、類似度は${Math.round(score * 100)}%、${diffs.filter(d => d.added || d.removed).length}箇所の差分があります。\n` +
           `具体的な内容について質問する場合は、「追加された内容は？」「削除された内容は？」「要約してください」などと質問してください。`;
  };

  const processDifferences = (diffResult: DiffResult[], text1: string, text2: string) => {
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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, side: "left" | "right") => {
    const scrollTop = (e.target as HTMLDivElement).scrollTop;
    if (side === "left") {
      setLeftScrollTop(scrollTop);
      if (rightScrollRef.current) {
        const rightViewport = rightScrollRef.current.querySelector(
          "[data-radix-scroll-area-viewport]",
        );
        if (rightViewport) {
          rightViewport.scrollTop = scrollTop;
        }
      }
    } else {
      setRightScrollTop(scrollTop);
      if (leftScrollRef.current) {
        const leftViewport = leftScrollRef.current.querySelector(
          "[data-radix-scroll-area-viewport]",
        );
        if (leftViewport) {
          leftViewport.scrollTop = scrollTop;
        }
      }
    }
  };

  const jumpToDiff = (index: number) => {
    setSelectedDiffIndex(index);

    const targetElement = document.getElementById(`left-line-${differences[index].lines1?.[0]}`);
    if (targetElement) {
      const container = document.querySelector(".col-span-4>.h-full") as HTMLElement;
      if (container) {
        container.scrollTo({
          top: targetElement.offsetTop - container.offsetHeight / 2,
          behavior: "smooth",
        });
      }
    }

    const targetElement2 = document.getElementById(`right-line-${differences[index].lines2?.[0]}`);
    if (targetElement2) {
      const container = document.querySelectorAll(".col-span-4>.h-full")[1] as HTMLElement;
      if (container) {
        container.scrollTo({
          top: targetElement2.offsetTop - container.offsetHeight / 2,
          behavior: "smooth",
        });
      }
    }
  };

  useEffect(() => {
    if (pdf1 && pdf2) {
      comparePdfs();
    }
  }, [pdf1, pdf2, comparePdfs]);
  
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
  
  // PDFファイルをURLに変換する関数
  const getPdfUrl = (file: File | null) => {
    console.log("getPdfUrl called with file:", file ? file.name : "null");
    if (!file) return null;
    try {
      const url = URL.createObjectURL(file);
      console.log('Created Blob URL for PDF:', url);
      setCreatedUrls(prev => [...prev, url]);
      return url;
    } catch (error) {
      console.error('Failed to create Blob URL:', error);
      return null;
    }
  };
  
  // 全てのBlobURLを管理する配列
  const [createdUrls, setCreatedUrls] = useState<string[]>([]);
  
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

  const PDFInputSectionComponent = PDFInputSection;

  return React.createElement(
    "div",
    { className: "container mx-auto p-6" },
    React.createElement(
      Button,
      { variant: "ghost", onClick: () => navigate("/"), className: "mb-6" },
      React.createElement(ArrowLeft, { className: "mr-2 h-4 w-4" }),
      "戻る",
    ),
    React.createElement(
      "div",
      null,
      React.createElement(
        "div",
        { className: "grid md:grid-cols-2 gap-4" },
        React.createElement(PDFInputSectionComponent, {
          title: "\u5143\u306E\u30C6\u30AD\u30B9\u30C8/PDF",
          description:
            "\u30C6\u30AD\u30B9\u30C8\u3092\u5165\u529B\u307E\u305F\u306FPDF\u3092\u9078\u629E",
          text: text1,
          onTextChange: setText1,
          pdf: pdf1,
          onPdfChange: (e) => {
            const file = e.target.files?.[0] || null;
            setPdf1(file);
            if (file) extractFileContent(file).then(setText1);
          },
          inputRef: fileInput1Ref,
        }),
        React.createElement(PDFInputSectionComponent, {
          title: "\u65B0\u3057\u3044\u30C6\u30AD\u30B9\u30C8/PDF",
          description:
            "\u30C6\u30AD\u30B9\u30C8\u3092\u5165\u529B\u307E\u305F\u306FPDF\u3092\u9078\u629E",
          text: text2,
          onTextChange: setText2,
          pdf: pdf2,
          onPdfChange: (e) => {
            const file = e.target.files?.[0] || null;
            setPdf2(file);
            if (file) extractFileContent(file).then(setText2);
          },
          inputRef: fileInput2Ref,
        }),
      ),
      React.createElement(
        Button,
        {
          className:
            "compare-button w-full bg-gradient-to-r from-[#0EA5E9] to-[#8B5CF6] hover:from-[#0284C7] hover:to-[#7C3AED] text-white font-bold text-lg py-6 shadow-lg transform transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] active:scale-[0.98]",
          onClick: comparePdfs,
          disabled: loading || (!text1 && !pdf1) || (!text2 && !pdf2),
        },
        loading
          ? React.createElement(
              React.Fragment,
              null,
              "\u6BD4\u8F03\u4E2D...",
              React.createElement(Progress, { value: progress, className: "mt-2" }),
            )
          : "\u6BD4\u8F03\u3059\u308B",
      ),
      differences.length > 0 &&
        React.createElement(
          "div",
          { className: "grid gap-6" },
          React.createElement(
            "div",
            { className: "flex items-center justify-between mb-4" },
            React.createElement(
              "div",
              { className: "flex items-center space-x-4" },
              React.createElement(
                Button,
                {
                  variant: "outline",
                  onClick: () => setShowSimilarity(!showSimilarity),
                  className: "text-slate-200",
                },
                "\u985E\u4F3C\u5EA6\u8868\u793A: ",
                showSimilarity ? "\u975E\u8868\u793A" : "\u8868\u793A",
              ),
              React.createElement(
                "div",
                { className: "flex items-center space-x-2 border rounded-md p-1" },
                // シンプルな表示モード切り替えボタン
                React.createElement(
                  Button,
                  {
                    variant: displayMode === 'chat' ? "default" : "ghost",
                    size: "sm",
                    onClick: () => setDisplayMode("chat"),
                    className: "flex items-center",
                  },
                  React.createElement(FileText, { className: "mr-1 h-4 w-4" }),
                  "AIチャット分析",
                ),
                React.createElement(
                  Button,
                  {
                    variant: displayMode === 'text' ? "default" : "ghost",
                    size: "sm",
                    onClick: () => setDisplayMode("text"),
                    className: "flex items-center",
                  },
                  React.createElement(FileText, { className: "mr-1 h-4 w-4" }),
                  "テキスト比較",
                ),
                React.createElement(
                  Button,
                  {
                    variant: displayMode === 'highlight' ? "default" : "ghost",
                    size: "sm",
                    onClick: () => setDisplayMode("highlight"),
                    className: "flex items-center",
                  },
                  React.createElement(FileText, { className: "mr-1 h-4 w-4" }),
                  "PDF差分ハイライト",
                ),
                React.createElement(
                  Button,
                  {
                    variant: displayMode === 'side-by-side' ? "default" : "ghost",
                    size: "sm",
                    onClick: () => setDisplayMode("side-by-side"),
                    className: "flex items-center",
                  },
                  React.createElement(FileText, { className: "mr-1 h-4 w-4" }),
                  "ページ比較",
                ),
                React.createElement(
                  Button,
                  {
                    variant: displayMode === 'visual-diff' ? "default" : "ghost",
                    size: "sm",
                    onClick: () => setDisplayMode("visual-diff"),
                    className: "flex items-center",
                  },
                  React.createElement(FileText, { className: "mr-1 h-4 w-4" }),
                  "視覚的差分",
                ),
                React.createElement(
                  Button,
                  {
                    variant: displayMode === 'overlay' ? "default" : "ghost",
                    size: "sm",
                    onClick: () => setDisplayMode("overlay"),
                    className: "flex items-center",
                  },
                  React.createElement(FileText, { className: "mr-1 h-4 w-4" }),
                  "オーバーレイ",
                ),
              ),
            ),
          ),
          showSimilarity &&
            React.createElement(SimilarityCard, {
              similarityScore: similarityScore,
              addedCount: differences.filter((d) => d.added).length,
              removedCount: differences.filter((d) => d.removed).length,
            }),

          // 表示モードに応じたコンポーネントを表示
          displayMode === 'text' && React.createElement(
            "div",
            { className: "grid grid-cols-12 gap-6 h-[calc(100vh-28rem)]" },
            React.createElement(
              "div",
              { className: "col-span-4" },
              React.createElement("h2", { className: "text-lg font-bold mb-2" }, "\u5143\u306EPDF"),
              React.createElement(
                "div",
                { className: "pdf-viewer h-[calc(100vh-40rem)] overflow-auto border rounded" },
                React.createElement(
                  Document,
                  { 
                    file: getPdfUrl(pdf1),
                    onLoadSuccess: (pdf) => onDocumentLoadSuccess(pdf, true),
                    onLoadError: (error) => {
                      console.error('PDF1 load error:', error);
                    },
                    options: window.pdfjsOptions,
                    loading: React.createElement('div', { className: 'p-4 text-center' }, 'PDFを読み込み中...'),
                    error: React.createElement('div', { className: 'p-4 text-center text-red-500' }, 'PDFの読み込みに失敗しました。ファイルを確認してください。')
                  },
                  Array.from(new Array(numPages1 || 5), (el, index) =>
                    React.createElement(Page, {
                      key: `page_${index + 1}`,
                      pageNumber: index + 1,
                      renderAnnotationLayer: true,
                      renderTextLayer: true,
                      className: "mb-4",
                    }),
                  ),
                ),
              ),
              React.createElement(DiffDisplay, {
                differences: differences,
                title: "\u5143\u306EPDF",
                fileName: pdf1?.name,
                side: "left",
                selectedDiffIndex: selectedDiffIndex,
                scrollRef: leftScrollRef,
                onScroll: (e) => handleScroll(e, "left"),
              }),
            ),
            React.createElement(DiffList, {
              differences: differences,
              selectedDiffIndex: selectedDiffIndex,
              onDiffClick: jumpToDiff,
            }),
            React.createElement(
              "div",
              { className: "col-span-4" },
              React.createElement(
                "h2",
                { className: "text-lg font-bold mb-2" },
                "\u65B0\u3057\u3044PDF",
              ),
              React.createElement(
                "div",
                { className: "pdf-viewer h-[calc(100vh-40rem)] overflow-auto border rounded" },
                React.createElement(
                  Document,
                  { 
                    file: getPdfUrl(pdf2),
                    onLoadSuccess: (pdf) => onDocumentLoadSuccess(pdf, false),
                    onLoadError: (error) => {
                      console.error('PDF2 load error:', error);
                    },
                    options: window.pdfjsOptions,
                    loading: React.createElement('div', { className: 'p-4 text-center' }, 'PDFを読み込み中...'),
                    error: React.createElement('div', { className: 'p-4 text-center text-red-500' }, 'PDFの読み込みに失敗しました。ファイルを確認してください。')
                  },
                  Array.from(new Array(numPages2 || 5), (el, index) =>
                    React.createElement(Page, {
                      key: `page_${index + 1}`,
                      pageNumber: index + 1,
                      renderAnnotationLayer: true,
                      renderTextLayer: true,
                      className: "mb-4",
                    }),
                  ),
                ),
              ),
              React.createElement(DiffDisplay, {
                differences: differences,
                title: "\u65B0\u3057\u3044PDF",
                fileName: pdf2?.name,
                side: "right",
                selectedDiffIndex: selectedDiffIndex,
                scrollRef: rightScrollRef,
                onScroll: (e) => handleScroll(e, "right"),
              }),
            ),
          ),
          
          // ハイライト表示モード
          displayMode === 'highlight' && React.createElement(PdfHighlightView, {
            pdf1: pdf1,
            pdf2: pdf2,
            differences: differences,
            numPages1: numPages1,
            numPages2: numPages2,
            selectedDiffIndex: selectedDiffIndex,
            onDiffClick: jumpToDiff
          }),
          
          // オーバーレイ表示モード
          displayMode === 'overlay' && React.createElement(PdfOverlayView, {
            pdf1: pdf1,
            pdf2: pdf2,
            numPages1: numPages1,
            numPages2: numPages2
          }),
          
          // iframe表示モード
          displayMode === 'iframe' && React.createElement(
            "div",
            { className: "grid grid-cols-2 gap-6 h-[calc(100vh-28rem)]" },
            React.createElement(
              "div",
              { className: "h-full" },
              React.createElement("h2", { className: "text-lg font-bold mb-2" }, "元のPDF"),
              React.createElement(IframePdfViewer, { file: pdf1 })
            ),
            React.createElement(
              "div",
              { className: "h-full" },
              React.createElement("h2", { className: "text-lg font-bold mb-2" }, "新しいPDF"),
              React.createElement(IframePdfViewer, { file: pdf2 })
            )
          ),
          
          // iframeオーバーレイモード
          displayMode === 'iframe-overlay' && React.createElement(IframeOverlayView, {
            pdf1: pdf1,
            pdf2: pdf2
          }),
          
          // 視覚的差分表示モード
          displayMode === 'visual-diff' && React.createElement(PdfVisualDiffView, {
            pdf1: pdf1,
            pdf2: pdf2,
            numPages1: numPages1,
            numPages2: numPages2,
            differences: differences
          }),

          // ページ比較表示モード（左右に並べて表示）
          displayMode === 'side-by-side' && React.createElement(SideBySidePdfView, {
            pdf1: pdf1,
            pdf2: pdf2,
            numPages1: numPages1,
            numPages2: numPages2
          }),
          
          // チャットモード表示
          displayMode === 'chat' && React.createElement(
            "div",
            { className: "mt-4 flex flex-col h-[calc(100vh-30rem)]" },
            React.createElement(
              "div",
              { className: "flex-grow overflow-auto border rounded p-4 bg-gray-50" },
              chatMessages.map((message, index) => (
                React.createElement(
                  "div",
                  { 
                    key: index,
                    className: `mb-4 p-3 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-blue-100 ml-12' 
                        : 'bg-white mr-12 border'
                    }`
                  },
                  React.createElement(
                    "div",
                    { className: "font-bold mb-1" },
                    message.role === 'user' ? "あなた" : "AIアシスタント"
                  ),
                  React.createElement(
                    "div",
                    { className: "whitespace-pre-wrap" },
                    message.content
                  )
                )
              ))
            ),
            React.createElement(
              "div",
              { className: "flex mt-4" },
              React.createElement(
                "textarea",
                {
                  className: "flex-grow p-2 border rounded",
                  placeholder: "質問を入力してください...",
                  value: userInput,
                  onChange: (e) => setUserInput(e.target.value),
                  onKeyDown: (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  },
                  rows: 2
                }
              ),
              React.createElement(
                "button",
                {
                  className: "ml-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400",
                  onClick: handleSendMessage,
                  disabled: !userInput.trim() || !differences.length
                },
                "送信"
              )
            )
          ),
        ),
    ),
  );
};

export default PdfCompare;
