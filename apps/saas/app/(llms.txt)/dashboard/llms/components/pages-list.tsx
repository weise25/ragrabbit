"use client";

import { useState, useEffect } from "react";
import { SortableTree, TreeItems, TreeItemComponentProps } from "dnd-kit-sortable-tree";
import { Card } from "@repo/design/shadcn/card";
import { SimpleTreeItemWrapper } from "dnd-kit-sortable-tree";
import { getIndexedPages, updatePagesOrder } from "../actions";
import { Skeleton } from "@repo/design/shadcn/skeleton";
import { hyphenateUrl } from "@repo/design/lib/hyphenations";
import { forwardRef } from "react";
import { Page, TreePage } from "@/app/(llms.txt)/utils";
import { Switch } from "@repo/design/shadcn/switch";
import { cn } from "@repo/design/lib/utils";

function extractPages(items: TreeItems<TreePage>): Page[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    url: item.url,
    excluded: item.excluded,
    children: item.children ? extractPages(item.children) : [],
  }));
}
interface PagesListProps {
  initialPages?: Page[];
}

interface PageTreeItemProps extends TreeItemComponentProps<TreePage> {
  treePages: TreeItems<TreePage>;
  onTreePagesChange: (pages: TreeItems<TreePage>) => void;
  onTreeItemsChange: (items: TreeItems<TreePage>) => void;
}

const PageTreeItem = forwardRef<HTMLDivElement, PageTreeItemProps>(
  ({ treePages, onTreePagesChange, onTreeItemsChange, ...treeItemProps }, ref) => (
    <SimpleTreeItemWrapper
      {...treeItemProps}
      ref={ref}
      className="w-fit [&>div]:!rounded-lg [&>div]:!py-0 [&>div]:!mb-2"
    >
      <div className={cn("flex items-center gap-2 p-2 bg-background", treeItemProps.item.excluded && "opacity-50")}>
        <div className="flex-1 md:flex gap-4 items-center group">
          <div className="font-medium truncate max-w-[600px]">{treeItemProps.item.title || "Untitled"}</div>
          <Switch
            className="invisible group-hover:visible"
            checked={!treeItemProps.item.excluded}
            onCheckedChange={(checked) => {
              const newPages = [...treePages];
              const updateExcluded = (items: TreeItems<TreePage>, itemId: number): boolean => {
                for (let i = 0; i < items.length; i++) {
                  if (items[i].id === itemId) {
                    items[i] = { ...items[i], excluded: !checked };
                    return true;
                  }
                  if (items[i].children && updateExcluded(items[i].children, itemId)) {
                    items[i] = { ...items[i], children: [...items[i].children] };
                    return true;
                  }
                }
                return false;
              };

              updateExcluded(newPages, treeItemProps.item.id);
              onTreePagesChange(newPages);

              // Update the server
              onTreeItemsChange(newPages);
            }}
          />
          <div className="text-sm text-muted-foreground hidden group-hover:block">
            {hyphenateUrl(treeItemProps.item.url)}
          </div>
        </div>
      </div>
    </SimpleTreeItemWrapper>
  )
);

PageTreeItem.displayName = "PageTreeItem";

export function PagesList({ initialPages }: PagesListProps) {
  const [pages, setPages] = useState<TreeItems<TreePage>>(initialPages ?? []);
  const [isLoading, setIsLoading] = useState(!initialPages);

  useEffect(() => {
    if (!initialPages) {
      loadPages();
    }
  }, [initialPages]);

  async function loadPages() {
    try {
      setIsLoading(true);
      const { data } = await getIndexedPages({});
      setPages(data ?? []);
    } catch (error) {
      console.error("Failed to load pages:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleItemsChange(items: TreeItems<TreePage>) {
    const pages = extractPages(items);
    console.log("## pages", pages);
    setPages(pages);
    try {
      await updatePagesOrder({ pages });
    } catch (error) {
      console.error("Failed to update pages order:", error);
    }
  }

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (pages.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground">No pages indexed yet.</div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <SortableTree
        indentationWidth={40}
        items={pages}
        onItemsChanged={handleItemsChange}
        TreeItemComponent={(props) => (
          <PageTreeItem
            {...props}
            treePages={pages}
            onTreePagesChange={setPages}
            onTreeItemsChange={handleItemsChange}
          />
        )}
      />
    </Card>
  );
}
