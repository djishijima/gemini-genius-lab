import { Button } from "@/components/ui/button";
import { ClipboardCopy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Editor, IAllProps } from "@tinymce/tinymce-react";
import { useRef, useState, useEffect } from "react";
import { Editor as TinyMCEEditor } from "tinymce";

interface TranscriptionResultProps {
  transcription: string;
  isTranscribing: boolean;
}

export function TranscriptionResult({ transcription, isTranscribing }: TranscriptionResultProps) {
  const { toast } = useToast();
  const [editedText, setEditedText] = useState("");
  const editorRef = useRef<TinyMCEEditor | null>(null);

  // Update the edited text when transcription changes
  useEffect(() => {
    if (transcription && !isTranscribing) {
      setEditedText((prev) => (prev ? prev + transcription : transcription));
    }
  }, [transcription, isTranscribing]);

  const handleCopy = () => {
    const contentToCopy = editorRef.current
      ? editorRef.current.getContent({ format: "text" })
      : editedText;
    navigator.clipboard.writeText(contentToCopy);
    toast({
      title: "コピー完了",
      description: "文字起こし結果をクリップボードにコピーしました",
    });
  };

  return (
    <div className="mt-6 p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold mb-2">文字起こし結果</h3>

      {isTranscribing && <div className="text-primary animate-pulse mb-4">文字起こし中...</div>}

      <div className="mb-4 bg-background rounded border min-h-[300px]">
        <Editor
          apiKey="no-api-key"
          onInit={(evt, editor) => (editorRef.current = editor)}
          initialValue={editedText || "ここに文字起こし結果が表示されます..."}
          value={editedText || ""}
          onEditorChange={(newText) => setEditedText(newText)}
          init={{
            height: 300,
            menubar: false,
            plugins: [
              "advlist",
              "autolink",
              "lists",
              "link",
              "charmap",
              "preview",
              "searchreplace",
              "visualblocks",
              "code",
              "fullscreen",
              "insertdatetime",
              "media",
              "table",
              "help",
              "wordcount",
            ],
            toolbar:
              "undo redo | formatselect | " +
              "bold italic backcolor | alignleft aligncenter " +
              "alignright alignjustify | bullist numlist outdent indent | " +
              "removeformat | help",
            content_style: "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
            mobile: {
              theme: "mobile",
              plugins: "autosave lists autolink",
              toolbar: "undo bold italic styles",
            },
            branding: false,
            promotion: false,
            statusbar: false,
            placeholder: "ここに文字起こし結果が表示されます...",
          }}
        />
      </div>

      <div className="flex justify-end mt-2">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          <ClipboardCopy className="h-4 w-4 mr-2" />
          コピー
        </Button>
      </div>
    </div>
  );
}
