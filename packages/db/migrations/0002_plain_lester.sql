ALTER TABLE "chats" DROP CONSTRAINT "chat_user_id";--> statement-breakpoint
CREATE UNIQUE INDEX "chat_user_id" ON "chats" USING btree ("user_id","chat_id");