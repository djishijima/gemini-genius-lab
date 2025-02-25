
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Difference } from '@/types/pdf-compare';

interface ComparisonViewProps {
  pdf1Text: string;
  pdf2Text: string;
  differences: Difference[];
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
}

export function ComparisonView({ pdf1Text, pdf2Text, differences, onScroll }: ComparisonViewProps) {
  return (
    <Card className="pdf-comparison-view">
      <CardHeader>
        <CardTitle>PDF比較ビュー</CardTitle>
        <CardDescription>
          左側が元のPDF、右側が新しいPDFの内容です。変更箇所は色分けされています。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">元のPDF</h3>
            <div
              className="left-content bg-gray-50 p-4 rounded-lg overflow-auto max-h-[600px]"
              onScroll={onScroll}
            >
              {pdf1Text.split('\n').map((line, index) => {
                const isDiffStart = differences.some(diff =>
                  diff.removed && diff.value && pdf1Text.includes(diff.value) && 
                  pdf1Text.indexOf(diff.value) === pdf1Text.split('\n').slice(0, index + 1).join('\n').indexOf(diff.value)
                );
                return (
                  <div
                    key={`original-${index}`}
                    className={`mb-2 ${isDiffStart ? 'bg-red-100 p-2 rounded' : ''}`}
                  >
                    {line}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">新しいPDF</h3>
            <div
              className="right-content bg-gray-50 p-4 rounded-lg overflow-auto max-h-[600px]"
              onScroll={onScroll}
            >
              {pdf2Text.split('\n').map((line, index) => {
                const isDiffStart = differences.some(diff =>
                  diff.added && diff.value && pdf2Text.includes(diff.value) && 
                  pdf2Text.indexOf(diff.value) === pdf2Text.split('\n').slice(0, index + 1).join('\n').indexOf(diff.value)
                );
                return (
                  <div
                    key={`new-${index}`}
                    className={`mb-2 ${isDiffStart ? 'bg-green-100 p-2 rounded' : ''}`}
                  >
                    {line}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
