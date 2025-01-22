import { authOrLogin } from "@repo/auth";
import db from "@repo/db";
import { and, eq } from "@repo/db/drizzle";
import { indexedTable } from "@repo/db/schema";
import { ArrowLeft } from "@repo/design/base/icons";
import { Button } from "@repo/design/shadcn/button";
import { Card, CardContent } from "@repo/design/shadcn/card";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReEmbeddingsButton } from "../components/buttons";
import { ReScrapeButton } from "../components/buttons";

export default async function IndexContentPage({ params }: { params: { id: string } }) {
  const session = await authOrLogin();
  const { id } = await params;
  const indexId = parseInt(id);
  if (isNaN(indexId)) {
    notFound();
  }

  const indexed = await db.query.indexedTable.findFirst({
    where: and(eq(indexedTable.id, indexId), eq(indexedTable.organizationId, session.user.organizationId)),
    with: {
      indexedContent: true,
    },
  });

  if (!indexed) {
    notFound();
  }

  const indexedContent = indexed.indexedContent;
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/indexing`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Page Content:&nbsp;
            {indexedContent ? (
              <span className="hyphens-auto">{indexed.title}</span>
            ) : (
              <span className="text-muted-foreground">Pending</span>
            )}
          </h2>
          <p className="text-muted-foreground">Last scraped at {indexed.indexedAt?.toLocaleString() || "Pending"}</p>
        </div>
        <div className="flex items-center space-x-2">
          <ReScrapeButton indexIds={[indexId]} refresh={true} />
          <ReEmbeddingsButton indexIds={[indexId]} refresh={true} />
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <pre className="whitespace-pre-wrap">{indexedContent?.content || "No content"}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
