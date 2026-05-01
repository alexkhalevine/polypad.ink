import { sqliteTable, text, real, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const geometryObjects = sqliteTable(
  "geometryObjects",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["box", "cylinder", "sphere"] }).notNull(),
    cx: real("cx").notNull(),
    cy: real("cy").notNull(),
    cz: real("cz").notNull(),
    width: real("width"),
    height: real("height"),
    depth: real("depth"),
    radius: real("radius"),
    color: text("color"),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("idx_objects_room").on(t.roomId, t.createdAt)]
);

export type RoomRow = typeof rooms.$inferSelect;
export type ObjectRow = typeof geometryObjects.$inferSelect;
export type NewObject = typeof geometryObjects.$inferInsert;