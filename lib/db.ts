import "server-only";
import postgres from "postgres";

// Neon is accessed through the pooled (pgbouncer) endpoint, which runs in
// transaction pooling mode. Prepared statements are disabled for that reason.
// A single client is cached on globalThis so Next.js hot-reload in dev does not
// open a new pool on every module reload.

const globalForDb = globalThis as unknown as {
  sql?: ReturnType<typeof postgres>;
};

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return postgres(url, {
    ssl: "require",
    prepare: false,
    max: 10,
    idle_timeout: 20,
  });
}

const sql = globalForDb.sql ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export default sql;
