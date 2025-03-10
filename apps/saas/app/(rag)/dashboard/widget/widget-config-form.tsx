"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown } from "@repo/design/base/icons";
import {
  EasyForm,
  EasyFormFieldNumber,
  EasyFormFieldText,
  EasyFormMultiTextField,
  EasyFormSubmit,
} from "@repo/design/components/form/easy-form";
import { Button } from "@repo/design/shadcn/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@repo/design/shadcn/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design/shadcn/dialog";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { widgetConfigSchema } from "./actions.schema";
import { useIndexes } from "../indexing/providers/indexes-provider";
import { widgetConfigAction } from "./actions";

export type WidgetConfigFormValues = z.infer<typeof widgetConfigSchema>;

export default function WidgetConfigForm({ defaultValues }: { defaultValues?: Partial<WidgetConfigFormValues> }) {
  // Start with an empty field:
  defaultValues = defaultValues || {
    suggestedQueries: [{ value: "" }],
    welcomeMessage: "",
    logoUrl: "",
    maxTokens: 20,
  };
  const form = useForm<WidgetConfigFormValues>({
    resolver: zodResolver(widgetConfigSchema),
    defaultValues,
    mode: "onChange",
  });

  // Multi field array:
  const suggestedQueriesFieldArray = useFieldArray({
    name: "suggestedQueries",
    control: form.control,
  });

  // Handle action call manually to manage Dialog close:
  const onSubmit = async (data: WidgetConfigFormValues) => {
    const result = await widgetConfigAction(data);
    return result;
  };

  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <EasyForm form={form} onSubmit={onSubmit} message="Config updated">
      <EasyFormFieldText
        form={form}
        name="welcomeMessage"
        title="Welcome Message"
        placeholder="Welcome to our widget!"
      />
      <EasyFormFieldText form={form} name="logoUrl" title="Logo URL" placeholder="https://..." />

      <EasyFormMultiTextField
        form={form}
        field={suggestedQueriesFieldArray}
        name="suggestedQueries"
        title="Suggested Queries"
        placeholder="What is the meaning of life?"
        addButtonLabel="Add Suggested Query"
      />
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 w-full justify-start">
            <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? "transform rotate-180" : ""}`} />
            {showAdvanced ? "Hide Advanced Options" : "Show Advanced Options"}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          <EasyFormFieldNumber
            form={form}
            name="maxTokens"
            title="Max Million Tokens per Month"
            description="Maximum monthly Million tokens to use. Cost depends on the model used. Eg: 0.60$ per 1M tokens for gpt-4o-mini"
          />
        </CollapsibleContent>
      </Collapsible>

      <EasyFormSubmit className="float-right" form={form} />
    </EasyForm>
  );
}
