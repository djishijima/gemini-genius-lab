
import { Button } from "@/components/ui/button";
import { ClipboardCopy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Editor } from "@tinymce/tinymce-react";
import { useRef, useState } from "react";

interface TranscriptionResultProps {
  transcription: string;
  isTranscribing: boolean;
}

export function TranscriptionResult({ transcription, isTranscribing }: TranscriptionResultProps) {
  const { toast } = useToast();
  const [editedText, setEditedText] = useState('');
  const editorRef = useRef<any>(null);
  
  // Update the edited text when transcription changes
  if (transcription && !editedText && !isTranscribing) {
    setEditedText(transcription);
  }
  
  if (!transcription && !editedText) return null;
  
  const handleCopy = () => {
    const contentToCopy = editorRef.current ? editorRef.current.getContent({ format: 'text' }) : transcription;
    navigator.clipboard.writeText(contentToCopy);
    toast({
      title: "コピー完了",
      description: "文字起こし結果をクリップボードにコピーしました",
    });
  };
  
  return (
    <div className="mt-6 p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold mb-2">文字起こし結果</h3>
      
      {isTranscribing && (
        <div className="text-primary animate-pulse mb-4">文字起こし中...</div>
      )}
      
      <div className="mb-4 bg-background rounded border">
        <Editor
          apiKey="no-api-key"
          onInit={(evt, editor) => editorRef.current = editor}
          initialValue={editedText || transcription}
          value={editedText || transcription}
          onEditorChange={(newText) => setEditedText(newText)}
          init={{
            height: 300,
            menubar: false,
            plugins: [
              'advlist', 'autolink', 'lists', 'link', 'charmap', 'preview',
              'searchreplace', 'visualblocks', 'code', 'fullscreen',
              'insertdatetime', 'media', 'table', 'help', 'wordcount'
            ],
            toolbar: 'undo redo | formatselect | ' +
              'bold italic backcolor | alignleft aligncenter ' +
              'alignright alignjustify | bullist numlist outdent indent | ' +
              'removeformat | help',
            content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
            mobile: {
              theme: 'mobile',
              plugins: 'autosave lists autolink',
              toolbar: 'undo bold italic styles'
            },
            branding: false,
            promotion: false,
            statusbar: false
          }}
        />
      </div>
      
      <div className="flex justify-end mt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
        >
          <ClipboardCopy className="h-4 w-4 mr-2" />
          コピー
        </Button>
      </div>
    </div>
  );
}
