import React, { useState, useRef } from 'react';
import { diffWords } from 'diff';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as pdfjsLib from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';
import { PDFInputSection } from '@/components/pdf-compare/PDFInputSection';
import { SimilarityCard } from '@/components/pdf-compare/SimilarityCard';
import { DiffDisplay } from '@/components/pdf-compare/DiffDisplay';
import { DiffList } from '@/components/pdf-compare/DiffList';
import 'pdfjs-dist/build/pdf.worker.entry';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

export interface Difference {
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
    const leftScrollRef = useRef<HTMLDivElement>(null);
    const rightScrollRef = useRef<HTMLDivElement>(null);
    const [leftScrollTop, setLeftScrollTop] = useState(0);
    const [rightScrollTop, setRightScrollTop] = useState(0);
    const [selectedDiffIndex, setSelectedDiffIndex] = useState<number | null>(null);
    const [showSimilarity, setShowSimilarity] = useState(true);

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

    const handleScroll = (e: React.UIEvent<HTMLDivElement>, side: 'left' | 'right') => {
        const scrollTop = (e.target as HTMLDivElement).scrollTop;
        if (side === 'left') {
            setLeftScrollTop(scrollTop);
            if (rightScrollRef.current) {
                const rightViewport = rightScrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
                if (rightViewport) {
                    rightViewport.scrollTop = scrollTop;
                }
            }
        } else {
            setRightScrollTop(scrollTop);
            if (leftScrollRef.current) {
                const leftViewport = leftScrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
                if (leftViewport) {
                    leftViewport.scrollTop = scrollTop;
                }
            }
        }
    };

    const jumpToDiff = (index: number) => {
        setSelectedDiffIndex(index);

        const targetElement = document.getElementById(`left-line-${differences[index].lines1?.[0]}`);
        if (targetElement) {
            const container = document.querySelector('.col-span-4>.h-full') as HTMLElement;
            if (container) {
                container.scrollTo({
                    top: targetElement.offsetTop - (container.offsetHeight / 2),
                    behavior: 'smooth'
                });
            }
        }

        const targetElement2 = document.getElementById(`right-line-${differences[index].lines2?.[0]}`);
        if (targetElement2) {
            const container = document.querySelectorAll('.col-span-4>.h-full')[1] as HTMLElement;
            if (container) {
                container.scrollTo({
                    top: targetElement2.offsetTop - (container.offsetHeight / 2),
                    behavior: 'smooth'
                });
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
                    <PDFInputSection
                        title="元のテキスト/PDF"
                        description="テキストを入力またはPDFを選択"
                        text={text1}
                        onTextChange={setText1}
                        pdf={pdf1}
                        onPdfChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setPdf1(file);
                            if (file) extractFileContent(file).then(setText1);
                        }}
                        inputRef={fileInput1Ref}
                    />
                    <PDFInputSection
                        title="新しいテキスト/PDF"
                        description="テキストを入力またはPDFを選択"
                        text={text2}
                        onTextChange={setText2}
                        pdf={pdf2}
                        onPdfChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setPdf2(file);
                            if (file) extractFileContent(file).then(setText2);
                        }}
                        inputRef={fileInput2Ref}
                    />
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
                        <div className="flex items-center justify-between">
                            <Button 
                                variant="outline" 
                                onClick={() => setShowSimilarity(!showSimilarity)}
                                className="text-slate-200"
                            >
                                類似度表示: {showSimilarity ? '非表示' : '表示'}
                            </Button>
                        </div>

                        {showSimilarity && (
                            <SimilarityCard
                                similarityScore={similarityScore}
                                addedCount={differences.filter(d => d.added).length}
                                removedCount={differences.filter(d => d.removed).length}
                            />
                        )}

                        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-28rem)]">
                            <DiffDisplay
                                title="参照ファイル"
                                fileName={pdf1?.name}
                                differences={differences}
                                selectedDiffIndex={selectedDiffIndex}
                                scrollRef={leftScrollRef}
                                onScroll={(e) => handleScroll(e, 'left')}
                                side="left"
                            />
                            <DiffList
                                differences={differences}
                                selectedDiffIndex={selectedDiffIndex}
                                onDiffClick={jumpToDiff}
                            />
                            <DiffDisplay
                                title="比較するファイル"
                                fileName={pdf2?.name}
                                differences={differences}
                                selectedDiffIndex={selectedDiffIndex}
                                scrollRef={rightScrollRef}
                                onScroll={(e) => handleScroll(e, 'right')}
                                side="right"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
