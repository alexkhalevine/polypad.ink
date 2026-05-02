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

async function initDb() {
  const SQL = await initSqlJs();

  let fileBuffer: Uint8Array | undefined;
  if (fs.existsSync(absPath)) {
    fileBuffer = new Uint8Array(fs.readFileSync(absPath));
  }

  sqlDb = new SQL.Database(fileBuffer);

  sqlDb.run(`
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

  db = drizzle(sqlDb, { schema });

  // Export a save function
  return saveDb;
}

function saveDb() {
  if (sqlDb) {
    const data = sqlDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(absPath, buffer);
  }
}

// Auto-save every 5 seconds
setInterval(saveDb, 5000);

export { db, initDb, saveDb };