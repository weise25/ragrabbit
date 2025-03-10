import { Metadata } from "next";
import { authOrLogin } from "@repo/auth";
import { Card, CardContent } from "@repo/design/shadcn/card";
import WidgetConfigForm from "./widget-config-form";
import { getWidgetConfig } from "./actions";
import { Button } from "@repo/design/shadcn/button";
import { MessageSquareIcon } from "@repo/design/base/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/design/shadcn/tabs";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Widget Configuration",
  description: "Configure and integrate the chat and search widgets",
};

export default async function WidgetPage() {
  const session = await authOrLogin();

  let defaultValues = {};

  const { data: widgetConfig } = await getWidgetConfig({});
  if (widgetConfig) {
    defaultValues = {
      suggestedQueries: widgetConfig.suggestedQueries.map((query) => ({ value: query })),
      welcomeMessage: widgetConfig.welcomeMessage,
      logoUrl: widgetConfig.logoUrl,
      maxTokens: widgetConfig.maxTokens,
    };
  }

  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Chat and Widget Configuration</h2>
          <p className="text-muted-foreground">Configure and integrate the chat and search widgets</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="default" size="sm" asChild>
            <a href={`/widget/demo`} target="_blank">
              <MessageSquareIcon className="h-4 w-4 mr-2" />
              Demo Page
            </a>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="configuration" className="space-y-4">
        <TabsList>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="integration">Integration Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration">
          <Card>
            <CardContent>
              <div className="mt-4 flex flex-col gap-4">
                <h3 className="text-lg font-medium">Chat Widget</h3>
                <WidgetConfigForm defaultValues={defaultValues} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integration">
          <Card>
            <CardContent>
              <div className="py-4 max-w-4xl">
                <Script src="/widget.js" strategy="lazyOnload" />
                <div className="prose max-w-none">
                  <h2>Chat Widget</h2>
                  <p>To add the chat widget to your website, add this script tag to your HTML:</p>
                  <pre className="bg-gray-100 p-4 rounded-lg text-black">
                    <code>{`<script src="https://ragrabbit.com/widget.js"></script>`}</code>
                  </pre>
                  <p className="mt-4">
                    You should see the chat widget button in the bottom-right corner of this page. Click it to test the
                    functionality!
                  </p>

                  <h2 className="mt-8">Search Widget</h2>
                  <p>To add a search widget to your website:</p>
                  <p>1. First, add the search widget script:</p>
                  <pre className="bg-gray-100 p-4 rounded-lg text-black">
                    <code>{`<script src="https://ragrabbit.com/widget.js?type=search"></script>`}</code>
                  </pre>
                  <p>2. Mount the search widget:</p>
                  <pre className="bg-gray-100 p-4 rounded-lg text-black">
                    <code>{`<ragrabbit-search></ragrabbit-search>`}</code>
                  </pre>

                  <h2>Use with React/Next.js</h2>
                  <pre>
                    <code>{`
"use client";

import Script from "next/script";

export function RagRabbitSearch() {
  return (
    <>
      <Script src="/widget.js?type=search" strategy="lazyOnload" />
      <style>{\`
        ragrabbit-search .ragrabbit-search-input {
            padding: 6px 12px;
        }
      \`}</style>
      <div className="ml-auto min-w-[300px] flex-1 sm:flex-initial">
        {/* @ts-ignore - Custom element will be mounted by external script */}
        <ragrabbit-search></ragrabbit-search>
      </div>
    </>
  );
}
`}</code>
                  </pre>

                  <h2 className="mt-8">Configuration options</h2>
                  <h3>Chat button</h3>
                  <p>
                    You can configure the chat button by adding the following parameters to the widget.js script tag:
                  </p>
                  <h4>buttonText</h4>
                  <pre className="bg-gray-100 p-4 rounded-lg text-black">
                    <code>{`<script src="https://ragrabbit.com/widget.js?buttonText=Ask%20AI"></script>`}</code>
                  </pre>

                  <h3>Search widget</h3>
                  <p>You can configure the search widget by adding the following parameters to mountSearch call:</p>
                  <h4>searchPlaceholder</h4>
                  <pre className="bg-gray-100 p-4 rounded-lg text-black">
                    <code>{`<div id="search-container"></div>
<script>
  window.mountSearch('search-container', {searchPlaceholder: 'Search documentation...' });
</script>`}</code>
                  </pre>

                  <h2 className="mt-8">Features</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Chat Widget</h3>
                      <ul>
                        <li>Floating chat button in bottom-right corner</li>
                        <li>Modal dialog with embedded chat interface</li>
                        <li>Click outside to close</li>
                        <li>Clean and modern UI</li>
                        <li>Responsive design</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Search Widget</h3>
                      <ul>
                        <li>Embeddable search input</li>
                        <li>Debounced search functionality</li>
                        <li>Modern styling with focus states</li>
                        <li>Customizable placement</li>
                        <li>Lightweight and fast</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
