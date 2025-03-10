"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EasyForm, EasyFormFieldText, EasyFormSubmit } from "@repo/design/components/form/easy-form";
import { Textarea } from "@repo/design/shadcn/textarea";
import { Switch } from "@repo/design/shadcn/switch";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { updateLlmsConfigAction } from "../actions";

const configSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(["TOC", "SINGLE"]),
});

export type LlmsConfigFormValues = z.infer<typeof configSchema>;

export default function LlmsConfigForm({ defaultValues }: { defaultValues?: Partial<LlmsConfigFormValues> }) {
  defaultValues = defaultValues || {
    title: "",
    description: "",
    type: "TOC",
  };

  const form = useForm<LlmsConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues,
    mode: "onChange",
  });

  return (
    <EasyForm form={form} onSubmit={updateLlmsConfigAction} message="Config updated">
      <EasyFormFieldText
        form={form}
        name="title"
        title="Title"
        description="The title of your LLMs.txt file"
        placeholder="My Company Documentation"
      />
      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <p className="text-sm text-muted-foreground">A description of your documentation</p>
        <Textarea
          {...form.register("description")}
          placeholder="Documentation for My Company's products and services"
          className="min-h-[100px]"
        />
      </div>
      <div className="space-y-2">
        <div>
          <label className="text-sm font-medium">Style</label>
          <p className="text-sm text-muted-foreground">
            Generate a single file or a Table of Contents (llms.txt) with separate files full file (llms-full.txt)
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={form.watch("type") === "SINGLE"}
            onCheckedChange={(checked) => form.setValue("type", checked ? "SINGLE" : "TOC")}
          />
          <label className="text-sm font-medium">
            {form.watch("type") === "SINGLE" ? "Single File" : "ToC/Full Files"}
          </label>
        </div>
      </div>
      <EasyFormSubmit form={form} />
    </EasyForm>
  );
}
