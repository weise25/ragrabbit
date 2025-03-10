"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import "katex/dist/katex.min.css";

export default function EasyMarkdown({ children }: { children: string }) {
  const markdownOpts = {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [],
  };
  return (
    <Markdown className="prose max-w-full" {...markdownOpts}>
      {children}
    </Markdown>
  );
}
