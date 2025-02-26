
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Difference } from '@/pages/PdfCompare';

interface DiffListProps {
  differences: Difference[];
  selectedDiffIndex: number | null;
  onDiffClick: (index: number) => void;
}

export function DiffList({ differences, selectedDiffIndex, onDiffClick }: DiffListProps) {
  return (
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
              const isSelected = selectedDiffIndex === index;
              return (
                <div
                  key={`diff-${index}`}
                  onClick={() => onDiffClick(index)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    diff.added ? 'bg-emerald-600/20 hover:bg-emerald-600/30 border-l-4 border-emerald-500' : 
                    diff.removed ? 'bg-red-600/20 hover:bg-red-600/30 border-l-4 border-red-500' : 
                    'bg-slate-700 hover:bg-slate-600'
                  } ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
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
  );
}
