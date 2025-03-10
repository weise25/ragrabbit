# RagRabbit Search React

A React component library for integrating RagRabbit search and chat functionality into your application.

## Installation

```bash
npm install @ragrabbit/search-react
# or
yarn add @ragrabbit/search-react
# or
pnpm add @ragrabbit/search-react
```

## Components

### RagRabbitModal

A standalone modal component that displays an iframe with the RagRabbit chat widget.

```jsx
import { RagRabbitModal } from "@ragrabbit/search-react";

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <RagRabbitModal
      open={isOpen}
      onOpenChange={setIsOpen}
      domain="https://your-domain.com/" // Required, the domain where your RagRabbit instance is hosted
      position="centered" // Optional, "centered" or "right", defaults to "centered"
    />
  );
}
```

### RagRabbitChatButton

A floating button that opens a chat modal when clicked.

```jsx
import { RagRabbitChatButton } from "@ragrabbit/search-react";

function MyComponent() {
  return (
    <RagRabbitChatButton
      buttonText="Chat" // Optional, defaults to "Chat"
      domain="https://your-domain.com/" // Required, the domain where your RagRabbit instance is hosted
    />
  );
}
```

### RagRabbitSearchInput

A search input that opens the chat modal when focused or clicked.

```jsx
import { RagRabbitSearchInput } from "@ragrabbit/search-react";

function MyComponent() {
  return (
    <RagRabbitSearchInput
      placeholder="Search..." // Optional, defaults to "Search..."
      domain="https://your-domain.com/" // Required, the domain where your RagRabbit instance is hosted
    />
  );
}
```

## License

MIT

# RagRabbit API Client

A TypeScript client for interacting with the RagRabbit API. This client provides type-safe methods for adding and processing content in your RagRabbit instance.

## Installation

```bash
npm install @repo/search-react
# or
yarn add @repo/search-react
# or
pnpm add @repo/search-react
```

## Usage

### Creating a Client Instance

```typescript
import { RagRabbitAPI } from "@repo/search-react";

const client = RagRabbitAPI.create("https://your-ragrabbit-instance.com", "your-api-key");
```

### Adding Content

Add URLs or content to be indexed:

```typescript
// Add a URL for crawling
await client.addContent({
  url: "https://example.com",
  doCrawl: true,
});

// Add specific content for a URL
await client.addContent({
  url: "https://example.com/article",
  content: "Your content here...",
  doCrawl: false,
});
```

### Processing Content

Trigger the processing/indexing of content. This is particularly useful in CI/CD pipelines when you want to ensure your content is indexed after deployment.

```typescript
// Process all pending content
await client.runProcessing();

// Process a specific URL
await client.runProcessing({
  url: "https://example.com",
});
```

### CI/CD Integration Example

Here's an example of how to integrate content processing in your CI/CD pipeline:

```yaml
# GitHub Actions example
name: Index Content

on:
  deployment_status:
    states: [success]

jobs:
  index-content:
    runs-on: ubuntu-latest
    if: github.event.deployment_status.state == 'success'
    steps:
      - name: Trigger Content Indexing
        uses: actions/github-script@v6
        with:
          script: |
            const { RagRabbitAPI } = require("@ragrabbit/search-react");

            const client = RagRabbitAPI.create(
              process.env.RAGRABBIT_API_URL,
              process.env.RAGRABBIT_API_KEY
            );

            // Start processing all pending content
            await client.runProcessing();
```

## Error Handling

The client includes built-in error handling with detailed error messages:

```typescript
try {
  await client.addContent({
    url: "https://example.com",
    doCrawl: true,
  });
} catch (error) {
  if (error instanceof APIError) {
    console.error(`API Error (${error.status}):`, error.message);
    console.error("Error details:", error.payload);
  }
}
```

## TypeScript Support

The client is written in TypeScript and provides full type safety:

```typescript
import type { AddContentInput, ProcessInput } from "@repo/search-react";

// Input types are fully typed
const input: AddContentInput = {
  url: "https://example.com",
  doCrawl: true,
  content: "Optional content...",
};
```

## API Reference

### `RagRabbitAPI.create(baseUrl: string, apiKey: string)`

Creates a new API client instance.

### `addContent(input: AddContentInput)`

Adds new content for indexing.

Parameters:

- `url`: The URL to index
- `doCrawl`: Whether to crawl the URL (default: false)
- `content`: Optional content to index directly

### `runProcessing(input?: ProcessInput)`

Triggers processing of content.

Parameters:

- `url`: Optional URL to process specifically. If not provided, processes all pending content.
