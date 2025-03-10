"use client";

import { ScrollArea } from "@repo/design/shadcn/scroll-area";
import Markdown from "@repo/design/components/chat/markdown";

export interface MarkdownViewerProps {
  content: string;
  isMarkdown: boolean;
}

export function MarkdownViewer({ content, isMarkdown }: MarkdownViewerProps) {
  return (
    <ScrollArea className="h-[500px] w-full rounded-md border p-4">
      {isMarkdown ? (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <Markdown>{content}</Markdown>
        </div>
      ) : (
        <pre className="text-sm whitespace-pre-wrap font-mono">{content}</pre>
      )}
    </ScrollArea>
  );
}
