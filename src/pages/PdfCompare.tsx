
// Core Libraries
import React, { useState, useRef } from 'react';
import { diffWords } from 'diff';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as pdfjsLib from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';
import 'pdfjs-dist/build/pdf.worker.entry';
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

interface Difference {
    value: string;
    added?: boolean;
    removed?: boolean;
    lines1?: number[];
    lines2?: number[];
}

export default function PdfCompare() {
    const navigate = useNavigate();
    const [pdf1, setPdf1] = useState<File | null>(null);
    const [pdf2, setPdf2] = useState<File | null>(null);
    const [text1, setText1] = useState<string>('');
    const [text2, setText2] = useState<string>('');
    const [pdf1Text, setPdf1Text] = useState<string>('');
    const [pdf2Text, setPdf2Text] = useState<string>('');
    const [differences, setDifferences] = useState<Difference[]>([]);
    const [similarityScore, setSimilarityScore] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const fileInput1Ref = useRef<HTMLInputElement>(null);
    const fileInput2Ref = useRef<HTMLInputElement>(null);

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

    const extractFileContent = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const typedArray = new Uint8Array(reader.result as ArrayBuffer);
                    const pdf = await pdfjsLib.getDocument(typedArray).promise;
                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items
                            .map((item) => ('str' in item ? (item as TextItem).str : ''))
                            .join(' ');
                        fullText += pageText + '\n';
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
    };

    const comparePdfs = async () => {
        if ((!text1 && !pdf1) || (!text2 && !pdf2)) {
            alert('テキストを入力するかPDFをアップロードしてください。');
            return;
        }

        setLoading(true);
        setProgress(0);

        try {
            const textContent1 = text1 || (pdf1 ? await extractFileContent(pdf1) : '');
            const textContent2 = text2 || (pdf2 ? await extractFileContent(pdf2) : '');
            
            setPdf1Text(textContent1);
            setPdf2Text(textContent2);

            const diffResult = diffWords(textContent1, textContent2);

            const differencesWithLines = processDifferences(diffResult, textContent1, textContent2);
            setDifferences(differencesWithLines);

            const similarityScore = calculateSimilarity(diffResult, textContent1, textContent2);
            setSimilarityScore(similarityScore);

        } catch (error) {
            console.error("比較中にエラーが発生しました:", error);
            alert('比較中にエラーが発生しました。');
        } finally {
            setLoading(false);
            setProgress(0);
        }
    };

    const processDifferences = (diffResult: any[], text1: string, text2: string) => {
        let currentLine1 = 1;
        let currentLine2 = 1;
        return diffResult.map(diff => {
            const lines1: number[] = [];
            const lines2: number[] = [];

            if (!diff.added) {
                diff.value.split('\n').forEach(() => {
                    lines1.push(currentLine1++);
                });
                currentLine1--;
            }

            if (!diff.removed) {
                diff.value.split('\n').forEach(() => {
                    lines2.push(currentLine2++);
                });
                currentLine2--;
            }

            return { ...diff, lines1, lines2 };
        });
    };

    const calculateSimilarity = (diffResult: any[], text1: string, text2: string) => {
        const unchangedLength = diffResult
            .filter(part => !part.added && !part.removed)
            .reduce((sum, part) => sum + part.value.length, 0);
        const totalLength = Math.max(text1.length, text2.length);
        return parseFloat((totalLength === 0 ? 0 : (unchangedLength / totalLength) * 100).toFixed(2));
    };

    const jumpToDiff = (index: number) => {
        const diff = differences[index];
        const line1 = diff.lines1?.[0];
        const line2 = diff.lines2?.[0];

        if (line1) {
            const elementId1 = `original-line-${line1}`;
            document.getElementById(elementId1)?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
                inline: 'nearest',
            });
        }

        if (line2) {
            const elementId2 = `new-line-${line2}`;
            document.getElementById(elementId2)?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
                inline: 'nearest',
            });
        }
    };

    return (
        <div className="container mx-auto p-6">
            <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" />
                戻る
            </Button>

            <div className="grid gap-6">
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="input-section-1">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-gray-900">元のテキスト/PDF</CardTitle>
                                <CardDescription>テキストを入力またはPDFを選択</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    placeholder="テキストを入力"
                                    value={text1}
                                    onChange={(e) => setText1(e.target.value)}
                                    className="min-h-[200px] text-gray-900"
                                />
                                <div className="flex items-center space-x-4">
                                    <Label htmlFor="pdf1" className="text-gray-900">またはPDFをアップロード:</Label>
                                    <Input 
                                        type="file" 
                                        id="pdf1" 
                                        accept=".pdf,application/pdf" 
                                        onChange={handlePdf1Change} 
                                        ref={fileInput1Ref}
                                        className="text-gray-900"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="input-section-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-gray-900">新しいテキスト/PDF</CardTitle>
                                <CardDescription>テキストを入力またはPDFを選択</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    placeholder="テキストを入力"
                                    value={text2}
                                    onChange={(e) => setText2(e.target.value)}
                                    className="min-h-[200px] text-gray-900"
                                />
                                <div className="flex items-center space-x-4">
                                    <Label htmlFor="pdf2" className="text-gray-900">またはPDFをアップロード:</Label>
                                    <Input 
                                        type="file" 
                                        id="pdf2" 
                                        accept=".pdf,application/pdf" 
                                        onChange={handlePdf2Change} 
                                        ref={fileInput2Ref}
                                        className="text-gray-900"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Button 
                    className="compare-button" 
                    onClick={comparePdfs} 
                    disabled={loading || (!text1 && !pdf1) || (!text2 && !pdf2)}
                >
                    {loading ? (<><>比較中...</><Progress value={progress} className="mt-2" /></>) : '比較する'}
                </Button>

                {differences.length > 0 && (
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="left-column space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-gray-900">オリジナルテキスト</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[500px] w-full rounded-md border">
                                        <div className="p-4">
                                            {pdf1Text.split('\n').map((line, index) => {
                                                const lineNumber = index + 1;
                                                const isDiffPresent = differences.some(
                                                    diff => diff.removed && 
                                                    diff.lines1 && 
                                                    diff.lines1.includes(lineNumber)
                                                );
                                                return (
                                                    <div
                                                        key={`original-line-${lineNumber}`}
                                                        id={`original-line-${lineNumber}`}
                                                        className={`mb-2 text-gray-900 ${isDiffPresent ? 'bg-red-100 p-2 rounded' : ''}`}
                                                    >
                                                        {line}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-gray-900">類似度</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-bold text-gray-900">{similarityScore}%</p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="right-column space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-gray-900">新規テキスト</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[500px] w-full rounded-md border">
                                        <div className="p-4">
                                            {pdf2Text.split('\n').map((line, index) => {
                                                const lineNumber = index + 1;
                                                const isDiffPresent = differences.some(
                                                    diff => diff.added && 
                                                    diff.lines2 && 
                                                    diff.lines2.includes(lineNumber)
                                                );
                                                return (
                                                    <div
                                                        key={`new-line-${lineNumber}`}
                                                        id={`new-line-${lineNumber}`}
                                                        className={`mb-2 text-gray-900 ${isDiffPresent ? 'bg-green-100 p-2 rounded' : ''}`}
                                                    >
                                                        {line}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-gray-900">変更点リスト</CardTitle>
                                    <CardDescription>クリックでジャンプ</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {differences.map((diff, index) => {
                                            const addedLine = diff.added && diff.lines2?.[0];
                                            const removedLine = diff.removed && diff.lines1?.[0];
                                            return (
                                                <div
                                                    key={`diff-${index}`}
                                                    onClick={() => jumpToDiff(index)}
                                                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                                        diff.added ? 'bg-green-50 hover:bg-green-100' : 
                                                        diff.removed ? 'bg-red-50 hover:bg-red-100' : 
                                                        'bg-gray-50 hover:bg-gray-100'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        {diff.added && <span className="text-green-600 font-semibold">追加:</span>}
                                                        {diff.removed && <span className="text-red-600 font-semibold">削除:</span>}
                                                        <div>
                                                            <span className="text-sm text-gray-900 truncate">{diff.value}</span>
                                                            <span className="text-xs text-gray-500 ml-2">
                                                                {diff.added && addedLine ? `(Line: ${addedLine})` : null}
                                                                {diff.removed && removedLine ? `(Line: ${removedLine})` : null}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
