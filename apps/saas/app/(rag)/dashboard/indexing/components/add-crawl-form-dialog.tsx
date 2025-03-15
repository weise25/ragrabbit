"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown } from "@repo/design/base/icons";
import {
  EasyForm,
  EasyFormFieldNumber,
  EasyFormFieldSwitch,
  EasyFormFieldText,
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
      allowLinksRegexp: "",
      excludeLinksRegexp: "",
      transformStrategy: "llm",
    },
  };
  const form = useForm<CrawlFormValues>({
    resolver: zodResolver(addCrawlSchema),
    defaultValues,
    mode: "onChange",
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

  // Check if any advanced options differ from defaults
  const hasNonDefaultAdvancedOptions = Boolean(
    defaultValues.scrapeOptions?.stripQueries ||
      defaultValues.scrapeOptions?.allowLinksRegexp ||
      defaultValues.scrapeOptions?.excludeLinksRegexp ||
      defaultValues.scrapeOptions?.allowSubdomains
  );
  const [showAdvanced, setShowAdvanced] = useState(hasNonDefaultAdvancedOptions);

  const onSubmit = async (data: CrawlFormValues) => {
    const result = indexId ? await updateCrawlAction({ ...data, id: indexId }) : await addCrawlAction(data);
    if (result?.data?.success) {
      form.reset();
      setOpen(false);
      if (!indexId) {
        // TODO: a bug with a refresh on edit, disabled for now
        await refreshIndexes();
      }
    }
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{!indexId && <Button variant="outline">Add Site to Crawl</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] sm:max-h-[90vh] overflow-y-auto">
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
              <EasyFormFieldNumber
                form={form}
                name="scrapeOptions.maxDepth"
                title="Max Depth"
                description="Number of links to follow from the starting URL"
              />

              <EasyFormFieldSwitch
                form={form}
                name="scrapeOptions.transformStrategy"
                title="Transform Strategy"
                description="Better results with LLM, but slower"
                label="Transform Strategy"
                values={[
                  { label: "Markdown", value: "markdown" },
                  { label: "LLM", value: "llm" },
                ]}
              />

              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 w-full justify-start">
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${showAdvanced ? "transform rotate-180" : ""}`}
                    />
                    {showAdvanced ? "Hide Advanced Options" : "Show Advanced Options"}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  <EasyFormFieldText
                    form={form}
                    name="scrapeOptions.stripQueries"
                    title="Strip Tags"
                    description="Comma separated list of css queries to strip from the page, eg: 'aside, nav, .toc'"
                  />
                  <EasyFormFieldText
                    form={form}
                    name="scrapeOptions.allowLinksRegexp"
                    title="Allow Links Regexp"
                    placeholder="eg: ^https://www.example.com/.*"
                    description="Regexp for the urls to scrape"
                  />
                  <EasyFormFieldText
                    form={form}
                    name="scrapeOptions.excludeLinksRegexp"
                    title="Exclude Links Regexp"
                    description="Regexp to exclude urls from being crawled"
                  />
                  <EasyFormFieldSwitch
                    form={form}
                    name="scrapeOptions.allowSubdomains"
                    label="Allow Subdomains"
                    description="Allow crawling across subdomains of the same domain"
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
          <EasyFormSubmit className="float-right" form={form} />
        </EasyForm>
      </DialogContent>
    </Dialog>
  );
}
