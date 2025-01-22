import { Metadata } from "next";
import { authOrLogin } from "@repo/auth";
import WidgetDemo from "../../widget/demo/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/design/shadcn/card";
import WidgetConfigForm from "./widget-config-form";
import { getWidgetConfig } from "./actions";

export const metadata: Metadata = {
  title: "Widget Configuration",
  description: "Configure the chat and search widgets",
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
    };
  }
  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Chat and Widget Configuration</h2>
          <p className="text-muted-foreground">Configure the chat and search widget</p>
        </div>
        <div className="flex items-center space-x-2"></div>
      </div>
      <Card>
        <CardContent>
          <div className="mt-4 flex flex-col gap-4">
            <h3 className="text-lg font-medium">Chat Widget</h3>
            <WidgetConfigForm defaultValues={defaultValues} />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
