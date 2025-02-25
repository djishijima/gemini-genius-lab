
import React, { useState, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Wand2, MessagesSquare, Search, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import * as pdfjsLib from 'pdfjs-dist';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
          prompt = "原稿に対する改善点や修正指示を箇条書きで整理し、以下のフォーマットで出力してください：\n\n【ページ/段落】\n- 修正内容\n- 修正理由\n\n対象テキスト：\n\n";
          break;
        case "keywords":
          prompt = "印刷物として重要な確認ポイントを以下のカテゴリごとに抽出してください：\n\n1. 表記の統一\n2. 専門用語\n3. 重要な数値\n4. 固有名詞\n\n対象テキスト：\n\n";
          break;
      }

      const result = await model.generateContent(prompt + textToAnalyze);
      const analysisText = result.response.text();
      setAnalysis(analysisText);

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
