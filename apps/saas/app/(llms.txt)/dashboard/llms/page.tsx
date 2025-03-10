import { Metadata } from "next";
import { authOrLogin } from "@repo/auth";
import { Card, CardContent } from "@repo/design/shadcn/card";
import { Database, Type, Hash, Calendar } from "@repo/design/base/icons";
import { headers } from "next/headers";
import { ResetCacheButton } from "./components/reset-cache-button";
import { getLlmStats, getLlmsConfigAction } from "./actions";
import { LlmPageContent } from "./components/llm-page-content";

export const metadata: Metadata = {
  title: "LLMs.txt",
  description: "Generate the LLMs.txt file for your website",
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatNumber(num: number) {
  return new Intl.NumberFormat().format(num);
}

async function getBaseUrl() {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}`;
}

export default async function LlmPage() {
  const session = await authOrLogin();
  const baseUrl = await getBaseUrl();

  const [{ data: stats }, { data: config }, contentResponse, fullContentResponse] = await Promise.all([
    getLlmStats({}),
    getLlmsConfigAction({}),
    fetch(`${baseUrl}/llms.txt?organizationId=${session.user.organizationId}`),
    fetch(`${baseUrl}/llms-full.txt?organizationId=${session.user.organizationId}`),
  ]);

  const [content, fullContent] = await Promise.all([contentResponse.text(), fullContentResponse.text()]);

  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">LLMs.txt</h2>
          <p className="text-muted-foreground">
            A markdown file containing all your indexed content, perfect for helping language models use your website.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <ResetCacheButton organizationId={session.user.organizationId} />
        </div>
      </div>

      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Database className="h-4 w-4" />
                Pages
              </div>
              <div className="font-medium">{formatNumber(stats.totalIndexed)}</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Type className="h-4 w-4" />
                Total Tokens
              </div>
              <div className="font-medium">{formatNumber(stats.totalTokens)}</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Total Size
              </div>
              <div className="font-medium">{formatBytes(stats.totalSizeBytes)}</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Last Updated
              </div>
              <div className="font-medium">
                {stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : "Never"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <LlmPageContent
        organizationId={session.user.organizationId}
        baseUrl={baseUrl}
        content={content}
        fullContent={fullContent}
        config={config}
      />
    </>
  );
}
