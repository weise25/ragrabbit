"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EasyForm, EasyFormMultiTextField, EasyFormSubmit } from "@repo/design/components/form/easy-form";
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
import { addIndexAction } from "../actions";
import { addIndexSchema } from "../actions.schema";
import { useIndexes } from "../providers/indexes-provider";

export type IndexFormValues = z.infer<typeof addIndexSchema>;

export default function AddIndexFormDialog({ defaultValues }: { defaultValues?: Partial<IndexFormValues> }) {
  // Start with an empty field:
  defaultValues = defaultValues || {
    urls: [{ value: "" }],
  };
  const form = useForm<IndexFormValues>({
    resolver: zodResolver(addIndexSchema),
    defaultValues,
    mode: "onChange",
  });

  // Multi field array:
  const urlsFieldArray = useFieldArray({
    name: "urls",
    control: form.control,
  });

  // Handle action call manually to manage Dialog close:
  const { refresh: refreshIndexes } = useIndexes();
  const [open, setOpen] = useState(false);
  const onSubmit = async (data: IndexFormValues) => {
    const result = await addIndexAction(data);
    if (result?.data?.success) {
      form.reset();
      setOpen(false);
      await refreshIndexes();
    }
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Pages</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Page</DialogTitle>
          <DialogDescription>Add one or more urls to be indexed</DialogDescription>
        </DialogHeader>
        <EasyForm form={form} onSubmit={onSubmit} message="Content added">
          <EasyFormMultiTextField
            form={form}
            field={urlsFieldArray}
            name="urls"
            title="Url"
            placeholder="https://..."
            addButtonLabel="Add Url"
          />
          <EasyFormSubmit className="float-right" form={form} />
        </EasyForm>
      </DialogContent>
    </Dialog>
  );
}
