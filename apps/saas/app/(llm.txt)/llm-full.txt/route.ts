import { NextResponse } from "next/server";
import type { IndexedPage } from "../utils";
import { buildPageTree, getFirstOrganization, getIndexedContent } from "../utils";

export const revalidate = 3600; // 1 hour

export async function generateStaticParams() {
  const org = await getFirstOrganization();
  return [{ organizationId: org?.id }];
}

export async function generateMetadata({ params }: { params: { organizationId?: string } }) {
  return {
    title: "Knowledge Base",
    description: "Full knowledge base content",
  };
}

function generateTocAndContent(pages: IndexedPage[], level: number = 0): { toc: string[]; content: string[] } {
  const toc: string[] = [];
  const content: string[] = [];
  const indent = "  ".repeat(level);

  pages.forEach((page) => {
    if (page.title) {
      toc.push(`${indent}- ${page.title}`);
    }

    // Add page content
    const pageContent = [
      "---",
      `# ${page.title || "Untitled"}` + (page.description ? `\n\n> ${page.description}` : ""),
      `Source: ${page.url}`,
      "---\n",
      page.content?.replace(/^(#.+)$/gm, "#$1") || "",
      "",
    ].join("\n");
    content.push(pageContent);

    // Process children recursively
    if (page.children && page.children.length > 0) {
      const childResults = generateTocAndContent(page.children, level + 1);
      toc.push(...childResults.toc);
      content.push(...childResults.content);
    }
  });

  return { toc, content };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let organizationId = searchParams.get("organizationId");
  const title = "Knowledge Base";

  if (!organizationId) {
    const org = await getFirstOrganization();
    if (!org) {
      return new NextResponse("No organizations found", { status: 404 });
    }
    organizationId = org.id;
  }

  const pages = await getIndexedContent(organizationId);
  const pageTree = buildPageTree(pages);
  const { toc, content } = generateTocAndContent(pageTree);

  const markdown = `# ${title}\n\n## Table of Contents\n\n${toc.join("\n")}\n\n${content.join("\n")}`;

  // Set content type header
  const headers = new Headers();
  headers.set("Content-Type", "text/markdown");

  return new NextResponse(markdown, {
    headers,
    status: 200,
  });
}
