import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Difference } from "@/types/pdf-compare";

interface DifferencesListProps {
  differences: Difference[];
  onDiffClick: (index: number) => void;
}

export function DifferencesList({ differences, onDiffClick }: DifferencesListProps) {
  return (
    <Card className="differences-list">
      <CardHeader>
        <CardTitle>変更箇所一覧</CardTitle>
        <CardDescription>クリックすると該当箇所にジャンプします</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {differences.map((diff, index) => (
            <div
              key={index}
              onClick={() => onDiffClick(index)}
              className={`
                p-3 rounded-lg cursor-pointer transition-colors
                ${
                  diff.added
                    ? "bg-green-50 hover:bg-green-100"
                    : diff.removed
                      ? "bg-red-50 hover:bg-red-100"
                      : "bg-gray-50 hover:bg-gray-100"
                }
              `}
            >
              <div className="flex items-center gap-2">
                {diff.added && <span className="text-green-600 font-semibold">追加:</span>}
                {diff.removed && <span className="text-red-600 font-semibold">削除:</span>}
                <span className="text-sm truncate">{diff.value}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
