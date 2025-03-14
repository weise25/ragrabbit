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

export interface EditIndexProps {
  url?: string;
  indexId?: number;
  foundFromIndexId?: number | null;
  skip?: boolean;
}

interface AddIndexFormProps extends EditIndexProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function AddIndexForm({
  url,
  indexId,
  foundFromIndexId,
  skip,
  open: controlledOpen,
  onOpenChange,
}: AddIndexFormProps) {
  // Start with an empty field:
  const defaultValues = indexId
    ? { id: indexId, url, clearFoundFrom: !!foundFromIndexId, skip }
    : { urls: [{ value: "" }] };
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
  let refreshIndexes = () => Promise.resolve();
  try {
    const { refresh } = useIndexes();
    refreshIndexes = refresh;
  } catch (e) {}

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
          {indexId && foundFromIndexId && (
            <div className="flex flex-col gap-2 mt-4">
              <EasyFormFieldSwitch
                form={form}
                name="clearFoundFrom"
                label="Keep this page"
                description="This will preserve this page if not found in the next crawl"
              />
            </div>
          )}
          {indexId && (
            <div className="flex flex-col gap-2 mt-4">
              <EasyFormFieldSwitch
                form={form}
                name="skip"
                label="Skip this page"
                description="Prevent this page from being scraped and indexed"
              />
            </div>
          )}
          <EasyFormSubmit className="float-right" form={form} />
        </EasyForm>
      </DialogContent>
    </Dialog>
  );
}
