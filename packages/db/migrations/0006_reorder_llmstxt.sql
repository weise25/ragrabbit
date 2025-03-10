CREATE TYPE "public"."llmstxt_type" AS ENUM('TOC', 'FULL');--> statement-breakpoint
CREATE TABLE "llmstxt" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"type" "llmstxt_type" DEFAULT 'FULL' NOT NULL,
	"content" text NOT NULL,
	"ordered_content_ids" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "llmstxt_organizationId_type_unique" UNIQUE("organization_id","type")
);
--> statement-breakpoint
ALTER TABLE "llmstxt" ADD CONSTRAINT "llmstxt_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;