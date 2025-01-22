import db from "@repo/db";
import { and, eq } from "@repo/db/drizzle";
import { indexedContentTable, indexedTable, IndexStatus, organizationsTable } from "@repo/db/schema";

export interface IndexedPage {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  content: string | null;
  foundFromIndexId: number | null;
  children?: IndexedPage[];
}

export async function getIndexedContent(organizationId: string, content: boolean = true) {
  const pages = await db
    .select({
      id: indexedTable.id,
      url: indexedTable.url,
      title: indexedTable.title,
      description: content ? indexedTable.description : null,
      content: content ? indexedContentTable.content : null,
      foundFromIndexId: indexedTable.foundFromIndexId,
    })
    .from(indexedTable)
    .leftJoin(indexedContentTable, eq(indexedTable.id, indexedContentTable.indexId))
    .where(
      and(
        eq(indexedTable.organizationId, organizationId),
        eq(indexedTable.isSitemap, false),
        eq(indexedTable.status, IndexStatus.DONE)
      )
    );

  return pages;
}

export async function getFirstOrganization() {
  const orgs = await db.select().from(organizationsTable).limit(1);
  return orgs[0];
}

export function buildPageTree(pages: IndexedPage[]): IndexedPage[] {
  // Create a map for quick lookup
  const pageMap = new Map<number, IndexedPage>();
  pages.forEach((page) => {
    pageMap.set(page.id, { ...page, children: [] });
  });

  // Build the tree
  const roots: IndexedPage[] = [];
  pages.forEach((page) => {
    const pageWithChildren = pageMap.get(page.id)!;
    if (page.foundFromIndexId === null) {
      roots.push(pageWithChildren);
    } else {
      const parent = pageMap.get(page.foundFromIndexId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(pageWithChildren);
      } else {
        // If parent is not found (possibly filtered out), treat as root
        roots.push(pageWithChildren);
      }
    }
  });

  return roots;
}
