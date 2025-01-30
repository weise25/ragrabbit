"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  EasyForm,
  EasyFormFieldNumber,
  EasyFormFieldSwitch,
  EasyFormFieldText,
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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { addCrawlAction, updateCrawlAction } from "../actions";
import { addCrawlSchema } from "../actions.schema";
import { useIndexes } from "../providers/indexes-provider";

export type CrawlFormValues = z.infer<typeof addCrawlSchema>;

interface AddCrawlFormDialogProps {
  defaultValues?: Partial<CrawlFormValues>;
  indexId?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function AddCrawlFormDialog({
  defaultValues,
  indexId,
  open: controlledOpen,
  onOpenChange,
}: AddCrawlFormDialogProps) {
  // Start with an empty field:
  defaultValues = defaultValues || {
    url: "",
    isSitemap: false,
    scrapeOptions: {
      allowSubdomains: false,
      maxDepth: 3,
      stripQueries: "",
    },
  };
  const form = useForm<CrawlFormValues>({
    resolver: zodResolver(addCrawlSchema),
    defaultValues,
    mode: "onChange",
  });

  // Handle action call manually to manage Dialog close:
  const { refresh: refreshIndexes } = useIndexes();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const onSubmit = async (data: CrawlFormValues) => {
    const result = indexId ? await updateCrawlAction({ ...data, id: indexId }) : await addCrawlAction(data);
    if (result?.data?.success) {
      form.reset();
      setOpen(false);
      await refreshIndexes();
    }
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{!indexId && <Button variant="outline">Add Site to Crawl</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{indexId ? "Edit Site" : "Add Site to Crawl"}</DialogTitle>
          <DialogDescription>
            {indexId ? "Edit site crawl settings" : "Add a site to be crawled from a starting URL"}
          </DialogDescription>
        </DialogHeader>
        <EasyForm form={form} onSubmit={onSubmit} message={indexId ? "Site updated" : "Content added"}>
          <EasyFormFieldText form={form} name="url" title="Url" placeholder="https://..." />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Options</span>
            <div className="flex flex-col gap-3">
              <EasyFormFieldSwitch
                form={form}
                name="isSitemap"
                label="Sitemap"
                description="If the URL is a sitemap, will be used to get the list of pages to scrape."
              />
              <EasyFormFieldSwitch
                form={form}
                name="scrapeOptions.allowSubdomains"
                label="Allow Subdomains"
                description="Allow crawling of subdomains of the same domain"
              />
              <EasyFormFieldNumber
                form={form}
                name="scrapeOptions.maxDepth"
                title="Max Depth"
                description="Number of links to follow from the starting URL"
              />
              <EasyFormFieldText
                form={form}
                name="scrapeOptions.stripQueries"
                title="Strip Tags"
                description="Comma separated list of css queries to strip from the page, eg: 'aside, nav, .toc'"
              />
            </div>
          </div>
          <EasyFormSubmit className="float-right" form={form} />
        </EasyForm>
      </DialogContent>
    </Dialog>
  );
}
