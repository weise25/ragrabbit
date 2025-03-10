"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Plus } from "@repo/design/base/icons";
import { EasyForm, EasyFormFieldText, EasyFormSubmit } from "@repo/design/components/form/easy-form";
import { Alert, AlertDescription } from "@repo/design/shadcn/alert";
import { Button } from "@repo/design/shadcn/button";
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
import { createApiKey } from "../actions";
import { createApiKeySchema } from "../actions.schema";

interface CreateApiKeyDialogProps {
  onApiKeyCreated?: () => void;
}

export default function CreateApiKeyDialog({ onApiKeyCreated }: CreateApiKeyDialogProps) {
  const [open, setOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string>();
  const [copied, setCopied] = useState(false);

  const form = useForm<z.infer<typeof createApiKeySchema>>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: { name: "" },
    mode: "onChange",
  });

  const onSubmit = async (data: z.infer<typeof createApiKeySchema>) => {
    const result = await createApiKey(data);
    if (result?.data?.success && result.data.apiKey) {
      form.reset();
      setNewApiKey(result.data.apiKey.key);
      onApiKeyCreated?.();
    }
    return result;
  };

  const handleCopy = () => {
    if (newApiKey) {
      navigator.clipboard.writeText(newApiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setNewApiKey(undefined);
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>Create a new API key for accessing the API</DialogDescription>
        </DialogHeader>

        {newApiKey ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                Make sure to copy your API key now. You won't be able to see it again!
              </AlertDescription>
            </Alert>
            <div className="flex items-center space-x-2">
              <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold flex-1 truncate">
                {newApiKey}
              </code>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        ) : (
          <EasyForm form={form} onSubmit={onSubmit} message="API key created">
            <EasyFormFieldText
              form={form}
              name="name"
              title="Name"
              description="A name to help you identify this API key"
              placeholder="My API Key"
            />
            <EasyFormSubmit className="float-right" form={form} />
          </EasyForm>
        )}
      </DialogContent>
    </Dialog>
  );
}
