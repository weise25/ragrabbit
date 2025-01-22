import { Metadata } from "next";
import { authOrLogin } from "@repo/auth";
import { Button } from "@repo/design/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/design/shadcn/card";
import { ScrollArea } from "@repo/design/shadcn/scroll-area";
import { FileTextIcon, Link } from "@repo/design/base/icons";
import { headers } from "next/headers";
import { ResetCacheButton } from "./components/reset-cache-button";

export const metadata: Metadata = {
  title: "LLM.txt",
  description: "Generate the LLM.txt file for your website",
};

async function getBaseUrl() {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}`;
}

export default async function LlmPage() {
  const session = await authOrLogin();
  const baseUrl = await getBaseUrl();
  const response = await fetch(`${baseUrl}/llm.txt?organizationId=${session.user.organizationId}`, {
    cache: "no-store",
  });
  const content = await response.text();
  const fullResponse = await fetch(`${baseUrl}/llm-full.txt?organizationId=${session.user.organizationId}`, {
    cache: "no-store",
  });
  const fullContent = await fullResponse.text();

  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">LLM.txt</h2>
          <p className="text-muted-foreground">
            A markdown file containing all your indexed content, perfect for helping language models use your website.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <ResetCacheButton organizationId={session.user.organizationId} />
          <Button variant="default" size="sm" asChild>
            <a href={`/llm.txt?organizationId=${session.user.organizationId}`} target="_blank">
              <FileTextIcon className="h-4 w-4 mr-2" />
              Open LLM.txt
            </a>
          </Button>
          <Button variant="default" size="sm" asChild>
            <a href={`/llm-full.txt?organizationId=${session.user.organizationId}`} target="_blank">
              <FileTextIcon className="h-4 w-4 mr-2" />
              Open LLM-full.txt
            </a>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>TOC</CardTitle>
          <CardDescription>
            This is how your{" "}
            <a href="/llm.txt" target="_blank" className="text-blue-500 underline">
              {baseUrl}/llm.txt
            </a>{" "}
            file looks like. The content is cached for 1 hour.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] w-full rounded-md border p-4">
            <pre className="text-sm whitespace-pre-wrap font-mono">{content}</pre>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Full</CardTitle>
          <CardDescription>
            This is how your{" "}
            <a href="/llm-full.txt" target="_blank" className="text-blue-500 underline">
              {baseUrl}/llm-full.txt
            </a>{" "}
            file looks like. The content is cached for 1 hour.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] w-full rounded-md border p-4">
            <pre className="text-sm whitespace-pre-wrap font-mono">{fullContent}</pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
}
