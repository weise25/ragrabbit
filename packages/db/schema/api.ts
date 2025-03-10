import { pgTable, serial, integer, varchar, timestamp, unique } from "drizzle-orm/pg-core";

export const apiKeysTable = pgTable(
  "api_keys",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    key: varchar("key", { length: 255 }).notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => {
    return {
      uniqueOrgKey: unique().on(table.organizationId, table.key),
    };
  }
);
