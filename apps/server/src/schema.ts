import { sqliteTable, text, real, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const geometryObjects = sqliteTable(
  "geometryObjects",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["box", "cylinder", "sphere", "mesh"] }).notNull(),
    cx: real("cx").notNull(),
    cy: real("cy").notNull(),
    cz: real("cz").notNull(),
    // Euler XYZ rotation in radians, about the object's geometric center. Nullable
    // for rows created before rotation support; treated as 0 when absent.
    rx: real("rx"),
    ry: real("ry"),
    rz: real("rz"),
    width: real("width"),
    height: real("height"),
    depth: real("depth"),
    radius: real("radius"),
    color: text("color"),
    positions: text("positions"),
    normals: text("normals"),
    indices: text("indices"),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("idx_objects_room").on(t.roomId, t.createdAt)]
);

export type RoomRow = typeof rooms.$inferSelect;
export type ObjectRow = typeof geometryObjects.$inferSelect;
export type NewObject = typeof geometryObjects.$inferInsert;