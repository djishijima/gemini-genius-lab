interface ScriptOptions {
  pageWidth?: number;  // mm
  pageHeight?: number; // mm
  marginTop?: number;  // mm
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  isVertical?: boolean;
}

const DEFAULT_OPTIONS: ScriptOptions = {
  pageWidth: 210,    // A4
  pageHeight: 297,   // A4
  marginTop: 20,
  marginBottom: 20,
  marginLeft: 15,
  marginRight: 15,
  fontFamily: "KozMinPro-Regular",
  fontSize: 10,
  lineHeight: 15,
  isVertical: false
};

export function generateInDesignScript(manuscript: string, prompt: string, options: Partial<ScriptOptions> = {}): string {
  const scriptOptions = { ...DEFAULT_OPTIONS, ...options };
  const isVertical = prompt.includes("縦書き") || scriptOptions.isVertical;

  return `// InDesign Script - Generated
// Prompt: ${prompt}
// Settings: ${JSON.stringify(scriptOptions, null, 2)}

try {
  // ドキュメントの作成または取得
  var doc = app.documents.length > 0 ? app.activeDocument : app.documents.add();
  
  // ドキュメント設定
  doc.documentPreferences.pageWidth = "${scriptOptions.pageWidth}mm";
  doc.documentPreferences.pageHeight = "${scriptOptions.pageHeight}mm";
  
  // マージン設定
  doc.marginPreferences.top = "${scriptOptions.marginTop}mm";
  doc.marginPreferences.bottom = "${scriptOptions.marginBottom}mm";
  doc.marginPreferences.left = "${scriptOptions.marginLeft}mm";
  doc.marginPreferences.right = "${scriptOptions.marginRight}mm";
  
  // テキストフレーム作成
  var textFrame = doc.pages[0].textFrames.add({
    geometricBounds: [
      "${scriptOptions.marginTop}mm",
      "${scriptOptions.marginLeft}mm",
      "${scriptOptions.pageHeight - scriptOptions.marginBottom}mm",
      "${scriptOptions.pageWidth - scriptOptions.marginRight}mm"
    ]
  });
  
  // 縦書き設定
  if (${isVertical}) {
    textFrame.textFramePreferences.verticalJustification = VerticalJustification.TOP_ALIGN;
    textFrame.textFramePreferences.verticalText = true;
  }
  
  // 段落スタイル作成
  var style = doc.paragraphStyles.add({
    name: "生成スタイル",
    appliedFont: "${scriptOptions.fontFamily}",
    pointSize: ${scriptOptions.fontSize},
    leading: ${scriptOptions.lineHeight},
    justification: ${isVertical ? "Justification.LEFT_ALIGN" : "Justification.JUSTIFY_ALL_LINES"}
  });
  
  // テキスト挿入
  textFrame.contents = "${manuscript.replace(/"/g, '\\"').replace(/\n/g, '\\n')}";
  textFrame.texts[0].applyParagraphStyle(style);
  
  alert("スクリプトの実行が完了しました。");
} catch(e) {
  alert("エラーが発生しました: " + e.toString());
}`;
}

export function parsePromptForOptions(prompt: string): Partial<ScriptOptions> {
  const options: Partial<ScriptOptions> = {};
  
  options.isVertical = prompt.includes("縦書き");
  
  if (prompt.includes("明朝")) {
    options.fontFamily = "KozMinPro-Regular";
  } else if (prompt.includes("ゴシック")) {
    options.fontFamily = "KozGoPro-Regular";
  }
  
  // マージンの検出
  const marginMatch = prompt.match(/マージン[上下左右\d\s]*(\d+)mm/);
  if (marginMatch) {
    const margin = parseInt(marginMatch[1]);
    options.marginTop = margin;
    options.marginBottom = margin;
    options.marginLeft = margin;
    options.marginRight = margin;
  }
  
  return options;
}

export function analyzeScript(script: string): Partial<ScriptOptions> {
  const options: Partial<ScriptOptions> = {};
  
  // 縦書きの検出
  options.isVertical = script.includes('verticalText = true');
  
  // フォントの検出
  const fontMatch = script.match(/appliedFont: "([^"]+)"/);
  if (fontMatch) {
    options.fontFamily = fontMatch[1];
  }
  
  // フォントサイズの検出
  const sizeMatch = script.match(/pointSize: (\d+)/);
  if (sizeMatch) {
    options.fontSize = parseInt(sizeMatch[1]);
  }
  
  // 行送りの検出
  const leadingMatch = script.match(/leading: (\d+)/);
  if (leadingMatch) {
    options.lineHeight = parseInt(leadingMatch[1]);
  }
  
  // マージンの検出
  const marginTopMatch = script.match(/marginPreferences\.top = "(\d+)mm"/);
  const marginBottomMatch = script.match(/marginPreferences\.bottom = "(\d+)mm"/);
  const marginLeftMatch = script.match(/marginPreferences\.left = "(\d+)mm"/);
  const marginRightMatch = script.match(/marginPreferences\.right = "(\d+)mm"/);
  
  if (marginTopMatch) options.marginTop = parseInt(marginTopMatch[1]);
  if (marginBottomMatch) options.marginBottom = parseInt(marginBottomMatch[1]);
  if (marginLeftMatch) options.marginLeft = parseInt(marginLeftMatch[1]);
  if (marginRightMatch) options.marginRight = parseInt(marginRightMatch[1]);
  
  return options;
}

export async function convertInddToScript(file: File): Promise<string> {
  // InDesignドキュメントのバイナリデータを解析して設定を抽出
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  
  // InDesignファイルのヘッダーを確認（マジックナンバー）
  const signature = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (signature !== 'INDD') {
    throw new Error('無効なInDesignファイルです');
  }

  // 基本的な設定を抽出（実際のInDesignファイル構造に基づいて実装が必要）
  const options: ScriptOptions = {
    pageWidth: 210,    // A4
    pageHeight: 297,   // A4
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 15,
    marginRight: 15,
    fontFamily: "KozMinPro-Regular",
    fontSize: 10,
    lineHeight: 15,
    isVertical: false
  };

  // 抽出した設定からスクリプトを生成
  return `// InDesign Script - Generated from ${file.name}
// Settings: ${JSON.stringify(options, null, 2)}

try {
  var doc = app.activeDocument || app.documents.add();
  
  doc.documentPreferences.pageWidth = "${options.pageWidth}mm";
  doc.documentPreferences.pageHeight = "${options.pageHeight}mm";
  
  doc.marginPreferences.top = "${options.marginTop}mm";
  doc.marginPreferences.bottom = "${options.marginBottom}mm";
  doc.marginPreferences.left = "${options.marginLeft}mm";
  doc.marginPreferences.right = "${options.marginRight}mm";
  
  var textFrame = doc.pages[0].textFrames.add({
    geometricBounds: [
      "${options.marginTop}mm",
      "${options.marginLeft}mm",
      "${options.pageHeight - options.marginBottom}mm",
      "${options.pageWidth - options.marginRight}mm"
    ]
  });
  
  if (${options.isVertical}) {
    textFrame.textFramePreferences.verticalText = true;
  }
  
  var style = doc.paragraphStyles.add({
    name: "インポート元スタイル",
    appliedFont: "${options.fontFamily}",
    pointSize: ${options.fontSize},
    leading: ${options.lineHeight}
  });
  
  alert("InDesignドキュメントからスクリプトを生成しました。");
} catch(e) {
  alert("エラーが発生しました: " + e.toString());
}`;
}
