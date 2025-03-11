
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus, Minus } from "lucide-react";

interface SimilarityCardProps {
  similarityScore: number;
  addedCount: number;
  removedCount: number;
}

export function SimilarityCard({ similarityScore, addedCount, removedCount }: SimilarityCardProps) {
  const similarityPercentage = Math.round(similarityScore * 100);
  const totalChanges = addedCount + removedCount;
  
  // テキストの類似度に基づいた色を決定
  const getColorClass = () => {
    if (similarityPercentage >= 95) return "bg-emerald-500";
    if (similarityPercentage >= 80) return "bg-green-500";
    if (similarityPercentage >= 60) return "bg-yellow-500";
    if (similarityPercentage >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-r from-slate-800 to-slate-900">
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">類似度</h3>
            <span className="text-3xl font-bold text-white">{similarityPercentage}%</span>
          </div>
          
          <Progress 
            value={similarityPercentage} 
            className="h-2"
            indicatorColor={getColorClass()}
          />
          
          <div className="flex justify-between mt-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-red-500/20 text-red-500">
                <Minus size={14} />
              </div>
              <div>
                <p className="text-white">削除</p>
                <p className="text-xl font-bold text-white">{removedCount}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-emerald-500/20 text-emerald-500">
                <Plus size={14} />
              </div>
              <div>
                <p className="text-white">追加</p>
                <p className="text-xl font-bold text-white">{addedCount}</p>
              </div>
            </div>
            
            <div>
              <p className="text-white">合計変更</p>
              <p className="text-xl font-bold text-white">{totalChanges}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
