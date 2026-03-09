import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/shared/config/env";
import * as schema from "@/shared/db/schema";

declare global {
  var __sorela_sql__: ReturnType<typeof postgres> | undefined;
}

const sql =
  globalThis.__sorela_sql__ ??
  postgres(env.DATABASE_URL, {
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__sorela_sql__ = sql;
}

export const db = drizzle(sql, { schema, casing: "snake_case" });
export type Database = typeof db;
