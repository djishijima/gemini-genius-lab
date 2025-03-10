
import React, { useState, useCallback } from 'react';
import { Difference, ChatMessage } from '@/types/pdf-compare';

interface ChatViewProps {
  differences: Difference[];
  similarityScore: number;
  pdf1Text: string;
  pdf2Text: string;
  initialMessages?: ChatMessage[];
}

export function ChatView({ 
  differences,
  similarityScore,
  pdf1Text,
  pdf2Text,
  initialMessages = []
}: ChatViewProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialMessages.length > 0 
    ? initialMessages 
    : [{ 
        role: 'assistant', 
        content: `2つのPDFを比較しました。類似度は${Math.round(similarityScore * 100)}%です。差分は${differences.filter(d => d.added || d.removed).length}箇所あります。詳細について質問してください。` 
      }]
  );
  const [userInput, setUserInput] = useState('');

  // ユーザーメッセージを送信し、AI応答を生成する関数
  const handleSendMessage = useCallback(() => {
    if (!userInput.trim() || !differences.length) return;
    
    // ユーザーメッセージを追加
    const newMessages = [
      ...chatMessages,
      { role: 'user', content: userInput }
    ];
    setChatMessages(newMessages);
    setUserInput('');
    
    // AI応答を生成
    setTimeout(() => {
      const aiResponse = generateAiResponse(userInput, differences, similarityScore, pdf1Text, pdf2Text);
      setChatMessages(prevMessages => [...prevMessages, { role: 'assistant', content: aiResponse }]);
    }, 500);
  }, [userInput, chatMessages, differences, similarityScore, pdf1Text, pdf2Text]);

  return (
    <div className="mt-4 flex flex-col h-[calc(100vh-30rem)]">
      <div className="flex-grow overflow-auto border rounded p-4 bg-gray-50">
        {chatMessages.map((message, index) => (
          <div
            key={index}
            className={`mb-4 p-3 rounded-lg ${
              message.role === 'user' 
                ? 'bg-blue-100 ml-12' 
                : 'bg-white mr-12 border'
            }`}
          >
            <div className="font-bold mb-1">
              {message.role === 'user' ? "あなた" : "AIアシスタント"}
            </div>
            <div className="whitespace-pre-wrap">
              {message.content}
            </div>
          </div>
        ))}
      </div>
      <div className="flex mt-4">
        <textarea
          className="flex-grow p-2 border rounded"
          placeholder="質問を入力してください..."
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          rows={2}
        />
        <button
          className="ml-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          onClick={handleSendMessage}
          disabled={!userInput.trim() || !differences.length}
        >
          送信
        </button>
      </div>
    </div>
  );
}

// AI応答を生成する関数
function generateAiResponse(query: string, diffs: Difference[], score: number, text1: string, text2: string): string {
  const queryLower = query.toLowerCase();
  
  // 主要な差分を抽出
  const addedDiffs = diffs.filter(d => d.added).map(d => d.value);
  const removedDiffs = diffs.filter(d => d.removed).map(d => d.value);
  
  // クエリタイプに応じた応答の生成
  if (queryLower.includes('類似') || queryLower.includes('似てる') || queryLower.includes('似ている')) {
    return `類似度は${Math.round(score * 100)}%です。\n` + 
           `${score > 0.9 ? 'とても似ています。' : score > 0.7 ? 'やや似ています。' : score > 0.5 ? '部分的に似ています。' : 'あまり似ていません。'}`;
  }
  
  if (queryLower.includes('追加') || queryLower.includes('加え')) {
    if (addedDiffs.length === 0) {
      return '新しいドキュメントに追加された重要なテキストは見つかりませんでした。';
    }
    
    let response = `新しいドキュメントには${addedDiffs.length}箇所の追加があります。主な追加内容：\n`;
    addedDiffs.slice(0, 5).forEach((diff, i) => {
      response += `${i+1}. ${diff.substring(0, 100)}${diff.length > 100 ? '...' : ''}\n`;
    });
    return response;
  }
  
  if (queryLower.includes('削除') || queryLower.includes('除去')) {
    if (removedDiffs.length === 0) {
      return '元のドキュメントから削除された重要なテキストは見つかりませんでした。';
    }
    
    let response = `元のドキュメントから${removedDiffs.length}箇所の削除があります。主な削除内容：\n`;
    removedDiffs.slice(0, 5).forEach((diff, i) => {
      response += `${i+1}. ${diff.substring(0, 100)}${diff.length > 100 ? '...' : ''}\n`;
    });
    return response;
  }
  
  if (queryLower.includes('要約') || queryLower.includes('サマリ')) {
    return `2つのドキュメントの比較サマリー：\n` +
           `- 類似度: ${Math.round(score * 100)}%\n` +
           `- 追加された箇所: ${addedDiffs.length}\n` +
           `- 削除された箇所: ${removedDiffs.length}\n` +
           `- 主な変更点: ${diffs.filter(d => d.added || d.removed).length > 0 ? 
             '文書の構成や内容に変更があります。' : '主に書式や小さな変更のみです。'}`;
  }
  
  // デフォルトの応答
  return `2つのPDFを比較した結果、類似度は${Math.round(score * 100)}%、${diffs.filter(d => d.added || d.removed).length}箇所の差分があります。\n` +
         `具体的な内容について質問する場合は、「追加された内容は？」「削除された内容は？」「要約してください」などと質問してください。`;
}
