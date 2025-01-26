export type RagMetadata = {
  contentId: string;
  organizationId: number;
  pageTitle?: string;
  pageDescription?: string;
  keywords?: string[];
  questions?: string[];
  entities?: Array<{ name: string; type: string }>;
  tokens?: number;
};
