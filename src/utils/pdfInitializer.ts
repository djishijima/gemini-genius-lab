
import * as pdfjsLib from "pdfjs-dist";
import { pdfjs } from 'react-pdf';
import type { TextItem } from "pdfjs-dist/types/src/display/api";

// pdfjsLibとpdfjs（react-pdf）のバージョン確認
console.log('pdfjs-dist version:', pdfjsLib.version);
console.log('react-pdf pdfjs version:', pdfjs.version);

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
    console.log('PDF.js初期化を開始します - v3.11.174');
    
    // 全ての環境で動作するようCDNからワーカーを読み込む
    const cdnBase = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174';
    const workerSrc = `${cdnBase}/build/pdf.worker.min.js`;
    const fallbackWorkerSrc = '/pdf.worker.min.js'; // フォールバックワーカーのパス
    
    // react-pdfとpdfjs-distの両方にワーカーを設定
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
    } catch (e) {
      console.warn('Worker設定エラー:', e);
      // ローカルフォールバックを試行
      try {
        pdfjs.GlobalWorkerOptions.workerSrc = fallbackWorkerSrc;
        pdfjsLib.GlobalWorkerOptions.workerSrc = fallbackWorkerSrc;
      } catch (e2) {
        console.error('フォールバック設定にも失敗:', e2);
      }
    }
    
    // CMap設定
    const cMapUrl = `${cdnBase}/cmaps/`;
    window.pdfjsOptions = {
      cMapUrl: cMapUrl,
      cMapPacked: true,
    };
    
    // グローバルオプションがアクセス可能か確認
    if (!window.pdfjsOptions) {
      console.warn('window.pdfjsOptionsが設定できていません。直接オプションを使用します。');
    }
    
    console.log('PDF.js正常に設定完了:', { 
      'worker': pdfjs.GlobalWorkerOptions.workerSrc,
      'version': pdfjsLib.version
    });
    
    console.log('PDF.js設定完了:', {
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
        console.log('PDF読み込み開始:', file.name, file.size, 'bytes');
        const typedArray = new Uint8Array(reader.result as ArrayBuffer);
        // ロギングを追加して問題のトラッキングを改善
        console.log('ArrayBuffer取得:', typedArray.length, 'bytes');
        
        // PDF読み込みオプションを定義（window.pdfjsOptionsに依存しない）
        const pdfOptions = {
          data: typedArray,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
          useSystemFonts: true, // システムフォントを使用して改善
        };
        
        // ループを使用してPDF読み込みを試行
        const loadingTask = pdfjsLib.getDocument(pdfOptions);
        
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
