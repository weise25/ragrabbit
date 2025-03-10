import { Settings, TextNode, TransformComponent } from "llamaindex";
import OpenAI from "openai";
import { LLM, LLMEnum } from "../settings";
import { codeBlock } from "common-tags";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { logger } from "@repo/logger";
import { env } from "../env.mjs";
import { metadataSchema, RagMetadata } from "@repo/db/schema";
import { countTokens } from "./tokens";
import { normalizeUrl, normalizeUrlOrNull } from "@repo/db/schema";

const log = logger.child({
  component: "Llamaindex",
});

const prompt = codeBlock`
Extract from the following web page in markdown format:
 - title: The title of the page, if a title is present use that, but remove brands or other SEO items
 - description: A short description of the page (max 100 characters)
 - parentUrl: The URL of the parent of this page in the TOC, different from the current page URL. Infer this from any breadcrumbs links or parent/back link that are present ONLY at the top of the page. If unsure, leave it empty.
 - keywords: A list of keywords (max 10)
 - questions: A list of questions that can be answered by the page (max 5)
 - entities: A list of entities that can be extracted from the page (max 5)

Current page url: {{url}}

Output the result in JSON format.
`;

export async function extractMetadata(text: string, url: string): Promise<Partial<RagMetadata> | undefined> {
  if (!env.OPENAI_API_KEY) {
    throw new Error(`OPENAI_API_KEY is required to get metadata`);
  }

  const openai = new OpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: zodResponseFormat(metadataSchema, "metadata"),
    max_tokens: 5000,
    temperature: 0.2,

    messages: [
      {
        role: "system",
        content: prompt.replace("{{url}}", url || ""),
      },
      {
        role: "user",
        content: text,
      },
    ],
  });
  const message = response.choices[0].message;
  if (message.refusal) {
    log.warn(
      {
        refusal: message.refusal,
        message,
      },
      "Failed to parse metadata"
    );
    return;
  }

  const parsed = metadataSchema.parse(JSON.parse(message.content));
  return {
    pageTitle: parsed.title,
    pageDescription: parsed.description,
    pageParentUrl: normalizeUrlOrNull(parsed.parentUrl, url),
    keywords: parsed.keywords || [],
    questions: parsed.questions || [],
    entities: (parsed.entities as any) || [],
    tokens: await countTokens(text),
  };
}

export class LlamaindexMetadataTransformer extends TransformComponent {
  constructor() {
    super(async (nodes) => {
      return await this.transform(nodes as TextNode[]);
    });
  }

  async transform(nodes: TextNode[]): Promise<TextNode[]> {
    for (const node of nodes) {
      await this.transform_node(node);
    }

    return nodes;
  }

  async transform_node(node: TextNode): Promise<TextNode> {
    const metadata = await extractMetadata(node.text, "http://foo.com/");
    node.metadata = {
      ...node.metadata,
      ...metadata,
      pageTitle: node.metadata?.pageTitle || metadata.pageTitle,
      pageDescription: node.metadata?.pageDescription || metadata.pageDescription,
    };
    return node;
  }
}
