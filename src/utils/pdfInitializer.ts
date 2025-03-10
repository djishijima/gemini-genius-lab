
import * as pdfjsLib from "pdfjs-dist";
import { pdfjs } from 'react-pdf';
import type { TextItem } from "pdfjs-dist/types/src/display/api";

// グローバル変数の型定義
declare global {
  interface Window {
    pdfjsOptions: {
      cMapUrl: string;
      cMapPacked: boolean;
    };
  }
}

// PDF.jsの設定を安全に初期化する
export const initPdfJs = (): boolean => {
  try {
    // PDFJSのバージョンを取得（APIとWorkerのバージョンを一致させるために重要）
    const pdfjsVersion = '3.11.174';  // 現在のWorkerバージョンに合わせる
    
    // react-pdfのワーカー設定
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.js`;
    
    // PDF表示オプションをグローバル変数として設定
    window.pdfjsOptions = {
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/cmaps/`,
      cMapPacked: true,
    };
    
    // pdfjs-distライブラリに対してもグローバル設定を適用
    if (pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjs.GlobalWorkerOptions.workerSrc;
    }
    
    console.log('PDF.js設定完了:', {
      'バージョン': pdfjsVersion,
      'ワーカーURL': pdfjs.GlobalWorkerOptions.workerSrc,
      'オプション': window.pdfjsOptions
    });
    
    return true;
  } catch (error) {
    console.error('PDF.js初期化エラー:', error);
    return false;
  }
};

// PDF.jsのインポートを確認するための関数
export const checkPdfJsSetup = () => {
  console.log("PDF.js setup check...");
  console.log("pdfjs.GlobalWorkerOptions.workerSrc:", pdfjs.GlobalWorkerOptions.workerSrc);
  console.log("pdfjsLib version check:", typeof pdfjsLib.getDocument);
};

// PDFからテキストを抽出する関数
export const extractFileContent = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const typedArray = new Uint8Array(reader.result as ArrayBuffer);
        const loadingTask = pdfjsLib.getDocument({
          data: typedArray,
          cMapUrl: window.pdfjsOptions.cMapUrl,
          cMapPacked: window.pdfjsOptions.cMapPacked,
        });
        
        const pdf = await loadingTask.promise;
        let fullText = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item) => ("str" in item ? (item as TextItem).str : ""))
            .join(" ");
          fullText += `${pageText}\n`;
        }
        resolve(fullText);
      } catch (error) {
        console.error("PDF読み込み中のエラー:", error);
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

// PDFファイルをURLに変換する関数
export const getPdfUrl = (file: File | null) => {
  if (!file) return null;
  try {
    // PDFファイルのMIMEタイプチェック
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      console.warn('Warning: File may not be a valid PDF:', file.type, file.name);
    }
    
    const url = URL.createObjectURL(file);
    console.log('Created Blob URL for PDF:', url);
    
    return url;
  } catch (error) {
    console.error('Failed to create Blob URL:', error);
    return null;
  }
};
