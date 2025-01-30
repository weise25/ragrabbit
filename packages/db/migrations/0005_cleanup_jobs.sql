ALTER TYPE "public"."index_status" ADD VALUE 'PENDING_CLEAN' BEFORE 'SKIPPED';--> statement-breakpoint
ALTER TYPE "public"."index_status" ADD VALUE 'OUTDATED';