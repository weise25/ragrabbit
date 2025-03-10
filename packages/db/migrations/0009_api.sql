CREATE TYPE "public"."index_source" AS ENUM('MANUAL', 'API');--> statement-breakpoint
CREATE TYPE "public"."index_type" AS ENUM('URL', 'CONTENT');--> statement-breakpoint
ALTER TABLE "indexed" ADD COLUMN "type" "index_type" DEFAULT 'URL' NOT NULL;--> statement-breakpoint
ALTER TABLE "indexed" ADD COLUMN "source" "index_source" DEFAULT 'MANUAL' NOT NULL;