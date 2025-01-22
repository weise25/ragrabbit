import { useMemo } from "react";
import { SourceBoxList } from "@repo/design/components/chat/source-box";
import type { NodeWithScore, Metadata } from "@repo/rag/llamaindex.mjs";

export function extractSourcesData(sources: NodeWithScore<Metadata>[]) {
  return sources
    .filter((source, index, self) => {
      return self.findIndex((t) => t.node.metadata.pageUrl === source.node.metadata.pageUrl) === index;
    })
    .map((source) => {
      const abstract =
        source.node.metadata.pageDescription ||
        source.node.metadata.sectionSummary ||
        source.node.getContent("NONE" as any);
      return {
        title: source.node.metadata.pageTitle || abstract,
        url: source.node.metadata.pageUrl,
        score: source.score,
        abstract,
      };
    });
}

export default function SourcesList(props: { sources: NodeWithScore<Metadata>[] }) {
  const sources = useMemo(() => {
    return extractSourcesData(props.sources);
  }, [props.sources]);

  return <SourceBoxList className="h-40 mb-6 -my-1.5" sources={sources} />;
}
