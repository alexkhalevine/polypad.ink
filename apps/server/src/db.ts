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
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      invite_code      TEXT NOT NULL,
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      last_visited_at  TEXT
    );

    CREATE TABLE IF NOT EXISTS geometryObjects (
      id         TEXT PRIMARY KEY,
      room_id    TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      type       TEXT NOT NULL CHECK (type IN ('box','cylinder','sphere','cone','mesh')),
      cx         REAL NOT NULL,
      cy         REAL NOT NULL,
      cz         REAL NOT NULL,
      rx         REAL,
      ry         REAL,
      rz         REAL,
      width      REAL,
      height     REAL,
      depth      REAL,
      radius     REAL,
      color      TEXT,
      positions  TEXT,
      normals    TEXT,
      indices    TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_objects_room ON geometryObjects(room_id, created_at);
  `);

  migrateMeshSupport(sqlDb);
  migrateRotationSupport(sqlDb);
  migrateConeSupport(sqlDb);
  migrateLastVisitedSupport(sqlDb);

  db = drizzle(sqlDb, { schema });

  return saveDb;
}

// Older dev DBs were created with the original CHECK (box,cylinder,sphere) and without
// the positions/normals/indices columns. SQLite doesn't allow modifying a CHECK in place,
// so when we detect the old schema we rebuild the table preserving existing rows.
function migrateMeshSupport(s: SqlJsDatabase): void {
  const cols = s.exec(`PRAGMA table_info('geometryObjects')`);
  const colNames = cols[0]?.values.map((row) => row[1] as string) ?? [];
  const hasNewColumns =
    colNames.includes("positions") && colNames.includes("normals") && colNames.includes("indices");

  const ddlRow = s.exec(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name='geometryObjects'`,
  );
  const ddl = (ddlRow[0]?.values?.[0]?.[0] as string | undefined) ?? "";
  const hasMeshInCheck = ddl.includes("'mesh'");

  if (hasNewColumns && hasMeshInCheck) return;

  s.run("BEGIN TRANSACTION;");
  try {
    s.run(`
      CREATE TABLE geometryObjects_new (
        id         TEXT PRIMARY KEY,
        room_id    TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        type       TEXT NOT NULL CHECK (type IN ('box','cylinder','sphere','mesh')),
        cx         REAL NOT NULL,
        cy         REAL NOT NULL,
        cz         REAL NOT NULL,
        rx         REAL,
        ry         REAL,
        rz         REAL,
        width      REAL,
        height     REAL,
        depth      REAL,
        radius     REAL,
        color      TEXT,
        positions  TEXT,
        normals    TEXT,
        indices    TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    const carryPositions = colNames.includes("positions") ? "positions" : "NULL AS positions";
    const carryNormals = colNames.includes("normals") ? "normals" : "NULL AS normals";
    const carryIndices = colNames.includes("indices") ? "indices" : "NULL AS indices";

    s.run(`
      INSERT INTO geometryObjects_new
        (id, room_id, type, cx, cy, cz, width, height, depth, radius, color, positions, normals, indices, created_at)
      SELECT id, room_id, type, cx, cy, cz, width, height, depth, radius, color,
             ${carryPositions}, ${carryNormals}, ${carryIndices}, created_at
      FROM geometryObjects;
    `);

    s.run("DROP TABLE geometryObjects;");
    s.run("ALTER TABLE geometryObjects_new RENAME TO geometryObjects;");
    s.run("CREATE INDEX IF NOT EXISTS idx_objects_room ON geometryObjects(room_id, created_at);");
    s.run("COMMIT;");
    markDirty();
  } catch (err) {
    s.run("ROLLBACK;");
    throw err;
  }
}

// Older DBs were created with a CHECK constraint that didn't include 'cone'.
// SQLite can't alter a CHECK in place, so when we detect its absence we rebuild
// the table preserving existing rows. Runs after the mesh and rotation migrations,
// so every column (positions/normals/indices, rx/ry/rz) is guaranteed present.
function migrateConeSupport(s: SqlJsDatabase): void {
  const ddlRow = s.exec(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name='geometryObjects'`,
  );
  const ddl = (ddlRow[0]?.values?.[0]?.[0] as string | undefined) ?? "";
  if (ddl.includes("'cone'")) return;

  s.run("BEGIN TRANSACTION;");
  try {
    s.run(`
      CREATE TABLE geometryObjects_new (
        id         TEXT PRIMARY KEY,
        room_id    TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        type       TEXT NOT NULL CHECK (type IN ('box','cylinder','sphere','cone','mesh')),
        cx         REAL NOT NULL,
        cy         REAL NOT NULL,
        cz         REAL NOT NULL,
        rx         REAL,
        ry         REAL,
        rz         REAL,
        width      REAL,
        height     REAL,
        depth      REAL,
        radius     REAL,
        color      TEXT,
        positions  TEXT,
        normals    TEXT,
        indices    TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    s.run(`
      INSERT INTO geometryObjects_new
        (id, room_id, type, cx, cy, cz, rx, ry, rz, width, height, depth, radius, color, positions, normals, indices, created_at)
      SELECT id, room_id, type, cx, cy, cz, rx, ry, rz, width, height, depth, radius, color, positions, normals, indices, created_at
      FROM geometryObjects;
    `);

    s.run("DROP TABLE geometryObjects;");
    s.run("ALTER TABLE geometryObjects_new RENAME TO geometryObjects;");
    s.run("CREATE INDEX IF NOT EXISTS idx_objects_room ON geometryObjects(room_id, created_at);");
    s.run("COMMIT;");
    markDirty();
  } catch (err) {
    s.run("ROLLBACK;");
    throw err;
  }
}

// Adds the rx/ry/rz rotation columns to DBs created before rotation support.
// SQLite allows ADD COLUMN in place, so no table rebuild is needed here.
function migrateRotationSupport(s: SqlJsDatabase): void {
  const cols = s.exec(`PRAGMA table_info('geometryObjects')`);
  const colNames = cols[0]?.values.map((row) => row[1] as string) ?? [];
  const missing = (["rx", "ry", "rz"] as const).filter((c) => !colNames.includes(c));
  if (missing.length === 0) return;

  s.run("BEGIN TRANSACTION;");
  try {
    for (const col of missing) {
      s.run(`ALTER TABLE geometryObjects ADD COLUMN ${col} REAL;`);
    }
    s.run("COMMIT;");
    markDirty();
  } catch (err) {
    s.run("ROLLBACK;");
    throw err;
  }
}

// Adds the last_visited_at column to DBs created before admin-panel support.
// SQLite allows ADD COLUMN in place, so no table rebuild is needed here.
function migrateLastVisitedSupport(s: SqlJsDatabase): void {
  const cols = s.exec(`PRAGMA table_info('rooms')`);
  const colNames = cols[0]?.values.map((row) => row[1] as string) ?? [];
  if (colNames.includes("last_visited_at")) return;

  s.run("BEGIN TRANSACTION;");
  try {
    s.run(`ALTER TABLE rooms ADD COLUMN last_visited_at TEXT;`);
    s.run("COMMIT;");
    markDirty();
  } catch (err) {
    s.run("ROLLBACK;");
    throw err;
  }
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
