import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __rivoPostgresqlPool?: Pool;
};

const poolMax = Math.max(1, Math.min(20, Number(process.env.PG_POOL_MAX ?? 5) || 5));
const poolIdleTimeout = Math.max(1000, Number(process.env.PG_IDLE_TIMEOUT_MS ?? 10000) || 10000);
const poolConnectionTimeout = Math.max(1000, Number(process.env.PG_CONNECTION_TIMEOUT_MS ?? 5000) || 5000);

export const pool = globalForDb.__rivoPostgresqlPool ?? new Pool({
  connectionString: databaseUrl,
  max: poolMax,
  idleTimeoutMillis: poolIdleTimeout,
  connectionTimeoutMillis: poolConnectionTimeout,
  keepAlive: true,
  application_name: "rivo-store",
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.__rivoPostgresqlPool = pool;
}

export const db = drizzle(pool);
