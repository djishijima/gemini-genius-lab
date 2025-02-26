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

    const handleScroll = (event: React.WheelEvent<HTMLDivElement>, side: 'left' | 'right') => {
        if (!synchroScroll) return;
        
        event.preventDefault();
        const delta = event.deltaY;
        
        if (leftScrollRef.current && rightScrollRef.current) {
            const leftViewport = leftScrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            const rightViewport = rightScrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            
            if (leftViewport && rightViewport) {
                if (side === 'left') {
                    leftViewport.scrollTop += delta;
                    rightViewport.scrollTop = leftViewport.scrollTop;
                } else {
                    rightViewport.scrollTop += delta;
                    leftViewport.scrollTop = rightViewport.scrollTop;
                }
            }
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
                    className="compare-button w-full bg-gradient-to-r from-[#0EA5E9] to-[#8B5CF6] hover:from-[#0284C7] hover:to-[#7C3AED] text-white font-bold text-lg py-6 shadow-lg transform transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] active:scale-[0.98]" 
                    onClick={comparePdfs} 
                    disabled={loading || (!text1 && !pdf1) || (!text2 && !pdf2)}
                >
                    {loading ? (
                        <>
                            比較中...
                            <Progress value={progress} className="mt-2" />
                        </>
                    ) : '比較する'}
                </Button>

                {differences.length > 0 && (
                    <div className="grid gap-6">
                        <Card className="bg-slate-800">
                            <CardHeader>
                                <div className="flex flex-col items-center justify-center space-y-2">
                                    <CardTitle className="text-slate-100 text-3xl">類似度</CardTitle>
                                    <div className="flex items-center gap-4">
                                        <div className="text-5xl font-bold bg-gradient-to-r from-[#0EA5E9] to-[#8B5CF6] bg-clip-text text-transparent">
                                            {similarityScore}%
                                        </div>
                                        <div className="h-16 w-[2px] bg-slate-700"/>
                                        <div className="text-slate-400">
                                            <div>追加された箇所: {differences.filter(d => d.added).length}</div>
                                            <div>削除された箇所: {differences.filter(d => d.removed).length}</div>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>

                        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-28rem)]">
                            <Card className="col-span-4 bg-slate-800 border border-slate-700">
                                <CardHeader className="border-b border-slate-700">
                                    <CardTitle className="text-slate-100 flex items-center justify-between">
                                        <span>参照ファイル</span>
                                        {pdf1 && <span className="text-sm text-slate-400">
                                            {pdf1.name}
                                        </span>}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 h-full">
                                    <ScrollArea 
                                        className="h-full rounded-md"
                                        ref={leftScrollRef}
                                        onWheel={(e) => handleScroll(e, 'left')}
                                    >
                                        <div className="p-4 space-y-2">
                                            {differences.map((part, index) => (
                                                <div 
                                                    key={index}
                                                    id={`original-line-${part.lines1?.[0]}`}
                                                    className={`relative ${
                                                        part.removed ? 'bg-red-600/20 px-3 py-2 rounded border-l-4 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'px-3 py-2'
                                                    }`}
                                                >
                                                    {part.removed && (
                                                        <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-red-400 text-sm">
                                                            削除
                                                        </div>
                                                    )}
                                                    <span className="block break-words whitespace-pre-wrap text-slate-200">{part.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            <Card className="col-span-4 bg-slate-800 border border-slate-700">
                                <CardHeader className="border-b border-slate-700">
                                    <CardTitle className="text-slate-100">変更点一覧</CardTitle>
                                    <CardDescription className="text-slate-400">クリックで該当箇所にジャンプ</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0 h-full">
                                    <ScrollArea className="h-full rounded-md">
                                        <div className="p-4 space-y-2">
                                            {differences.map((diff, index) => {
                                                if (!diff.added && !diff.removed) return null;
                                                return (
                                                    <div
                                                        key={`diff-${index}`}
                                                        onClick={() => jumpToDiff(index)}
                                                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                                            diff.added ? 'bg-emerald-600/20 hover:bg-emerald-600/30 border-l-4 border-emerald-500' : 
                                                            diff.removed ? 'bg-red-600/20 hover:bg-red-600/30 border-l-4 border-red-500' : 
                                                            'bg-slate-700 hover:bg-slate-600'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-semibold ${diff.added ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                {diff.added ? '追加' : '削除'}
                                                            </span>
                                                            <div className="overflow-hidden">
                                                                <span className="text-sm text-slate-200 block break-words whitespace-pre-wrap">{diff.value}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            <Card className="col-span-4 bg-slate-800 border border-slate-700">
                                <CardHeader className="border-b border-slate-700">
                                    <CardTitle className="text-slate-100 flex items-center justify-between">
                                        <span>比較するファイル</span>
                                        {pdf2 && <span className="text-sm text-slate-400">
                                            {pdf2.name}
                                        </span>}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 h-full">
                                    <ScrollArea 
                                        className="h-full rounded-md"
                                        ref={rightScrollRef}
                                        onWheel={(e) => handleScroll(e, 'right')}
                                    >
                                        <div className="p-4 space-y-2">
                                            {differences.map((part, index) => (
                                                <div 
                                                    key={index}
                                                    id={`new-line-${part.lines2?.[0]}`}
                                                    className={`relative ${
                                                        part.added ? 'bg-emerald-600/20 px-3 py-2 rounded border-l-4 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'px-3 py-2'
                                                    }`}
                                                >
                                                    {part.added && (
                                                        <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-emerald-400 text-sm">
                                                            追加
                                                        </div>
                                                    )}
                                                    <span className="block break-words whitespace-pre-wrap text-slate-200">{part.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
