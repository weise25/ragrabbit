import { openai } from "@ai-sdk/openai";
import { getRagContextChat } from "@repo/rag/answering/llamaindex";
import { AssistantResponse, convertToCoreMessages, LlamaIndexAdapter, StreamData, streamText } from "ai";
import { extractSourcesData } from "../../sources-list";

export const maxDuration = 30;

export async function POST(req: Request, res: Response) {
  const { messages } = await req.json();

  // Create a new StreamData object
  const data = new StreamData();

  // Append to general streamed data
  const chatEngine = await getRagContextChat();
  const response = await chatEngine.chat({
    message: messages[messages.length - 1].content,
    chatHistory: messages,
    stream: true,
  });

  /*let content = "";
  let sourceNodesSent = false;
  for await (const { delta, sourceNodes } of response) {
    content += delta;
    data.append(content);
    console.log("content", content);

    if (!sourceNodesSent && sourceNodes.length > 0) {
      data.appendMessageAnnotation({ sources: extractSourcesData(sourceNodes) });
      sourceNodesSent = true;
      break;
    }
  }*/

  return LlamaIndexAdapter.toDataStreamResponse(response);
}
