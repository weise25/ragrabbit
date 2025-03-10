import { Metadata } from "next";
import { authOrLogin } from "@repo/auth";
import ApiKeysTable from "./components/api-keys-table";
import { getAllApiKeys } from "./actions";
import CreateApiKeyDialog from "./components/create-api-key-dialog";
import { revalidatePath } from "next/cache";
import { useCallback } from "react";

export const metadata: Metadata = {
  title: "API Keys",
  description: "Manage your API keys.",
};

export default async function ApiKeysPage() {
  const session = await authOrLogin();
  const { data: result } = await getAllApiKeys({ page: 1, pageSize: 10 });

  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">API Keys</h2>
          <p className="text-muted-foreground">Manage your API keys for accessing the API</p>
        </div>
        <div className="flex items-center space-x-2">
          <CreateApiKeyDialog />
        </div>
      </div>
      <ApiKeysTable initialApiKeys={result.apiKeys} initialTotalCount={result.totalCount} />
    </>
  );
}
