ALTER TABLE "widget_config" ADD COLUMN "max_tokens" integer DEFAULT 2000;--> statement-breakpoint
ALTER TABLE "widget_config" ADD COLUMN "current_period_input_tokens" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "widget_config" ADD COLUMN "current_period_output_tokens" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "widget_config" ADD COLUMN "current_period_start" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "cost_input_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "cost_output_tokens" integer DEFAULT 0 NOT NULL;