
import React from 'react';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

interface SimilarityCardProps {
  similarityScore: number;
  addedCount: number;
  removedCount: number;
}

export function SimilarityCard({ similarityScore, addedCount, removedCount }: SimilarityCardProps) {
  return (
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
              <div>追加された箇所: {addedCount}</div>
              <div>削除された箇所: {removedCount}</div>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
