"use client";

import { useState } from "react";
import { Button } from "@repo/design/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/design/shadcn/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/design/shadcn/tabs";
import { FileTextIcon } from "@repo/design/base/icons";
import { Switch } from "@repo/design/shadcn/switch";
import { Label } from "@repo/design/shadcn/label";
import { MarkdownViewer } from "./markdown-viewer";
import { PagesList } from "./pages-list";
import LlmsConfigForm from "./llms-config-form";

interface ViewerHeaderProps {
  title: string;
  description: string;
  openUrl: string;
  openLabel: string;
  isMarkdown: boolean;
  onToggleMarkdown: (value: boolean) => void;
}

function ViewerHeader({ title, description, openUrl, openLabel, isMarkdown, onToggleMarkdown }: ViewerHeaderProps) {
  return (
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Label htmlFor="markdown-toggle" className="text-sm">
            Markdown
          </Label>
          <Switch id="markdown-toggle" checked={isMarkdown} onCheckedChange={(checked) => onToggleMarkdown(checked)} />
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={openUrl} target="_blank">
            <FileTextIcon className="h-4 w-4 mr-2" />
            {openLabel}
          </a>
        </Button>
      </div>
    </CardHeader>
  );
}

interface LlmPageContentProps {
  organizationId: number;
  baseUrl: string;
  content: string;
  fullContent: string;
  config: {
    type: "SINGLE" | "TOC";
  };
}

export function LlmPageContent({ organizationId, baseUrl, content, fullContent, config }: LlmPageContentProps) {
  const [isMarkdown, setIsMarkdown] = useState(false);

  return (
    <Tabs defaultValue={config.type === "SINGLE" ? "full" : "toc"} className="space-y-4">
      <TabsList>
        {config.type !== "SINGLE" && <TabsTrigger value="toc">Table of Contents</TabsTrigger>}
        <TabsTrigger value="full">Full Content</TabsTrigger>
        <TabsTrigger value="pages">Pages</TabsTrigger>
        <TabsTrigger value="config">Configuration</TabsTrigger>
      </TabsList>
      {config.type !== "SINGLE" && (
        <TabsContent value="toc">
          <Card>
            <ViewerHeader
              title="Table of Contents"
              description={`This is how your ${baseUrl}/llms.txt file looks like. The content is cached for 1 day.`}
              openUrl={`/llms.txt?organizationId=${organizationId}`}
              openLabel="Open LLMs.txt"
              isMarkdown={isMarkdown}
              onToggleMarkdown={setIsMarkdown}
            />
            <CardContent>
              <MarkdownViewer content={content} isMarkdown={isMarkdown} />
            </CardContent>
          </Card>
        </TabsContent>
      )}
      <TabsContent value="full">
        <Card>
          <ViewerHeader
            title="Full Content"
            description={`This is how your ${baseUrl}/llms${config.type === "SINGLE" ? "" : "-full"}.txt file looks like. The content is cached for 1 day.`}
            openUrl={`/llms${config.type === "SINGLE" ? "" : "-full"}.txt?organizationId=${organizationId}`}
            openLabel={`Open LLMs${config.type === "SINGLE" ? "" : "-full"}.txt`}
            isMarkdown={isMarkdown}
            onToggleMarkdown={setIsMarkdown}
          />
          <CardContent>
            <MarkdownViewer content={config.type === "SINGLE" ? content : fullContent} isMarkdown={isMarkdown} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="pages">
        <PagesList />
      </TabsContent>
      <TabsContent value="config">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Configure how your LLMs.txt file is generated</CardDescription>
          </CardHeader>
          <CardContent>
            <LlmsConfigForm defaultValues={config} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
