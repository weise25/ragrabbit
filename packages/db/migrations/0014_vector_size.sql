ALTER TABLE "indexed_content_embeddings" ALTER COLUMN "embeddings" SET DATA TYPE vector(256);--> statement-breakpoint
ALTER TABLE "widget_config" ALTER COLUMN "max_tokens" SET DEFAULT 20;