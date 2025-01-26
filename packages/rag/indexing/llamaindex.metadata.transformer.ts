import { Settings, TextNode, TransformComponent } from "llamaindex";
import OpenAI from "openai";
import { LLM, LLMEnum } from "../settings";
import { codeBlock } from "common-tags";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { logger } from "@repo/logger";
import { getEncoding } from "@langchain/core/utils/tiktoken";

const log = logger.child({
  component: "Llamaindex",
});

const metadataSchema = z.object({
  title: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
  questions: z.array(z.string()),
  entities: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
    })
  ),
});

const prompt = codeBlock`
Extract from the following text:
 - The title of the page
 - A short description of the page (max 100 characters)
 - A list of keywords (max 10)
 - A list of questions that can be answered by the page (max 5)
 - A list of entities that can be extracted from the page (max 5)

{{predefinedData}}
Output the result in JSON format.
`;

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
    if (LLM === LLMEnum.openai) {
      const openai = new OpenAI();
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: zodResponseFormat(metadataSchema, "metadata"),
        max_tokens: 5000,
        temperature: 0.2,

        messages: [
          {
            role: "system",
            content: prompt,
          },
          {
            role: "user",
            content: node.text,
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

      const parsed = JSON.parse(message.content);

      const encoding = await getEncoding("cl100k_base");
      const tokens = encoding.encode(node.text).length;
      node.metadata = {
        ...node.metadata,
        pageTitle: node.metadata.pageTitle || parsed.title,
        pageDescription: node.metadata.pageDescription || parsed.description,
        keywords: parsed.keywords || [],
        questions: parsed.questions || [],
        entities: parsed.entities || [],
        tokens,
      };
    } else {
      throw new Error(`Unsupported LLM: ${LLM}`);
    }
    return node;
  }
}
