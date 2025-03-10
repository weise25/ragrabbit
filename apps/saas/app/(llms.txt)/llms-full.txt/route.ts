import { NextResponse } from "next/server";
import type { IndexedPage, TreePage } from "../utils";
import { generateLlmsTxt, generateTocAndContent, getFirstOrganization, getPageTree } from "../utils";

export const revalidate = 86400; // 1 day

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let organizationId = parseInt(searchParams.get("organizationId"));

  const markdown = await generateLlmsTxt(organizationId, true);
  if (markdown instanceof NextResponse) {
    return markdown;
  }
  // Set content type header
  const headers = new Headers();
  headers.set("Content-Type", "text/markdown");

  return new NextResponse(markdown, {
    headers,
    status: 200,
  });
}
