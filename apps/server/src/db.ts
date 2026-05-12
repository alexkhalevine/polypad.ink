import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import { drizzle } from "drizzle-orm/sql-js";
import path from "path";
import fs from "fs";
import * as schema from "./schema.js";

const DB_PATH = process.env.DB_PATH ?? "data/dev.sqlite";
const absPath = path.resolve(process.cwd(), DB_PATH);

fs.mkdirSync(path.dirname(absPath), { recursive: true });

let db: ReturnType<typeof drizzle<typeof schema>>;
let sqlDb: SqlJsDatabase;
let dirty = false;
let saving = false;

export function markDirty(): void {
  dirty = true;
}

async function initDb() {
  const SQL = await initSqlJs();

  let fileBuffer: Uint8Array | undefined;
  if (fs.existsSync(absPath)) {
    fileBuffer = new Uint8Array(fs.readFileSync(absPath));
  }

  sqlDb = new SQL.Database(fileBuffer);

  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      invite_code TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
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

  db = drizzle(sqlDb, { schema });

  return saveDb;
}

async function saveDb(): Promise<void> {
  if (!sqlDb || !dirty || saving) return;
  saving = true;
  dirty = false;
  try {
    const data = sqlDb.export();
    const buffer = Buffer.from(data);
    await fs.promises.writeFile(absPath, buffer);
  } catch (err) {
    // Re-mark dirty so the next tick retries. Don't crash the server on a transient FS error.
    dirty = true;
    console.error("[db] saveDb failed:", err);
  } finally {
    saving = false;
  }
}

function saveDbSync(): void {
  if (!sqlDb) return;
  const data = sqlDb.export();
  fs.writeFileSync(absPath, Buffer.from(data));
  dirty = false;
}

setInterval(() => {
  void saveDb();
}, 5000);

export { db, initDb, saveDb, saveDbSync };
