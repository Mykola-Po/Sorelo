import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/shared/config/env";
import {
  resolveRuntimeDatabasePoolSize,
  resolveRuntimeDatabaseUrl,
} from "@/shared/db/runtime-config";
import * as schema from "@/shared/db/schema";

declare global {
  var __sorela_sql__: ReturnType<typeof postgres> | undefined;
}

export function resolveSqlClientOptions(databaseUrl: string) {
  return {
    prepare: false,
    // Keep a tiny pool when we are behind the Supabase pooler so warm serverless
    // instances do not reserve more clients than they need.
    max: resolveRuntimeDatabasePoolSize(databaseUrl),
    idle_timeout: 5,
    connect_timeout: 10,
  } as const;
}

const sql =
  globalThis.__sorela_sql__ ??
  postgres(
    resolveRuntimeDatabaseUrl(env.DATABASE_URL),
    resolveSqlClientOptions(env.DATABASE_URL)
  );

globalThis.__sorela_sql__ = sql;

export const sqlClient = sql;
export const db = drizzle(sql, { schema, casing: "snake_case" });
export type Database = typeof db;
