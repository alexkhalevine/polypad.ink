import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import fs from "fs";
import * as schema from "./schema.js";

const DB_PATH = process.env.DB_PATH ?? "data/dev.sqlite";
const absPath = path.resolve(process.cwd(), DB_PATH);

fs.mkdirSync(path.dirname(absPath), { recursive: true });

const sqlite = new Database(absPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS geometryObjects (
    id         TEXT PRIMARY KEY,
    room_id    TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    type       TEXT NOT NULL CHECK (type IN ('box','cylinder','sphere')),
    cx         REAL NOT NULL,
    cy         REAL NOT NULL,
    cz         REAL NOT NULL,
    width      REAL,
    height     REAL,
    depth      REAL,
    radius     REAL,
    color      TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_objects_room ON geometryObjects(room_id, created_at);
`);

export const db = drizzle(sqlite, { schema });