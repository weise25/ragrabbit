"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  EasyForm,
  EasyFormFieldText,
  EasyFormMultiTextField,
  EasyFormSubmit,
} from "@repo/design/components/form/easy-form";
import { Button } from "@repo/design/shadcn/button";
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
      <EasyFormSubmit className="float-right" form={form} />
    </EasyForm>
  );
}
