import db from "@repo/db";
import { and, eq } from "@repo/db/drizzle";
import {
  indexedContentTable,
  indexedTable,
  IndexStatus,
  LlmstxtOrderedContentIds,
  llmstxtTable,
  organizationsTable,
  llamaindexEmbedding,
  normalizeUrlOrNull,
} from "@repo/db/schema";

import { NextResponse } from "next/server";
export interface IndexedPage {
  id: number;
  url: string;
  title: string | null;
  description?: string | null;
  content?: string | null;
  foundFromIndexId?: number | null;
  children?: IndexedPage[];
}

export async function getIndexedContent(organizationId: number, content: boolean = true) {
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

export interface Page {
  id: number;
  title: string;
  url: string;
  excluded?: boolean;
  children?: Page[];
}

export interface TreePage {
  id: number;
  title: string;
  url: string;
  excluded?: boolean;
  description?: string;
  content?: string;
  children?: TreePage[];
}

interface PageWithMetadata extends TreePage {
  metadata?: {
    contentId?: string;
    organizationId?: number;
    pageTitle?: string;
    pageDescription?: string;
    pageUrl?: string;
    pageParentUrl?: string;
    pageKeywords?: string[];
    pageQuestions?: string[];
    pageEntities?: { name: string; type: string }[];
    tokens?: number;
  };
  excluded?: boolean;
  foundFromIndexId?: number | null;
  content?: string | null;
  description?: string | null;
}

/**
 * Extract the page tree from the database.
 */
export async function getPageTree(organizationId: number, includeContent: boolean = false): Promise<TreePage[]> {
  const [pages, ordering] = await Promise.all([
    // Get all indexed pages with their embeddings metadata
    includeContent
      ? db
          .select({
            id: indexedTable.id,
            title: indexedTable.title,
            url: indexedTable.url,
            normalizedUrl: indexedTable.normalizedUrl,
            content: includeContent ? indexedContentTable.content : undefined,
            description: includeContent ? indexedTable.description : undefined,
            foundFromIndexId: indexedTable.foundFromIndexId,
            metadata: llamaindexEmbedding.metadata,
          })
          .from(indexedTable)
          .leftJoin(indexedContentTable, includeContent ? eq(indexedTable.id, indexedContentTable.indexId) : undefined)
          .leftJoin(llamaindexEmbedding, eq(indexedTable.id, llamaindexEmbedding.contentId))
          .where(
            and(
              eq(indexedTable.organizationId, organizationId),
              eq(indexedTable.skip, false),
              eq(indexedTable.status, IndexStatus.DONE)
            )
          )
          .orderBy(indexedTable.createdAt)
      : db
          .select({
            id: indexedTable.id,
            title: indexedTable.title,
            url: indexedTable.url,
            normalizedUrl: indexedTable.normalizedUrl,
            foundFromIndexId: indexedTable.foundFromIndexId,
            metadata: llamaindexEmbedding.metadata,
          })
          .from(indexedTable)
          .leftJoin(llamaindexEmbedding, eq(indexedTable.id, llamaindexEmbedding.contentId))
          .where(
            and(
              eq(indexedTable.organizationId, organizationId),
              eq(indexedTable.skip, false),
              eq(indexedTable.status, IndexStatus.DONE)
            )
          )
          .orderBy(indexedTable.createdAt),

    // Get the current ordering from llmstxt
    db
      .select({
        orderedContentIds: llmstxtTable.orderedContentIds,
      })
      .from(llmstxtTable)
      .where(and(eq(llmstxtTable.organizationId, organizationId)))
      .limit(1),
  ]);

  const extractPage = (page: PageWithMetadata) => {
    return {
      id: page.id,
      title: page.title || page.metadata?.pageTitle,
      url: page.url,
      content: page.content,
      description: page.description,
      excluded: page.excluded,
      children: page.children?.map(extractPage) || [],
    };
  };

  // If no ordering exists yet, create a tree based on metadata.pageParentUrl or foundFromIndexId
  if (!ordering[0]?.orderedContentIds?.length) {
    // Create a map of pages by URL for quick lookup
    const pagesByUrl = new Map(pages.map((page) => [page.normalizedUrl, page]));
    const rootPages: TreePage[] = [];
    const processedPages = new Set<number>();

    // Helper function to find parent and add child
    const addToParent = (page: PageWithMetadata) => {
      if (processedPages.has(page.id)) return;
      processedPages.add(page.id);

      // Try to find parent by metadata.pageParentUrl first
      const parentUrl = page.metadata?.pageParentUrl;

      if (parentUrl && pagesByUrl.has(parentUrl)) {
        const parent = pagesByUrl.get(parentUrl)! as PageWithMetadata;
        if (parent.id !== page.id) {
          parent.children = parent.children || [];
          parent.children.push(page);
          return;
        }
      }

      // Fallback to foundFromIndexId
      if (page.foundFromIndexId && pages.some((p) => p.id === page.foundFromIndexId)) {
        const parent = pages.find((p) => p.id === page.foundFromIndexId)! as PageWithMetadata;
        if (parent.id !== page.id) {
          parent.children = parent.children || [];
          parent.children.push(page);
          return;
        }
      }

      // If no parent found, add to root
      rootPages.push(page);
    };

    // Process all pages
    pages.forEach((page) => addToParent(page as PageWithMetadata));

    return rootPages.map(extractPage);
  }

  const orderedPagesIds = new Set();
  const resolvePage = (item: LlmstxtOrderedContentIds) => {
    const page: PageWithMetadata = pages.find((p) => p.id === item.contentId);
    if (!page) return null;
    orderedPagesIds.add(page.id);
    return {
      id: item.contentId,
      excluded: item.excluded,
      title: page.title || page.metadata?.pageTitle,
      url: page.url,
      description: page.description || page.metadata?.pageDescription,
      content: page.content,
      children: Object.values(item.childs).map(resolvePage),
    };
  };
  const orderedPages: TreePage[] = ordering[0].orderedContentIds.map(resolvePage);

  // Add any pages that aren't in the ordering at the end
  const unorderedPages = pages
    .filter((page) => !orderedPagesIds.has(page.id))
    .map((page) => ({ ...extractPage(page), children: [] }));

  return [...orderedPages, ...unorderedPages];
}

export function generateTocAndContent(
  onlyToc: boolean,
  pages: TreePage[],
  level: number = 0
): { toc: string[]; content: string[] } {
  const toc: string[] = [];
  const content: string[] = [];
  const indent = "  ".repeat(level);

  pages.forEach((page) => {
    if (!page) return;
    if (page.title && !page.excluded) {
      if (onlyToc) {
        toc.push(`${indent}- [${page.title}](${page.url})`);
      } else {
        toc.push(`${indent}- ${page.title}`);
      }
    }

    // Add page content
    if (!onlyToc && !page.excluded) {
      const pageContent = [
        "---",
        `# ${page.title || "Untitled"}`,
        page.description ? `\n> ${page.description}` : "",
        `\nSource: ${page.url}`,
        "\n---\n",
        page.content || "",
        "",
      ].join("\n");
      content.push(pageContent);
    }

    // Process children recursively
    if (page.children && page.children.length > 0) {
      const childResults = generateTocAndContent(onlyToc, page.children, level + (page.excluded ? 0 : 1));
      toc.push(...childResults.toc);
      content.push(...childResults.content);
    }
  });

  return { toc, content };
}

export async function getLlmsConfig(organizationId: number) {
  const configResult = await db
    .select({
      title: llmstxtTable.title,
      description: llmstxtTable.description,
      type: llmstxtTable.type,
    })
    .from(llmstxtTable)
    .where(eq(llmstxtTable.organizationId, organizationId))
    .limit(1);
  let config = configResult?.[0] || null;

  if (!config) {
    config = (
      await db
        .insert(llmstxtTable)
        .values({
          organizationId,
          title: "",
          description: "",
        })
        .returning()
    )[0];
  }
  return config;
}

export async function generateLlmsTxt(organizationId: number, fullRoute: boolean = false) {
  if (!organizationId) {
    const org = await getFirstOrganization();
    if (!org) {
      return new NextResponse("No organizations found", { status: 404 });
    }
    organizationId = org.id;
  }

  // Get the pages with their content and ordering
  const pageTree = await getPageTree(organizationId, true);
  const config = await getLlmsConfig(organizationId);

  let title = config.title || "Knowledge Base";
  if (config.description) {
    title += `\n\n${config.description}`;
  }
  const { toc, content } = generateTocAndContent(config.type === "TOC" && !fullRoute, pageTree);
  const markdown = `# ${title}\n\n## Table of Contents\n\n${toc.join("\n")}\n\n${content.join("\n")}`;
  return markdown;
}
