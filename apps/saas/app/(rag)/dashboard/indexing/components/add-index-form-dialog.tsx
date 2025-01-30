"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  EasyForm,
  EasyFormFieldSwitch,
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
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { addIndexAction, updateIndexAction } from "../actions";
import { addIndexSchema, editSingleIndexSchema } from "../actions.schema";
import { useIndexes } from "../providers/indexes-provider";

interface AddIndexFormProps {
  url?: string;
  indexId?: number;
  foundFromIndexId?: number | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function AddIndexForm({
  url,
  indexId,
  foundFromIndexId,
  open: controlledOpen,
  onOpenChange,
}: AddIndexFormProps) {
  // Start with an empty field:
  const defaultValues = indexId ? { id: indexId, url, clearFoundFrom: !!foundFromIndexId } : { urls: [{ value: "" }] };
  const formSchema = indexId ? editSingleIndexSchema : addIndexSchema;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
  });

  // Multi field array only for add mode:
  const urlsFieldArray = useFieldArray({
    name: "urls",
    control: form.control,
  });

  // Handle action call manually to manage Dialog close:
  const { refresh: refreshIndexes } = useIndexes();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    const result = indexId
      ? await updateIndexAction({
          id: indexId,
          ...data,
        })
      : await addIndexAction(data);
    if (result?.data?.success) {
      form.reset();
      setOpen(false);
      await refreshIndexes();
    }
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{!indexId && <Button>Add Pages</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{indexId ? "Edit Page" : "Add Page"}</DialogTitle>
          <DialogDescription>{indexId ? "Edit page URL" : "Add one or more urls to be indexed"}</DialogDescription>
        </DialogHeader>
        <EasyForm form={form} onSubmit={onSubmit} message={indexId ? "Page updated" : "Content added"}>
          {indexId ? (
            <EasyFormFieldText form={form} name="url" title="URL" placeholder="https://..." />
          ) : (
            <EasyFormMultiTextField
              form={form}
              field={urlsFieldArray}
              name="urls"
              title="URL"
              placeholder="https://..."
              addButtonLabel="Add URL"
            />
          )}
          {foundFromIndexId && (
            <div className="flex flex-col gap-2 mt-4">
              <p className="text-sm text-muted-foreground">This page was found during Crawling.</p>
              <EasyFormFieldSwitch
                form={form}
                name="clearFoundFrom"
                label="Make it standalone"
                description="This will remove the connection to the original crawl"
              />
            </div>
          )}
          <EasyFormSubmit className="float-right" form={form} />
        </EasyForm>
      </DialogContent>
    </Dialog>
  );
}
