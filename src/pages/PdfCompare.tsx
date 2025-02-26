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
    const [synchroScroll, setSynchroScroll] = useState<boolean>(true);
    const leftScrollRef = useRef<HTMLDivElement>(null);
    const rightScrollRef = useRef<HTMLDivElement>(null);

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

    const handleScroll = (event: React.UIEvent<HTMLDivElement>, side: 'left' | 'right') => {
        if (!synchroScroll) return;
        
        const scrolledElement = event.currentTarget;
        const targetElement = side === 'left' ? rightScrollRef.current : leftScrollRef.current;
        
        if (targetElement && scrolledElement) {
            targetElement.scrollTop = scrolledElement.scrollTop;
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
                        <Card className="bg-slate-800">
                            <CardHeader>
                                <CardTitle className="text-slate-100">元のテキスト/PDF</CardTitle>
                                <CardDescription className="text-slate-300">テキストを入力またはPDFを選択</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    placeholder="テキストを入力"
                                    value={text1}
                                    onChange={(e) => setText1(e.target.value)}
                                    className="min-h-[200px] text-slate-200 bg-slate-700 placeholder:text-slate-400"
                                />
                                <div className="flex items-center space-x-4">
                                    <Label htmlFor="pdf1" className="text-slate-200">またはPDFをアップロード:</Label>
                                    <Input 
                                        type="file" 
                                        id="pdf1" 
                                        accept=".pdf,application/pdf" 
                                        onChange={handlePdf1Change} 
                                        ref={fileInput1Ref}
                                        className="text-slate-200 bg-slate-700"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="input-section-2">
                        <Card className="bg-slate-800">
                            <CardHeader>
                                <CardTitle className="text-slate-100">新しいテキスト/PDF</CardTitle>
                                <CardDescription className="text-slate-300">テキストを入力またはPDFを選択</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    placeholder="テキストを入力"
                                    value={text2}
                                    onChange={(e) => setText2(e.target.value)}
                                    className="min-h-[200px] text-slate-200 bg-slate-700 placeholder:text-slate-400"
                                />
                                <div className="flex items-center space-x-4">
                                    <Label htmlFor="pdf2" className="text-slate-200">またはPDFをアップロード:</Label>
                                    <Input 
                                        type="file" 
                                        id="pdf2" 
                                        accept=".pdf,application/pdf" 
                                        onChange={handlePdf2Change} 
                                        ref={fileInput2Ref}
                                        className="text-slate-200 bg-slate-700"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Button 
                    className="compare-button w-full bg-slate-700 hover:bg-slate-600 text-slate-100" 
                    onClick={comparePdfs} 
                    disabled={loading || (!text1 && !pdf1) || (!text2 && !pdf2)}
                >
                    {loading ? (<><>比較中...</><Progress value={progress} className="mt-2" /></>) : '比較する'}
                </Button>

                {differences.length > 0 && (
                    <div className="grid gap-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card className="bg-slate-800 border border-slate-700">
                                <CardHeader className="border-b border-slate-700">
                                    <CardTitle className="text-slate-100">オリジナルテキスト</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea 
                                        className="h-[500px] w-full rounded-md border border-slate-700"
                                        ref={leftScrollRef}
                                        onWheel={(e) => {
                                            if (leftScrollRef.current) {
                                                handleScroll(e as unknown as React.UIEvent<HTMLDivElement>, 'left');
                                            }
                                        }}
                                    >
                                        <div className="p-4">
                                            {differences.map((part, index) => (
                                                <span
                                                    key={index}
                                                    className={`${
                                                        part.removed ? 'bg-red-900/50 px-1 rounded border-b-2 border-red-500' : ''
                                                    }`}
                                                >
                                                    {part.value}
                                                </span>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-800 border border-slate-700">
                                <CardHeader className="border-b border-slate-700">
                                    <CardTitle className="text-slate-100">新規テキスト</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea 
                                        className="h-[500px] w-full rounded-md border border-slate-700"
                                        ref={rightScrollRef}
                                        onWheel={(e) => {
                                            if (rightScrollRef.current) {
                                                handleScroll(e as unknown as React.UIEvent<HTMLDivElement>, 'right');
                                            }
                                        }}
                                    >
                                        <div className="p-4">
                                            {differences.map((part, index) => (
                                                <span
                                                    key={index}
                                                    className={`${
                                                        part.added ? 'bg-green-900/50 px-1 rounded border-b-2 border-green-500' : ''
                                                    }`}
                                                >
                                                    {part.value}
                                                </span>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="bg-slate-800 border border-slate-700">
                            <CardHeader className="border-b border-slate-700">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-slate-100">変更点リスト</CardTitle>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-400">類似度:</span>
                                        <span className="text-2xl font-bold text-slate-200">{similarityScore}%</span>
                                    </div>
                                </div>
                                <CardDescription className="text-slate-400">クリックで該当��所にジャンプ</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {differences.map((diff, index) => {
                                        if (!diff.added && !diff.removed) return null;
                                        return (
                                            <div
                                                key={`diff-${index}`}
                                                onClick={() => jumpToDiff(index)}
                                                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                                    diff.added ? 'bg-green-900/30 hover:bg-green-900/50 border-l-4 border-green-500' : 
                                                    diff.removed ? 'bg-red-900/30 hover:bg-red-900/50 border-l-4 border-red-500' : 
                                                    'bg-slate-700 hover:bg-slate-600'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-semibold ${diff.added ? 'text-green-400' : 'text-red-400'}`}>
                                                        {diff.added ? '追加' : '削除'}
                                                    </span>
                                                    <div className="overflow-hidden">
                                                        <span className="text-sm text-slate-200 block truncate">{diff.value}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
