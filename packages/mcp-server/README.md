# MCP Server for RagRabbit Documentation Search

This server implements the Model Context Protocol (MCP) to provide AI models with access to any documentation indexed with an instance of RagRabbit.

## Overview

The MCP Server acts as a bridge between AI clients and RagRabbit's hosted documentation:

- Semantic search across documentation using natural language queries
- Access to LLM-specific documentation
- Standardized communication through the Model Context Protocol

## Installation

### Claude Desktop

Add a custom mcp server with the name of your product, so that Claude AI can use it when looking for info about it.

in `claude_desktop_config.json` (Claude -> Settings -> Developer -> Edit Config)

```
{
  "mcpServers": {
    "<name of your documentation>": {
      "command": "npx",
      "args": ["@ragrabbit/mcp", "http://<RagRabbit install>/", "<name of your documentation>"]
    }
  }
}
```

### In Cursor IDE

Go to Cursor -> Settings -> Cursor Settings -> MCP

And add a new MCP of type `command` with the command:

```
npx @ragrabbit/mcp", "http://<RagRabbit install>/", "<name of your documentation>"
```

Arguments:

- `ragrabbit-url`: (Required) The base URL of your RagRabbit instance, eg https://my-ragrabbit.vercel.com/
- `name`: (Required) Custom name for the documentation search service (defaults to "RagRabbit") so that AI will know to use it when looking for info

## Exposed Tools by this MCP

### search_docs

Performs semantic search across the documentation.

Parameters:

- `query`: String - The search query to find relevant documents

Example:

```json
{
  "name": "search_docs",
  "arguments": {
    "query": "How to implement authentication?"
  }
}
```

## Available Resources

### LLMs Documentation

- URI: `llms.txt`
- Description: Documentation about LLMs and their capabilities
- MIME Type: `text/plain`

## License

MIT
