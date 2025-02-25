#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Resource,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";

// Type definitions for tool arguments and responses
interface RetrieveArgs {
  query: string;
}

interface NodeWithScore {
  metadata: {
    pageUrl: string;
    pageTitle?: string;
    pageDescription?: string;
    contentId: string;
    organizationId: number;
  };
  content: string;
  score: number;
}

// Tool definition
function createRetrieveTool(name: string): Tool {
  return {
    name: "search_docs",
    description: `Retrieve relevant documents about ${name} based on a query`,
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query to find relevant documents",
        },
      },
      required: ["query"],
    },
  };
}

class RagRabbitClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    // Remove trailing slash if present
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async retrieve(query: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/mcp/api/retrieve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Failed to retrieve documents: ${response.statusText}`);
    }

    const nodes = (await response.json()) as NodeWithScore[];
    if (nodes.length === 0) {
      return "No documents found";
    }
    // Return in Markdown format:
    return nodes
      .map(
        (node) =>
          `--- 
${node.metadata.pageTitle}
${node.metadata.pageUrl}
${node.metadata.pageDescription}
---
${node.content}`
      )
      .join("\n");
  }

  async getLLMsDoc(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/llms-full.txt`);
    if (!response.ok) {
      throw new Error(`Failed to fetch LLMs documentation: ${response.statusText}`);
    }
    return response.text();
  }
}

async function main() {
  // Get the RagRabbit URL and name from command line arguments
  const [ragRabbitUrl, name = "RagRabbit"] = process.argv.slice(2);
  if (!ragRabbitUrl) {
    console.error("Please provide the RagRabbit URL as a command line argument");
    process.exit(1);
  }

  console.error("Starting RagRabbit MCP Server...");
  const server = new Server(
    {
      name: `${name} Documentation Search`,
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  const ragRabbitClient = new RagRabbitClient(ragRabbitUrl);
  const retrieveTool = createRetrieveTool(name);

  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    console.error("Received CallToolRequest:", request);
    try {
      if (!request.params.arguments) {
        throw new Error("No arguments provided");
      }

      switch (request.params.name) {
        case "search_docs": {
          const args = request.params.arguments as unknown as RetrieveArgs;
          if (!args.query) {
            throw new Error("Missing required argument: query");
          }
          const response = await ragRabbitClient.retrieve(args.query);
          return {
            content: [{ type: "text", text: response }],
          };
        }

        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    } catch (error) {
      console.error("Error executing tool:", error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
      };
    }
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error("Received ListToolsRequest");
    return {
      tools: [retrieveTool],
    };
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    console.error("Received ListResourcesRequest");
    return {
      resources: [
        {
          uri: "llms.txt",
          name: "LLMs Documentation",
          description: "Documentation about LLMs and their capabilities",
          mimeType: "text/plain",
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    console.error("Received ReadResourceRequest:", request);
    try {
      if (request.params.uri === "llms.txt") {
        const content = await ragRabbitClient.getLLMsDoc();
        return {
          contents: [
            {
              uri: "llms.txt",
              mimeType: "text/markdown",
              text: content,
            },
          ],
        };
      }
      throw new Error(`Unknown resource: ${request.params.uri}`);
    } catch (error) {
      console.error("Error fetching resource:", error);
      throw error;
    }
  });

  const transport = new StdioServerTransport();
  console.error("Connecting server to transport...");
  await server.connect(transport);

  console.error("RagRabbit MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
