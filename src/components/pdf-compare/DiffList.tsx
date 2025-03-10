
import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Difference } from "@/types/pdf-compare";
import { Plus, Minus, AlertCircle } from "lucide-react";

interface DiffListProps {
  differences: Difference[];
  selectedDiffIndex: number | null;
  onDiffClick: (index: number) => void;
}

export function DiffList({ differences, selectedDiffIndex, onDiffClick }: DiffListProps) {
  const addedCount = differences.filter((d) => d.added).length;
  const removedCount = differences.filter((d) => d.removed).length;
  
  // フィルター済みの差分リスト（追加または削除のみ）
  const filteredDifferences = differences.filter(diff => diff.added || diff.removed);

  return (
    <Card className="col-span-4 bg-slate-800 border border-slate-700">
      <CardHeader className="border-b border-slate-700 p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center text-red-400 gap-1">
              <Minus size={16} />
              <span>{removedCount} removals</span>
            </div>
            <div className="flex items-center text-emerald-400 gap-1">
              <Plus size={16} />
              <span>{addedCount} additions</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-28rem)] rounded-md">
          <div className="p-2 space-y-1">
            {filteredDifferences.length > 0 ? (
              filteredDifferences.map((diff, index) => {
                const originalIndex = differences.findIndex(d => d === diff);
                const lines = diff.value.split("\n").filter((line) => line.trim() !== "");

                return (
                  <div
                    key={`diff-${originalIndex}`}
                    onClick={() => onDiffClick(originalIndex)}
                    className={`
                      p-2 rounded cursor-pointer transition-colors
                      ${
                        diff.added
                          ? "bg-emerald-600/20 hover:bg-emerald-600/30"
                          : "bg-red-600/20 hover:bg-red-600/30"
                      }
                      ${selectedDiffIndex === originalIndex ? "ring-2 ring-blue-500" : ""}
                    `}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      {diff.added ? (
                        <Plus size={14} className="text-emerald-400" />
                      ) : (
                        <Minus size={14} className="text-red-400" />
                      )}
                      <div className="overflow-hidden text-slate-200">
                        {lines[0]}
                        {lines.length > 1 && (
                          <span className="text-slate-400"> ...and {lines.length - 1} more</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-slate-400">
                <AlertCircle className="mb-2" />
                <p>差分が見つかりませんでした</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
