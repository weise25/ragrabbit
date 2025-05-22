import { RateLimitError } from "@repo/core";
import { metadataSchema, normalizeUrlOrNull, RagMetadata } from "@repo/db/schema";
import { logger } from "@repo/logger";
import { codeBlock } from "common-tags";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { env } from "../env.mjs";
import { countTokens } from "../indexing/tokens";

const log = logger.child({
  context: "Scraping",
});

const medatadaList = codeBlock`
 - title: The title of the page, if a title is present use that, but remove brands or other SEO items
 - description: A short description of the page (max 100 characters)
 - parentUrl: The URL of the parent of this page in the TOC, different from the current page URL. 
   - Infer this from any breadcrumbs links or parent/back link that are present ONLY at the top of the page. 
   - Also from a menu or navigation: if the current URL is present, look for the parent link. 
 - keywords: A list of keywords (max 10)
 - questions: A list of questions that can be answered by the page (max 5)
 - entities: A list of entities that can be extracted from the page (max 5)
 `;

const prompt = codeBlock`
Extract informations and format the following HTML body content in Markdown:

Informations to extract:
${medatadaList}

Instructions on how to format the HTML body content in Markdown:
 - don't include \`\`\`markdown at the beginning or end of the output
 - Remove all HTML tags unless they are part of code or pre blocks
 - Remove any Iframe tags
 - Create titles with the # symbol, starting with first level # for the main title, ## for subheadings, etc.
 - If any Image is inside a link, keep the link and replace the image with the ALT text or the word "Image"
 - Remove empty links
 - Remove any content that seems to be a header, footer or navigation menu, or breadcrumbs
 - Remove any content that seems to be a social media share button, or comment section, or Github or other social media links
 - Remove Edit this guide or other similar content
 - Remove Next, Previous, or other navigation links
 
The page url is: {{url}}
The page title is: {{title}}

Output the extracted information in JSON, and the content in Markdown format, eg:

---
{
  "title": "My page title",
  "description": "My page description",
  "parentUrl": "https://my-parent-page.com",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "questions": ["question1", "question2", "question3"],
  "entities": [{ "name": "entity1", "type": "type1" }, { "name": "entity2", "type": "type2" }]
}
---

# My page title

...content formatted in markdown...
`;

const medatadaPrompt = codeBlock`
Extract from the following web page in markdown format:
${medatadaList}

Current page url: {{url}}

Output the result in JSON format.
`;

export async function reformatAndExtractMetaLLM(
  text: string,
  url: string,
  title: string
): Promise<{ content: string; metadata: Partial<RagMetadata> } | undefined> {
  if (!env.OPENAI_API_KEY) {
    throw new Error(`OPENAI_API_KEY is required to get metadata`);
  }

  log.info("Reformatting content with LLM");

  try {
    const openai = new OpenAI({
  baseURL: process.env.OPENAI_API_BASE_URL || "https://api.kluster.ai/v1"
});
    const promptMessages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: prompt.replace("{{url}}", url || "").replace("{{title}}", title || ""),
      },
      {
        role: "user",
        content: text,
      },
    ];

    const response = await openai.chat.completions.create({
      model: "google/gemma-3-27b-it",
      temperature: 0.1,

      messages: promptMessages,
    });

    let message = response.choices[0].message;
    let responseContent = message.content;
    let responseContinuation = null;
    if (response.choices?.[0]?.finish_reason === "length") {
      log.info("Asking for continuation");
      // Ask for continuation:
      responseContinuation = await openai.chat.completions.create({
        model: "google/gemma-3-27b-it",
        temperature: 0.1,
        messages: [
          ...promptMessages,
          {
            role: message.role,
            content: message.content,
          },
          {
            role: "user",
            content: "Continue the content...",
          },
        ],
      });

      if (responseContinuation.choices?.[0]?.finish_reason === "length") {
        console.error({ responseContinuation }, "Failed to continue content");
        return;
      }

      message = responseContinuation.choices[0].message;
      responseContent += message.content;
    }

    if (message.refusal) {
      console.error("Failed to reformat content with LLM", {
        refusal: message.refusal,
        message,
      });
      return;
    }

    const promptTokens = (response.usage?.prompt_tokens ?? 0) + (responseContinuation?.usage?.prompt_tokens ?? 0);
    const completionTokens =
      (response.usage?.completion_tokens ?? 0) + (responseContinuation?.usage?.completion_tokens ?? 0);
    log.debug(
      {
        promptTokens,
        completionTokens,
        cost: (promptTokens * (0.015 / 1_000_000) + completionTokens * (0.6 / 1_000_000)).toFixed(4),
      },
      "Reformatted content with LLM"
    );

    const startIndex = responseContent.indexOf("---") + 3;
    const endIndex = responseContent.indexOf("---", startIndex);

    if (startIndex === -1 || endIndex === -1) {
      log.warn({ message }, "Failed to find metadata markers");
      return;
    }

    const content = responseContent.substring(endIndex + 3).trim();

    const jsonPart = responseContent.substring(startIndex, endIndex).trim();
    const parsed = metadataSchema.parse(JSON.parse(jsonPart));
    return {
      content,
      metadata: {
        pageTitle: parsed.title,
        pageDescription: parsed.description,
        pageParentUrl: normalizeUrlOrNull(parsed.parentUrl, url),
        keywords: parsed.keywords || [],
        questions: parsed.questions || [],
        entities: (parsed.entities as any) || [],
        tokens: await countTokens(content),
      },
    };
  } catch (e) {
    if (e instanceof OpenAI.RateLimitError) {
      throw new RateLimitError("OpenAI Rate limit reached");
    }
    throw e;
  }
}

export async function extractMetadataLLM(text: string, url: string): Promise<Partial<RagMetadata> | undefined> {
  if (!env.OPENAI_API_KEY) {
    throw new Error(`OPENAI_API_KEY is required to get metadata`);
  }

  log.debug({ url, bytes: text.length }, "Extracting metadata with LLM");
  const openai = new OpenAI({
  baseURL: process.env.OPENAI_API_BASE_URL || "https://api.kluster.ai/v1"
});
  try {
    const response = await openai.chat.completions.create({
      model: "google/gemma-3-27b-it",
      response_format: zodResponseFormat(metadataSchema, "metadata"),
      max_tokens: 5000,
      temperature: 0.2,

      messages: [
        {
          role: "system",
          content: medatadaPrompt.replace("{{url}}", url || ""),
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
  } catch (e) {
    if (e instanceof OpenAI.RateLimitError) {
      throw new RateLimitError("OpenAI Rate limit reached");
    }
    throw e;
  }
}
