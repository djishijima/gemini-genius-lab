
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { DisplayMode } from "@/types/pdf-compare";

interface PdfCompareControlsProps {
  loading: boolean;
  progress: number;
  displayMode: 'overlay' | 'side-by-side';
  setDisplayMode: (mode: 'overlay' | 'side-by-side') => void;
  comparePdfs: () => void;
  showSimilarity: boolean;
  setShowSimilarity: (show: boolean) => void;
  canCompare: boolean;
  displayModes: DisplayMode[];
}

export function PdfCompareControls({
  loading,
  progress,
  displayMode,
  setDisplayMode,
  comparePdfs,
  showSimilarity,
  setShowSimilarity,
  canCompare,
  displayModes
}: PdfCompareControlsProps) {
  return (
    <>
      <Button
        className="compare-button w-full bg-gradient-to-r from-[#0EA5E9] to-[#8B5CF6] hover:from-[#0284C7] hover:to-[#7C3AED] text-white font-bold text-lg py-6 shadow-lg transform transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] active:scale-[0.98]"
        onClick={comparePdfs}
        disabled={loading || !canCompare}
      >
        {loading ? (
          <>
            比較中...
            <Progress value={progress} className="mt-2" />
          </>
        ) : (
          "比較する"
        )}
      </Button>
      
      {/* 差分表示コントロール */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setShowSimilarity(!showSimilarity)}
            className="text-slate-200"
          >
            類似度表示: {showSimilarity ? "非表示" : "表示"}
          </Button>
          <div className="flex items-center space-x-2 border rounded-md p-1">
            {displayModes.map(mode => {
              return (
                <Button
                  key={mode.id}
                  variant={displayMode === mode.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setDisplayMode(mode.id)}
                  className="flex items-center"
                  title={mode.tooltip}
                  style={{
                    position: 'relative',
                    boxShadow: displayMode === mode.id ? 'none' : '0 0 0 1px #e9ecef',
                    background: displayMode === mode.id ? undefined : 'rgba(237, 242, 247, 0.2)',
                  }}
                >
                  <mode.icon className="mr-1 h-4 w-4" />
                  {mode.label}
                  {/* 新機能マーカーを削除 */}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
