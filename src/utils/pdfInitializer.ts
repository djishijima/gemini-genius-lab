
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
    // react-pdfのワーカー設定
    // CDNからワーカーをロードして互換性問題を回避
    const pdfjsVersion = pdfjs.version || '3.4.120';
    const pdfjsCDN = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.js`;
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsCDN;
    
    // PDF表示オプションをグローバル変数として設定
    window.pdfjsOptions = {
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/cmaps/`,
      cMapPacked: true,
    };
    
    // pdfjs-distライブラリに対してもグローバル設定を適用
    if (pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsCDN;
    }
    
    // 事前にCDNリソースへの接続を確認
    console.log('PDF.js設定完了:', {
      'react-pdfバージョン': pdfjsVersion,
      'PDF.jsバージョン': pdfjsLib?.version || 'unknown',
      'ワーカーURL': pdfjs.GlobalWorkerOptions.workerSrc,
      'オプション': window.pdfjsOptions
    });
    
    // CDNリソースの可用性をプリフェッチで確認
    fetch(pdfjsCDN, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          console.log('PDF.js Worker is accessible');
        } else {
          console.warn('PDF.js Worker might not be accessible, status:', response.status);
        }
      })
      .catch(err => {
        console.warn('Failed to prefetch PDF.js Worker:', err);
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

// PDFからテキストを抽出する関数
export const extractFileContent = async (file: File): Promise<string> => {
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
        }
        resolve(fullText);
      } catch (error) {
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
    
    // URLが正しく生成されたか確認
    if (!url.startsWith('blob:')) {
      console.warn('Generated URL does not appear to be a blob URL:', url);
    }
    
    return url;
  } catch (error) {
    console.error('Failed to create Blob URL:', error);
    return null;
  }
};
