import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { initializeCms } from "./bootstrap";
import * as schema from "./schema";

type CmsDatabase = BetterSQLite3Database<typeof schema>;

const globalCms = globalThis as typeof globalThis & {
  cmsSqlite?: Database.Database;
  cmsDb?: CmsDatabase;
};

function dataDirectory() {
  return path.resolve(
    /* turbopackIgnore: true */ process.env.CMS_DATA_DIR || path.join(process.cwd(), "storage"),
  );
}

export function getUploadsDirectory() {
  const directory = path.join(dataDirectory(), "uploads");
  mkdirSync(directory, { recursive: true });
  return directory;
}

export function getSqlite() {
  if (globalCms.cmsSqlite) return globalCms.cmsSqlite;

  mkdirSync(dataDirectory(), { recursive: true });
  const databasePath = path.join(dataDirectory(), "cms.sqlite");
  const sqlite = new Database(databasePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  initializeCms(sqlite);

  globalCms.cmsSqlite = sqlite;
  globalCms.cmsDb = db;
  return sqlite;
}

export function getDb() {
  if (!globalCms.cmsDb) getSqlite();
  return globalCms.cmsDb as CmsDatabase;
}
