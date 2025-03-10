
import React, { useRef } from 'react';
import { Document, Page } from 'react-pdf';
import { DiffDisplay } from '@/components/pdf-compare/DiffDisplay';
import { DiffList } from '@/components/pdf-compare/DiffList';
import { Difference } from '@/types/pdf-compare';
import { getPdfUrl } from '@/utils/pdfInitializer';
import { useToast } from "@/components/ui/use-toast";

interface TextViewProps {
  pdf1: File | null;
  pdf2: File | null;
  differences: Difference[];
  selectedDiffIndex: number | null;
  setSelectedDiffIndex: (index: number | null) => void;
  numPages1: number;
  numPages2: number;
}

export function TextView({
  pdf1,
  pdf2,
  differences,
  selectedDiffIndex,
  setSelectedDiffIndex,
  numPages1,
  numPages2
}: TextViewProps) {
  const { toast } = useToast();
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, side: "left" | "right") => {
    const scrollTop = (e.target as HTMLDivElement).scrollTop;
    if (side === "left") {
      if (rightScrollRef.current) {
        const rightViewport = rightScrollRef.current.querySelector(
          "[data-radix-scroll-area-viewport]",
        );
        if (rightViewport) {
          rightViewport.scrollTop = scrollTop;
        }
      }
    } else {
      if (leftScrollRef.current) {
        const leftViewport = leftScrollRef.current.querySelector(
          "[data-radix-scroll-area-viewport]",
        );
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
      const container = document.querySelector(".col-span-4>.h-full") as HTMLElement;
      if (container) {
        container.scrollTo({
          top: targetElement.offsetTop - container.offsetHeight / 2,
          behavior: "smooth",
        });
      }
    }

    const targetElement2 = document.getElementById(`right-line-${differences[index].lines2?.[0]}`);
    if (targetElement2) {
      const container = document.querySelectorAll(".col-span-4>.h-full")[1] as HTMLElement;
      if (container) {
        container.scrollTo({
          top: targetElement2.offsetTop - container.offsetHeight / 2,
          behavior: "smooth",
        });
      }
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-28rem)]">
      <div className="col-span-4">
        <h2 className="text-lg font-bold mb-2">元のPDF</h2>
        <div className="pdf-viewer h-[calc(100vh-40rem)] overflow-auto border rounded">
          <Document
            file={getPdfUrl(pdf1)}
            onLoadSuccess={(pdf) => console.log('PDF1読み込み成功:', pdf.numPages, 'ページ')}
            onLoadError={(error) => {
              console.error('PDF1 load error:', error);
              toast({
                title: "PDF読み込みエラー",
                description: `元のPDFの表示に問題が発生しました: ${error?.message || 'unknown error'}`,
                variant: "destructive",
              });
            }}
            options={window.pdfjsOptions}
            loading={<div className='p-4 text-center'>PDFを読み込み中...</div>}
            error={<div className='p-4 text-center text-red-500'>PDFの読み込みに失敗しました。ファイルを確認してください。</div>}
          >
            {Array.from(new Array(numPages1 || 5), (el, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                renderAnnotationLayer={true}
                renderTextLayer={true}
                className="mb-4"
              />
            ))}
          </Document>
        </div>
        <DiffDisplay
          differences={differences}
          title="元のPDF"
          fileName={pdf1?.name}
          side="left"
          selectedDiffIndex={selectedDiffIndex}
          scrollRef={leftScrollRef}
          onScroll={(e) => handleScroll(e, "left")}
        />
      </div>
      <DiffList
        differences={differences}
        selectedDiffIndex={selectedDiffIndex}
        onDiffClick={jumpToDiff}
      />
      <div className="col-span-4">
        <h2 className="text-lg font-bold mb-2">新しいPDF</h2>
        <div className="pdf-viewer h-[calc(100vh-40rem)] overflow-auto border rounded">
          <Document
            file={getPdfUrl(pdf2)}
            onLoadSuccess={(pdf) => console.log('PDF2読み込み成功:', pdf.numPages, 'ページ')}
            onLoadError={(error) => {
              console.error('PDF2 load error:', error);
              toast({
                title: "PDF読み込みエラー",
                description: `新しいPDFの表示に問題が発生しました: ${error?.message || 'unknown error'}`,
                variant: "destructive",
              });
            }}
            options={window.pdfjsOptions}
            loading={<div className='p-4 text-center'>PDFを読み込み中...</div>}
            error={<div className='p-4 text-center text-red-500'>PDFの読み込みに失敗しました。ファイルを確認してください。</div>}
          >
            {Array.from(new Array(numPages2 || 5), (el, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                renderAnnotationLayer={true}
                renderTextLayer={true}
                className="mb-4"
              />
            ))}
          </Document>
        </div>
        <DiffDisplay
          differences={differences}
          title="新しいPDF"
          fileName={pdf2?.name}
          side="right"
          selectedDiffIndex={selectedDiffIndex}
          scrollRef={rightScrollRef}
          onScroll={(e) => handleScroll(e, "right")}
        />
      </div>
    </div>
  );
}
