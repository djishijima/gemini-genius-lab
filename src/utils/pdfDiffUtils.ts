import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem, TextContent } from 'pdfjs-dist/types/src/display/api';
import * as diff from 'diff';

// PDFからテキストを抽出する
export async function extractTextFromPdf(file: File): Promise<string[]> {
  try {
    // Blobからarraybufferを生成
    const arrayBuffer = await file.arrayBuffer();
    
    // PDFJSを使用してPDFを読み込む
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const pageTexts: string[] = [];
    
    // すべてのページからテキストを抽出
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // TextItemからテキストを抽出して連結
      const pageText = textContent.items
        .filter((item): item is TextItem => 'str' in item)
        .map(item => item.str)
        .join(' ');
      
      pageTexts.push(pageText);
    }
    
    return pageTexts;
  } catch (error) {
    console.error('PDFからのテキスト抽出に失敗しました:', error);
    return [];
  }
}

// テキスト差分を計算する
export function calculateDifferences(text1: string[], text2: string[]): any[] {
  const differences: any[] = [];
  
  // ページ数が異なる場合は大きい方に合わせる
  const maxPages = Math.max(text1.length, text2.length);
  
  for (let i = 0; i < maxPages; i++) {
    const pageText1 = i < text1.length ? text1[i] : '';
    const pageText2 = i < text2.length ? text2[i] : '';
    
    // ページ単位で行に分割
    const lines1 = pageText1.split('\n');
    const lines2 = pageText2.split('\n');
    
    // diff.jsのDiffチャンクを生成
    const changes = diff.diffLines(pageText1, pageText2);
    
    // 差分の詳細情報を作成
    changes.forEach(change => {
      if (change.added || change.removed) {
        // 行番号を特定（簡易的な実装）
        let lineNumbers1: number[] = [];
        let lineNumbers2: number[] = [];
        
        if (change.removed) {
          // 削除された行の行番号を特定
          const searchText = change.value;
          let startIndex = pageText1.indexOf(searchText);
          
          if (startIndex !== -1) {
            // この行より前にある改行の数をカウント
            const textBefore = pageText1.substring(0, startIndex);
            const linesBefore = textBefore.split('\n').length - 1;
            
            // 変更テキスト内の行数をカウント
            const linesInChange = searchText.split('\n').length;
            
            // 行番号の範囲を設定
            for (let j = 0; j < linesInChange; j++) {
              lineNumbers1.push(linesBefore + j + 1);
            }
          }
        }
        
        if (change.added) {
          // 追加された行の行番号を特定
          const searchText = change.value;
          let startIndex = pageText2.indexOf(searchText);
          
          if (startIndex !== -1) {
            // この行より前にある改行の数をカウント
            const textBefore = pageText2.substring(0, startIndex);
            const linesBefore = textBefore.split('\n').length - 1;
            
            // 変更テキスト内の行数をカウント
            const linesInChange = searchText.split('\n').length;
            
            // 行番号の範囲を設定
            for (let j = 0; j < linesInChange; j++) {
              lineNumbers2.push(linesBefore + j + 1);
            }
          }
        }
        
        differences.push({
          page: i + 1,
          added: change.added || false,
          removed: change.removed || false,
          value: change.value,
          lines1: lineNumbers1,
          lines2: lineNumbers2
        });
      }
    });
  }
  
  return differences;
}

// ビジュアル差分のための便利な関数
export function calculateVisualBoundingBoxes(
  textContent1: TextContent, 
  textContent2: TextContent
): { 
  additions: Array<{x: number, y: number, width: number, height: number}>;
  removals: Array<{x: number, y: number, width: number, height: number}>;
} {
  const additions: Array<{x: number, y: number, width: number, height: number}> = [];
  const removals: Array<{x: number, y: number, width: number, height: number}> = [];
  
  // テキスト項目をフラット化して比較する
  const items1 = textContent1.items.filter((item): item is TextItem => 'str' in item);
  const items2 = textContent2.items.filter((item): item is TextItem => 'str' in item);
  
  // テキスト文字列のマッピングを作成
  const textMap1 = new Map<string, TextItem>();
  const textMap2 = new Map<string, TextItem>();
  
  items1.forEach(item => {
    const key = `${item.str}_${Math.round(item.transform[4])}_${Math.round(item.transform[5])}`;
    textMap1.set(key, item);
  });
  
  items2.forEach(item => {
    const key = `${item.str}_${Math.round(item.transform[4])}_${Math.round(item.transform[5])}`;
    textMap2.set(key, item);
  });
  
  // 削除されたテキスト（PDF1にあってPDF2にない）
  for (const [key, item] of textMap1.entries()) {
    if (!textMap2.has(key)) {
      removals.push({
        x: item.transform[4],
        y: item.transform[5],
        width: item.width || 0,
        height: item.height || 0
      });
    }
  }
  
  // 追加されたテキスト（PDF2にあってPDF1にない）
  for (const [key, item] of textMap2.entries()) {
    if (!textMap1.has(key)) {
      additions.push({
        x: item.transform[4],
        y: item.transform[5],
        width: item.width || 0,
        height: item.height || 0
      });
    }
  }
  
  return { additions, removals };
}

// キャンバス要素間の差分を計算する
export function calculateCanvasDiff(
  canvas1: HTMLCanvasElement, 
  canvas2: HTMLCanvasElement
): { 
  diffCanvas: HTMLCanvasElement;
  differences: number;
} {
  // 新しいcanvas要素を作成
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = Math.max(canvas1.width, canvas2.width);
  diffCanvas.height = Math.max(canvas1.height, canvas2.height);
  
  const ctx1 = canvas1.getContext('2d');
  const ctx2 = canvas2.getContext('2d');
  const diffCtx = diffCanvas.getContext('2d');
  
  if (!ctx1 || !ctx2 || !diffCtx) {
    return { diffCanvas, differences: 0 };
  }
  
  // 両方のキャンバスから画像データを取得
  const imageData1 = ctx1.getImageData(0, 0, canvas1.width, canvas1.height);
  const imageData2 = ctx2.getImageData(0, 0, canvas2.width, canvas2.height);
  
  // 差分表示用の画像データを作成
  const diffData = diffCtx.createImageData(diffCanvas.width, diffCanvas.height);
  
  let diffCount = 0;
  const threshold = 30; // ピクセル差の閾値
  
  // ピクセルごとに比較
  for (let y = 0; y < diffCanvas.height; y++) {
    for (let x = 0; x < diffCanvas.width; x++) {
      const idx = (y * diffCanvas.width + x) * 4;
      
      // キャンバス1のピクセル値（範囲外の場合は白）
      const r1 = x < canvas1.width && y < canvas1.height ? imageData1.data[idx] : 255;
      const g1 = x < canvas1.width && y < canvas1.height ? imageData1.data[idx + 1] : 255;
      const b1 = x < canvas1.width && y < canvas1.height ? imageData1.data[idx + 2] : 255;
      const a1 = x < canvas1.width && y < canvas1.height ? imageData1.data[idx + 3] : 255;
      
      // キャンバス2のピクセル値（範囲外の場合は白）
      const r2 = x < canvas2.width && y < canvas2.height ? imageData2.data[idx] : 255;
      const g2 = x < canvas2.width && y < canvas2.height ? imageData2.data[idx + 1] : 255;
      const b2 = x < canvas2.width && y < canvas2.height ? imageData2.data[idx + 2] : 255;
      const a2 = x < canvas2.width && y < canvas2.height ? imageData2.data[idx + 3] : 255;
      
      // ピクセル間の差を計算
      const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2) + Math.abs(a1 - a2);
      
      if (diff > threshold) {
        diffCount++;
        
        // 差分がある場合の色分け
        if (a1 > a2) {
          // 削除（赤）
          diffData.data[idx] = 255;
          diffData.data[idx + 1] = 0;
          diffData.data[idx + 2] = 0;
          diffData.data[idx + 3] = 180;
        } else if (a1 < a2) {
          // 追加（緑）
          diffData.data[idx] = 0;
          diffData.data[idx + 1] = 255;
          diffData.data[idx + 2] = 0;
          diffData.data[idx + 3] = 180;
        } else {
          // 変更（青）
          diffData.data[idx] = 0;
          diffData.data[idx + 1] = 0;
          diffData.data[idx + 2] = 255;
          diffData.data[idx + 3] = 180;
        }
      } else {
        // 差分がない場合は透明
        diffData.data[idx] = 255;
        diffData.data[idx + 1] = 255;
        diffData.data[idx + 2] = 255;
        diffData.data[idx + 3] = 0;
      }
    }
  }
  
  // 差分データをキャンバスに描画
  diffCtx.putImageData(diffData, 0, 0);
  
  return { diffCanvas, differences: diffCount };
}
