import { Metadata } from "next";

import { authOrLogin } from "@repo/auth";
import IndexesTable from "./components/indexes-table";

import { Separator } from "@repo/design/shadcn/separator";
import { getAllIndexes } from "./actions";
import AddCrawlFormDialog from "./components/add-crawl-form-dialog";
import AddIndexForm from "./components/add-index-form-dialog";
import { IndexAllButton, RefreshAllButton } from "./components/buttons";
import FrontendJobProcessor from "./components/frontend-job-processor";
import { CRUDProvider } from "./providers/indexes-provider";

export const metadata: Metadata = {
  title: "Index",
  description: "Control the indexing of content for your organization.",
};

export default async function IndexesPage() {
  const session = await authOrLogin();
  const { data: initialIndexes } = await getAllIndexes({});
  return (
    <CRUDProvider initialData={initialIndexes}>
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Indexed Content</h2>
          <p className="text-muted-foreground">Here&apos;s the list of the content that will be indexed</p>
        </div>
        <div className="flex items-center space-x-2">
          <RefreshAllButton />
          <FrontendJobProcessor />
          <Separator orientation="vertical" className="h-8" />
          <IndexAllButton orgId={session.user.organizationId} />
          <Separator className="h-8" orientation="vertical" />
          <AddCrawlFormDialog />
          <AddIndexForm />
        </div>
      </div>
      <IndexesTable />
    </CRUDProvider>
  );
}
