
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

  // スクリプトの基本構造を作成
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
  
  // 縦書き・横書きの検出
  options.isVertical = prompt.includes("縦書き");
  
  // フォントの検出
  if (prompt.includes("明朝")) {
    options.fontFamily = "KozMinPro-Regular";
  } else if (prompt.includes("ゴシック")) {
    options.fontFamily = "KozGoPro-Regular";
  }
  
  // その他のオプションを検出...
  
  return options;
}
