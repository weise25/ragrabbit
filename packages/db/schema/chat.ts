import { relations } from "drizzle-orm/relations";
import { pgEnum, pgTable, text, timestamp, integer, primaryKey, uuid, jsonb, varchar } from "drizzle-orm/pg-core";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { organizationsTable } from "./auth";
import { unique } from "drizzle-orm/pg-core";
import { uniqueIndex } from "drizzle-orm/pg-core";

// Enum for message roles
export const messageRoleEnum = pgEnum("message_role", ["system", "user", "assistant", "data"]);

// Table for storing chats
export const chatsTable = pgTable(
  "chats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: varchar("chat_id").notNull(),
    userId: varchar("user_id").notNull(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    title: text("title"),
    ip: text("ip"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [uniqueIndex("chat_user_id").on(table.userId, table.chatId)]
);

export type Chat = InferSelectModel<typeof chatsTable>;
export type NewChat = InferInsertModel<typeof chatsTable>;

// Table for storing messages within chats
export const messagesTable = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chatsTable.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  reasoning: text("reasoning"),
  data: jsonb("data"),
  annotations: jsonb("annotations").$type<any[]>(),
  toolInvocations: jsonb("tool_invocations").$type<
    {
      state: "partial-call" | "call" | "result";
      id: string;
      name: string;
      args?: any;
      result?: any;
    }[]
  >(),
  experimental_attachments: jsonb("experimental_attachments").$type<
    {
      name?: string;
      contentType?: string;
      url: string;
    }[]
  >(),
  tokenCount: integer("token_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

export type Message = InferSelectModel<typeof messagesTable>;
export type NewMessage = InferInsertModel<typeof messagesTable>;

// Relations
export const chatRelations = relations(chatsTable, ({ many }) => ({
  messages: many(messagesTable),
}));

export const messageRelations = relations(messagesTable, ({ one }) => ({
  chat: one(chatsTable, {
    fields: [messagesTable.chatId],
    references: [chatsTable.id],
  }),
}));
