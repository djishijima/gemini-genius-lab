
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface ApiKeyInputProps {
  apiKey: string;
  onChange: (value: string) => void;
}

export function ApiKeyInput({ apiKey, onChange }: ApiKeyInputProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor="apiKey">Google Cloud APIキー</Label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setShowApiKey(!showApiKey)}
        >
          {showApiKey ? (
            <EyeOff className="h-3 w-3" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
        </Button>
      </div>
      <div className={!showApiKey ? "password-input" : ""}>
        <Textarea
          id="apiKey"
          value={apiKey}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Google Cloud APIキーを入力してください"
          className="min-h-[40px] max-h-[40px] font-mono text-sm resize-none"
        />
      </div>
    </div>
  );
}
