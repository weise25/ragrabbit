ALTER TABLE "llmstxt" DROP CONSTRAINT "llmstxt_organizationId_type_unique";--> statement-breakpoint
ALTER TABLE "llmstxt" ALTER COLUMN "content" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "llmstxt" ADD COLUMN "content_toc" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "llmstxt" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "llmstxt" ADD CONSTRAINT "llmstxt_organizationId_unique" UNIQUE("organization_id");