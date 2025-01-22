import { Anthropic, Groq, OpenAI, OpenAIEmbedding, Settings } from "llamaindex";
import { HuggingFaceEmbedding } from "llamaindex";
import { env } from "./env.mjs";

export enum EmbeddingModel {
  openai = "openai",
  baai = "BAAI/bge-small-en-v1.5",
  xenova = "Xenova/all-MiniLM-L6-v2",
}

export const chunkSize = {
  [EmbeddingModel.openai]: 1024,
  [EmbeddingModel.baai]: 512,
  [EmbeddingModel.xenova]: 512,
};

Settings.chunkSize = chunkSize[EmbeddingModel[env.EMBEDDING_MODEL || "openai"]] || 512;

let llm;
if (env.LLM_MODEL === "groq") {
  llm = "Groq";

  // Fix: Llamaindex ignores the maxTokens setting, so we need to set the contextWindow manually:
  class GroqFixed extends Groq {
    get metadata() {
      const metadata = super.metadata;
      metadata.contextWindow = 6000; // Due to token per minut limits
      return metadata;
    }
  }

  Settings.llm = new GroqFixed({
    apiKey: env.GROQ_API_KEY,
    model: "llama-3.3-70b-versatile",
    maxTokens: 6000,
    additionalChatOptions: {
      max_completion_tokens: 32_768,
    },
  });
} else if (env.LLM_MODEL === "anthropic") {
  llm = "Anthropic";
  Settings.llm = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
} else {
  llm = "OpenAI";
  Settings.llm = new OpenAI({
    model: "gpt-4o-mini",
    ...(env.OPENAI_API_BASE_URL ? { baseURL: env.OPENAI_API_BASE_URL } : {}),
  });
}

const embeddingModel = EmbeddingModel[env.EMBEDDING_MODEL];
if (embeddingModel === EmbeddingModel.openai) {
  Settings.embedModel = new OpenAIEmbedding();
} else {
  Settings.embedModel = new HuggingFaceEmbedding({
    modelType: embeddingModel,
  });
}

console.log(`🤖 Using ${llm} and ${embeddingModel} embedding model`);
