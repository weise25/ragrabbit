DROP TYPE "public"."llmstxt_type";--> statement-breakpoint
CREATE TYPE "public"."llmstxt_type" AS ENUM('SINGLE', 'TOC');--> statement-breakpoint
ALTER TABLE "llmstxt" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "llmstxt" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "llmstxt" ADD COLUMN "type" "llmstxt_type" DEFAULT 'TOC';--> statement-breakpoint
ALTER TABLE "public"."llmstxt" ALTER COLUMN "type" SET DATA TYPE "public"."llmstxt_type" USING "type"::"public"."llmstxt_type";