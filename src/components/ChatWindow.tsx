
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";

interface Message {
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatWindowProps {
  onCommand: (command: string) => void;
  isLoading: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ onCommand, isLoading }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      content: "原稿の確認や修正のお手伝いをさせていただきます。PDFファイルをアップロードするか、ご要望をお聞かせください。\n\n以下のような指示ができます：\n・PDFファイルを読み込む\n・原稿全体の要約を見る\n・修正指示を整理する\n・句読点をチェックする\n・確認ポイントを抽出する",
      type: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage: Message = {
      content: input,
      type: 'user',
      timestamp: new Date()
    };
    setMessages([...messages, newMessage]);
    onCommand(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <ScrollArea className="flex-1 p-4 h-[600px]">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground ml-4'
                    : 'bg-muted mr-4'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3 mr-4">
                <p className="text-sm">処理中...</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <CardContent className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="メッセージを入力..."
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatWindow;
