
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Difference } from '@/pages/PdfCompare';

interface DiffDisplayProps {
  title: string;
  fileName?: string;
  differences: Difference[];
  selectedDiffIndex: number | null;
  scrollRef: React.RefObject<HTMLDivElement>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  side: 'left' | 'right';
}

export function DiffDisplay({
  title,
  fileName,
  differences,
  selectedDiffIndex,
  scrollRef,
  onScroll,
  side
}: DiffDisplayProps) {
  return (
    <Card className="col-span-4 bg-slate-800 border border-slate-700">
      <CardHeader className="border-b border-slate-700">
        <CardTitle className="text-slate-100 flex items-center justify-between">
          <span>{title}</span>
          {fileName && <span className="text-sm text-slate-400">{fileName}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-full">
        <ScrollArea 
          className="h-full rounded-md"
          ref={scrollRef}
          onScroll={onScroll}
        >
          <div className="p-4 space-y-2">
            {differences.map((part, index) => (
              <div 
                key={`${side}-${index}`}
                id={`${side}-line-${side === 'left' ? part.lines1?.[0] : part.lines2?.[0]}`}
                className={`relative ${
                  side === 'left' 
                    ? (part.removed ? 'bg-red-600/20 px-3 py-2 rounded border-l-4 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'px-3 py-2')
                    : (part.added ? 'bg-emerald-600/20 px-3 py-2 rounded border-l-4 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'px-3 py-2')
                } ${selectedDiffIndex === index ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
              >
                {((side === 'left' && part.removed) || (side === 'right' && part.added)) && (
                  <div className={`absolute -left-8 top-1/2 -translate-y-1/2 ${side === 'left' ? 'text-red-400' : 'text-emerald-400'} text-sm`}>
                    {side === 'left' ? '削除' : '追加'}
                  </div>
                )}
                <span className="block break-words whitespace-pre-wrap text-slate-200">{part.value}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
