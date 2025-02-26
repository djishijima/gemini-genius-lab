
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Difference } from '@/pages/PdfCompare';
import { Minus, Plus } from 'lucide-react';

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
  const totalLines = differences.reduce((acc, curr) => {
    return acc + (curr.value.split('\n').length - 1);
  }, 0);

  const changesCount = differences.filter(d => 
    side === 'left' ? d.removed : d.added
  ).length;

  return (
    <Card className="col-span-4 bg-slate-800 border border-slate-700">
      <CardHeader className="border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {side === 'left' ? (
                <div className="flex items-center text-red-400 gap-1">
                  <Minus size={16} />
                  <span>{changesCount} removals</span>
                </div>
              ) : (
                <div className="flex items-center text-emerald-400 gap-1">
                  <Plus size={16} />
                  <span>{changesCount} additions</span>
                </div>
              )}
            </div>
            <div className="text-slate-400 text-sm">
              {totalLines} lines
            </div>
          </div>
          {fileName && <span className="text-sm text-slate-400">{fileName}</span>}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea 
          className="h-[calc(100vh-28rem)] rounded-md"
          ref={scrollRef}
          onScroll={onScroll}
        >
          <div className="relative">
            {differences.map((part, index) => {
              const lines = part.value.split('\n');
              const lineNumbers = side === 'left' ? part.lines1 : part.lines2;
              
              return lines.map((line, lineIndex) => {
                if (lineIndex === lines.length - 1 && line === '') return null;
                
                const isModified = (side === 'left' && part.removed) || (side === 'right' && part.added);
                const lineNumber = lineNumbers?.[lineIndex] || '';
                
                return (
                  <div 
                    key={`${side}-${index}-${lineIndex}`}
                    className={`flex ${
                      isModified 
                        ? side === 'left'
                          ? 'bg-red-600/20'
                          : 'bg-emerald-600/20'
                        : ''
                    } ${selectedDiffIndex === index ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div className="w-12 flex-shrink-0 text-right pr-2 py-1 text-slate-500 select-none border-r border-slate-700 bg-slate-900/50">
                      {lineNumber}
                    </div>
                    <div className="px-4 py-1 w-full overflow-x-auto whitespace-pre text-slate-200">
                      {line}
                    </div>
                  </div>
                );
              }).filter(Boolean);
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
