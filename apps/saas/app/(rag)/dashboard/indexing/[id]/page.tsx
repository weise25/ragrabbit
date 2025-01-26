import { authOrLogin } from "@repo/auth";
import db from "@repo/db";
import { and, eq } from "@repo/db/drizzle";
import { Indexed, IndexedContent, indexedTable, llamaindexEmbedding } from "@repo/db/schema";
import {
  ArrowLeft,
  FileText,
  ListTree,
  Search,
  FileIcon,
  Calendar,
  Hash,
  Type,
  FileQuestion,
} from "@repo/design/base/icons";
import { Button } from "@repo/design/shadcn/button";
import { Card, CardContent } from "@repo/design/shadcn/card";
import { Separator } from "@repo/design/shadcn/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/design/shadcn/tabs";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReEmbeddingsButton } from "../components/buttons";
import { ReScrapeButton } from "../components/buttons";
import { RagMetadata } from "@repo/rag/indexing/metadata.type";

function formatBytes(bytes: number) {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function countWords(str: string) {
  return str.trim().split(/\s+/).length;
}

export default async function IndexContentPage({ params }: { params: { id: string } }) {
  const session = await authOrLogin();
  const { id } = await params;
  const indexId = parseInt(id);
  if (isNaN(indexId)) {
    notFound();
  }

  const indexed: Indexed & { indexedContent: IndexedContent } = (await db.query.indexedTable.findFirst({
    where: and(eq(indexedTable.id, indexId), eq(indexedTable.organizationId, session.user.organizationId)),
    with: {
      indexedContent: true,
    },
  })) as any;

  if (!indexed) {
    notFound();
  }

  // Fetch embeddings for this content
  const embeddings = await db.select().from(llamaindexEmbedding).where(eq(llamaindexEmbedding.contentId, indexId));

  const indexedContent = indexed.indexedContent;

  const metadata = embeddings[0]?.metadata as RagMetadata;
  const wordCount = indexedContent ? countWords(indexedContent.content) : 0;
  const contentSize = indexedContent ? new TextEncoder().encode(indexedContent.content).length : 0;

  // Group entities by type
  const groupedEntities =
    metadata?.entities?.reduce((acc: Record<string, string[]>, entity) => {
      if (!acc[entity.type]) {
        acc[entity.type] = [];
      }
      acc[entity.type].push(entity.name);
      return acc;
    }, {}) || {};

  const totalTokens = metadata?.tokens || 0;

  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" asChild className="h-8 w-8">
              <Link href="/dashboard/indexing">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h2 className="text-2xl font-bold tracking-tight">{indexed.title || "Untitled Content"}</h2>
          </div>
          <p className="text-muted-foreground">View and analyze the indexed content details</p>
        </div>
        <div className="flex items-center space-x-2">
          <ReScrapeButton indexIds={[indexId]} refresh={true} />
          <ReEmbeddingsButton indexIds={[indexId]} refresh={true} />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <FileIcon className="h-4 w-4" />
                  Title
                </div>
                <div className="font-medium truncate">{indexed.title}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Type
                </div>
                <div className="font-medium">Web Page</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Size
                </div>
                <div className="font-medium">{formatBytes(contentSize)}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <FileQuestion className="h-4 w-4" />
                  Status
                </div>
                <div className="font-medium capitalize">{indexed.status.toLowerCase()}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Indexed Date
                </div>
                <div className="font-medium">{indexed.indexedAt?.toLocaleDateString() || "Pending"}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Word Count
                </div>
                <div className="font-medium">{wordCount.toLocaleString()}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Tokens
                </div>
                <div className="font-medium">{totalTokens.toLocaleString()}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <ListTree className="h-4 w-4" />
                  Chunks
                </div>
                <div className="font-medium">{embeddings.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="analysis" className="w-full">
          <TabsList>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="original" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Original Text
            </TabsTrigger>
            <TabsTrigger value="chunks" className="flex items-center gap-2">
              <ListTree className="h-4 w-4" />
              Chunks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analysis">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4" />
                      <h3 className="text-lg font-semibold">Title</h3>
                    </div>
                    <p className="text-muted-foreground">{metadata?.pageTitle || "No title"}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4" />
                      <h3 className="text-lg font-semibold">Summary</h3>
                    </div>
                    <p className="text-muted-foreground">{metadata?.pageDescription || "No description"}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileQuestion className="h-4 w-4" />
                      <h3 className="text-lg font-semibold">Questions</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {metadata?.questions?.map((question, i) => (
                        <span key={i} className="rounded-full bg-primary/10 text-primary px-3 py-1 text-sm">
                          {question}
                        </span>
                      )) || "No questions"}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Hash className="h-4 w-4" />
                      <h3 className="text-lg font-semibold">Keywords</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {metadata?.keywords?.map((keyword, i) => (
                        <span key={i} className="rounded-full bg-background border px-3 py-1 text-sm">
                          {keyword}
                        </span>
                      )) || "No keywords"}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Type className="h-4 w-4" />
                      <h3 className="text-lg font-semibold">Entities</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.entries(groupedEntities).map(([type, entities]) => (
                        <div key={type} className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground capitalize">{type}</h4>
                          <div className="flex flex-wrap gap-2">
                            {entities.map((name, i) => (
                              <span key={i} className="rounded-full bg-background border px-3 py-1 text-sm">
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                      {Object.keys(groupedEntities).length === 0 && <p>No entities</p>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="original">
            <Card>
              <CardContent className="pt-6 bg-muted/50">
                <pre className="whitespace-pre-wrap text-sm rounded-lg">{indexedContent?.content || "No content"}</pre>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chunks">
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Content Chunks</h3>
                    <p className="text-sm text-muted-foreground">
                      {embeddings.length} chunks, {totalTokens.toLocaleString()} tokens total
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {embeddings.map((embedding, i) => (
                    <div key={i} className="border rounded-lg">
                      <div className="border-b bg-muted/50 px-4 py-2 flex items-center justify-between">
                        <div className="font-medium">Chunk {i + 1}</div>
                        <div className="text-sm text-muted-foreground">
                          {embedding.document.length.toLocaleString()} characters
                        </div>
                      </div>
                      <div className="p-4">
                        <pre className="whitespace-pre-wrap text-sm max-h-[200px] overflow-y-auto">
                          {embedding.document}
                        </pre>
                      </div>
                    </div>
                  ))}
                  {embeddings.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">No chunks available</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
