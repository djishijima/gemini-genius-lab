import React, { useState, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Wand2, MessagesSquare, Search, ChevronDown, ChevronUp, BookOpen, History, Check } from "lucide-react";
import * as pdfjsLib from 'pdfjs-dist';

interface TextVersion {
  content: string;
  timestamp: Date;
  description: string;
}

interface WritingAssistantProps {
  apiKey: string;
}

const WritingAssistant: React.FC<WritingAssistantProps> = ({ apiKey }) => {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState("");
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string>("");
  const [showPdfPreview, setShowPdfPreview] = useState(true);
  const [versions, setVersions] = useState<TextVersion[]>([]);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number>(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const saveVersion = () => {
    const newVersion: TextVersion = {
      content,
      timestamp: new Date(),
      description: `バージョン ${versions.length + 1}`
    };
    setVersions([...versions, newVersion]);
    toast({
      title: "保存完了",
      description: `${newVersion.description}を保存しました`,
    });
  };

  const handleVersionSelect = (index: number) => {
    setSelectedVersionIndex(index);
    if (index >= 0) {
      setContent(versions[index].content);
    }
  };

  const getTextDiff = (oldText: string, newText: string) => {
    const lines1 = oldText.split('\n');
    const lines2 = newText.split('\n');
    let diff = '';
    
    lines2.forEach((line, i) => {
      if (i >= lines1.length) {
        diff += `+ ${line}\n`;
      } else if (line !== lines1[i]) {
        diff += `- ${lines1[i]}\n+ ${line}\n`;
      }
    });
    
    if (lines1.length > lines2.length) {
      for (let i = lines2.length; i < lines1.length; i++) {
        diff += `- ${lines1[i]}\n`;
      }
    }
    
    return diff || '変更なし';
  };

  const handleSelectionChange = () => {
    if (textareaRef.current) {
      setSelection({
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd
      });
    }
  };

  const getSelectedText = () => {
    return content.substring(selection.start, selection.end);
  };

  const replaceSelection = (newText: string) => {
    const before = content.substring(0, selection.start);
    const after = content.substring(selection.end);
    setContent(before + newText + after);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "エラー",
        description: "PDFファイルのみアップロード可能です。",
        variant: "destructive",
      });
      return;
    }

    try {
      setPdfFile(file);
      setIsLoading(true);

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      }

      setPdfText(fullText);
      setContent(fullText);
      
      toast({
        title: "PDFを読み込みました",
        description: `${pdf.numPages}ページのテキストを抽出しました。`,
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "PDFの読み込み中にエラーが発生しました。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkPunctuation = async () => {
    if (!content) {
      toast({
        title: "テキストがありません",
        description: "チェックするテキストを入力してください。",
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

      const prompt = 
        "以下のテキストの句読点や記号の使用について確認し、問題点を指摘してください：\n\n" +
        "確認ポイント：\n" +
        "1. 句点（。）と読点（、）の適切な使用\n" +
        "2. カッコや記号の対応\n" +
        "3. スペースの過不足\n" +
        "4. 全角/半角の使い分け\n" +
        "5. 改行位置の適切性\n\n" +
        "テキスト：\n\n";

      const result = await model.generateContent(prompt + content);
      const analysisText = result.response.text();
      setAnalysis(analysisText);

      toast({
        title: "チェック完了",
        description: "句読点と記号のチェックが完了しました",
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "チェック中にエラーが発生しました。",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyze = async (type: string) => {
    if (!apiKey) {
      toast({
        title: "API キーが必要です",
        description: "Gemini API キーを設定してください。",
        variant: "destructive",
      });
      return;
    }

    const selectedText = getSelectedText();
    const textToAnalyze = selectedText || content;

    if (!textToAnalyze) {
      toast({
        title: "テキストがありません",
        description: "分析するテキストを入力または選択してください。",
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

      let prompt = "";
      switch (type) {
        case "summary":
          prompt = "以下のテキストの要約を箇条書きで作成してください：\n\n";
          break;
        case "suggestions":
          prompt = "原稿に対する赤ペンの修正指示を以下のフォーマットで整理し、赤ペンの意図を明確に説明してください：\n\n" +
                  "【ページ/段落】\n" +
                  "- 修正内容\n" +
                  "- 修正理由\n" +
                  "- 編集者の意図\n\n" +
                  "以下の点に注意して分析してください：\n" +
                  "1. 表記の統一に関する指示\n" +
                  "2. 文章の流れや構成に関する指示\n" +
                  "3. 専門用語や固有名詞の修正\n" +
                  "4. デザイン・レイアウトに関する指示\n\n" +
                  "対象テキスト：\n\n";
          break;
        case "keywords":
          prompt = "印刷物として重要な確認ポイントを以下のカテゴリごとに抽出してください：\n\n" +
                  "1. 表記の統一\n" +
                  "   - 漢字/かな表記\n" +
                  "   - 英数字の表記\n" +
                  "   - 記号の使用\n\n" +
                  "2. 専門用語\n" +
                  "   - 業界用語\n" +
                  "   - 技術用語\n\n" +
                  "3. 重要な数値\n" +
                  "   - 日付・時間\n" +
                  "   - 金額・数量\n" +
                  "   - 規格・寸法\n\n" +
                  "4. 固有名詞\n" +
                  "   - 人名・社名\n" +
                  "   - 商品名・ブランド名\n" +
                  "   - 地名・施設名\n\n" +
                  "対象テキスト：\n\n";
          break;
      }

      const result = await model.generateContent(prompt + textToAnalyze);
      const analysisText = result.response.text();
      setAnalysis(analysisText);

      toast({
        title: "分析完了",
        description: type === "suggestions" ? "修正指示を整理しました" : "分析が完了しました",
      });

    } catch (error) {
      toast({
        title: "エラー",
        description: "分析中にエラーが発生しました。",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>印刷用原稿アシスタント</CardTitle>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".pdf"
                onChange={handlePdfUpload}
                className="hidden"
                ref={fileInputRef}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="gap-2"
              >
                <BookOpen className="w-4 h-4" />
                原稿PDFをアップロード
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">原稿テキスト</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={saveVersion}
                      className="gap-2"
                    >
                      <History className="w-4 h-4" />
                      現在の状態を保存
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPdfPreview(!showPdfPreview)}
                      className="gap-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      {showPdfPreview ? "プレビューを隠す" : "プレビューを表示"}
                      {showPdfPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                {showPdfPreview && pdfText && (
                  <Card className="p-4">
                    <div className="prose max-w-none">
                      <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-auto max-h-[200px]">
                        {pdfText}
                      </pre>
                    </div>
                  </Card>
                )}
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onSelect={handleSelectionChange}
                  placeholder="PDFファイルをアップロードすると、ここにテキストが表示されます..."
                  className="min-h-[400px] font-mono text-base"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => handleAnalyze("summary")}
                    disabled={analyzing}
                    className="gap-2"
                  >
                    <Search className="w-4 h-4" />
                    全体の要約
                  </Button>
                  <Button
                    onClick={() => handleAnalyze("suggestions")}
                    disabled={analyzing}
                    className="gap-2"
                  >
                    <Wand2 className="w-4 h-4" />
                    修正指示の整理
                  </Button>
                  <Button
                    onClick={() => handleAnalyze("keywords")}
                    disabled={analyzing}
                    className="gap-2"
                  >
                    <MessagesSquare className="w-4 h-4" />
                    確認ポイント抽出
                  </Button>
                  <Button
                    onClick={checkPunctuation}
                    disabled={analyzing}
                    className="gap-2"
                  >
                    <Check className="w-4 h-4" />
                    句読点チェック
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">分析結果</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyzing ? (
                      <div className="text-center py-8 text-muted-foreground">
                        分析中...
                      </div>
                    ) : analysis ? (
                      <div className="prose max-w-none">
                        <pre className="whitespace-pre-wrap text-sm">
                          {analysis}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        テキストを選択して分析ボタンをクリックしてください
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">バージョン履歴</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {versions.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        まだ保存されたバージョンはありません
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {versions.map((version, index) => (
                          <div key={index} className="space-y-2">
                            <Button
                              variant="outline"
                              className="w-full justify-between"
                              onClick={() => handleVersionSelect(index)}
                            >
                              <span>{version.description}</span>
                              <span className="text-sm text-muted-foreground">
                                {version.timestamp.toLocaleString()}
                              </span>
                            </Button>
                            {selectedVersionIndex === index && (
                              <Card className="p-2">
                                <pre className="text-sm whitespace-pre-wrap">
                                  {index > 0
                                    ? `前のバージョンとの差分:\n${getTextDiff(
                                        versions[index - 1].content,
                                        version.content
                                      )}`
                                    : "最初のバージョン"}
                                </pre>
                              </Card>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <div className="text-sm text-muted-foreground">
                  <p className="font-semibold mb-2">使い方:</p>
                  <ul className="list-disc pl-4 space-y-2">
                    <li>クライアントから受け取った原稿PDFをアップロードしてください</li>
                    <li>全体の内容を確認する場合は「全体の要約」を使用してください</li>
                    <li>修正指示を整理する場合は、該当部分を選択して「修正指示の整理」をクリックしてください</li>
                    <li>各機能の説明:
                      <ul className="list-disc pl-4 mt-1 space-y-1">
                        <li>全体の要約: 原稿の主要ポイントを箇条書きで表示</li>
                        <li>修正指示の整理: 赤ペンの修正指示を整理して表示（ページ/段落ごと）</li>
                        <li>確認ポイント抽出: 表記統一や重要な用語などを整理</li>
                        <li>句読点チェック: 句読点や記号の使用をチェック</li>
                      </ul>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WritingAssistant;
