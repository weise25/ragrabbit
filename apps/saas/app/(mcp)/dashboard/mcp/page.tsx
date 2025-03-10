import { Metadata } from "next";
import { authOrLogin } from "@repo/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/design/shadcn/card";
import { Button } from "@repo/design/shadcn/button";
import { ExternalLinkIcon, TerminalIcon } from "@repo/design/base/icons";

export const metadata: Metadata = {
  title: "MCP Integration Guide",
  description: "Learn how to integrate RagRabbit with AI assistants using the Model Context Protocol (MCP)",
};

export default async function McpIntegrationPage() {
  const session = await authOrLogin();

  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">MCP Integration</h2>
          <p className="text-muted-foreground">
            Learn how to integrate RagRabbit with AI assistants using the Model Context Protocol (MCP)
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="default" size="sm" asChild>
            <a href="https://www.npmjs.com/package/@ragrabbit/mcp" target="_blank">
              <ExternalLinkIcon className="h-4 w-4 mr-2" />
              MCP Npm Module
            </a>
          </Button>
        </div>
      </div>
      <Card>
        <CardContent>
          <div className="py-4 max-w-4xl">
            <div className="prose max-w-none">
              <h2>Model Context Protocol (MCP) Integration</h2>
              <p>The MCP Server acts as a bridge between AI clients and RagRabbit's hosted documentation:</p>
              <ul>
                <li>Semantic search across documentation using natural language queries</li>
                <li>Access to LLM-specific documentation</li>
                <li>Standardized communication through the Model Context Protocol</li>
              </ul>

              <h2 className="mt-8">Installation</h2>

              <h3>Claude Desktop</h3>
              <p>
                Add a custom MCP server with the name of your product, so that Claude AI can use it when looking for
                info about it.
              </p>
              <p>
                In <code>claude_desktop_config.json</code> (Claude → Settings → Developer → Edit Config):
              </p>
              <pre className="bg-gray-100 p-4 rounded-lg text-black">
                <code>{`{
  "mcpServers": {
    "<name_of_your_documentation_no_spaces>": {
      "command": "npx",
      "args": ["@ragrabbit/mcp", "http://<RagRabbit install>/", "<name of your documentation>"]
    }
  }
}`}</code>
              </pre>

              <h3 className="mt-4">In Cursor IDE</h3>
              <p>Go to Cursor → Settings → Cursor Settings → MCP</p>
              <p>
                And add a new MCP of type <code>command</code> with the command:
              </p>
              <pre className="bg-gray-100 p-4 rounded-lg text-black">
                <code>{`npx @ragrabbit/mcp", "http://<RagRabbit install>/", "<name of your documentation>"`}</code>
              </pre>

              <h3 className="mt-4">Arguments</h3>
              <ul>
                <li>
                  <code>ragrabbit-url</code>: (Required) The base URL of your RagRabbit instance, eg
                  https://my-ragrabbit.vercel.com/
                </li>
                <li>
                  <code>name</code>: (Required) Custom name for the documentation search service (defaults to
                  "RagRabbit") so that AI will know to use it when looking for info
                </li>
              </ul>

              <h2 className="mt-8">Exposed Tools by this MCP</h2>

              <h3>search_docs</h3>
              <p>Performs semantic search across the documentation.</p>
              <p>
                <strong>Parameters:</strong>
              </p>
              <ul>
                <li>
                  <code>query</code>: String - The search query to find relevant documents
                </li>
              </ul>
              <p>
                <strong>Example:</strong>
              </p>
              <pre className="bg-gray-100 p-4 rounded-lg text-black">
                <code>{`{
  "name": "search_docs",
  "arguments": {
    "query": "How to implement authentication?"
  }
}`}</code>
              </pre>

              <h2 className="mt-8">Available Resources</h2>

              <h3>LLMs Documentation</h3>
              <ul>
                <li>
                  <strong>URI:</strong> <code>llms.txt</code>
                </li>
                <li>
                  <strong>Description:</strong> Documentation about LLMs and their capabilities
                </li>
                <li>
                  <strong>MIME Type:</strong> <code>text/plain</code>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
