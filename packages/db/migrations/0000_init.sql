CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE "public"."index_status" AS ENUM('PENDING', 'PROCESSING', 'SCRAPED', 'DONE', 'SKIPPED', 'ERROR');--> statement-breakpoint
CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "authenticator" (
	"credentialID" text NOT NULL,
	"userId" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"credentialPublicKey" text NOT NULL,
	"counter" integer NOT NULL,
	"credentialDeviceType" text NOT NULL,
	"credentialBackedUp" boolean NOT NULL,
	"transports" text,
	CONSTRAINT "authenticator_pk" PRIMARY KEY("userId","credentialID"),
	CONSTRAINT "authenticator_credentialID_unique" UNIQUE("credentialID")
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	"organizationId" integer DEFAULT 1,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "indexed_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"index_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "indexed_content_indexId_unique" UNIQUE("index_id")
);
--> statement-breakpoint
CREATE TABLE "indexed" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"url" varchar NOT NULL,
	"normalized_url" varchar NOT NULL,
	"canonical_url" varchar,
	"title" varchar,
	"description" text,
	"scrape_options" jsonb DEFAULT '{}'::jsonb,
	"do_crawl" boolean DEFAULT false NOT NULL,
	"is_sitemap" boolean DEFAULT false NOT NULL,
	"found_from_index_id" integer,
	"depth" integer DEFAULT 0 NOT NULL,
	"status" "index_status" DEFAULT 'PENDING' NOT NULL,
	"error" text,
	"hash" varchar,
	"skip" boolean DEFAULT false NOT NULL,
	"skip_reason" text,
	"reindex_at" timestamp,
	"indexed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "indexed_organizationId_normalizedUrl_unique" UNIQUE("organization_id","normalized_url"),
	CONSTRAINT "indexed_organizationId_hash_unique" UNIQUE("organization_id","hash")
);
--> statement-breakpoint
CREATE TABLE "indexed_content_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" varchar,
	"collection" varchar,
	"document" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"content_id" integer GENERATED ALWAYS AS ((metadata ->> 'contentId')::int) STORED,
	"embeddings" vector(1536)
);
--> statement-breakpoint
CREATE TABLE "widget_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"suggested_queries" jsonb DEFAULT '[]'::jsonb,
	"welcome_message" text,
	"logo_url" varchar,
	CONSTRAINT "widget_config_organizationId_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authenticator" ADD CONSTRAINT "authenticator_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indexed_content" ADD CONSTRAINT "indexed_content_index_id_indexed_id_fk" FOREIGN KEY ("index_id") REFERENCES "public"."indexed"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indexed" ADD CONSTRAINT "indexed_found_from_index_id_indexed_id_fk" FOREIGN KEY ("found_from_index_id") REFERENCES "public"."indexed"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indexed_content_embeddings" ADD CONSTRAINT "indexed_content_embeddings_content_id_indexed_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."indexed"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "widget_config" ADD CONSTRAINT "widget_config_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "indexed_organization_id_found_from_index_id_index" ON "indexed" USING btree ("organization_id","found_from_index_id");--> statement-breakpoint
CREATE INDEX "indexed_organization_id_status_index" ON "indexed" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_llamaindex_embedding_collection" ON "indexed_content_embeddings" USING btree ("collection");--> statement-breakpoint
CREATE INDEX "idx_llamaindex_embedding_metadata_page_id" ON "indexed_content_embeddings" USING btree (("metadata" ->> '{contentId}'));--> statement-breakpoint
CREATE INDEX "idx_llamaindex_embedding_organization_id" ON "indexed_content_embeddings" USING btree (("metadata" ->> '{organizationId}'));