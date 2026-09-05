import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "";
const usesTransactionPooler = /pooler\.supabase\.com:6543/.test(
  connectionString,
);

if (usesTransactionPooler) {
  console.warn(
    "DATABASE_URL uses the Supabase transaction pooler (port 6543). node-pg prepared statements often fail there. Use the Session pooler (port 5432) or the Direct connection string instead.",
  );
}

const pool = new Pool({
  connectionString: connectionString || undefined,
  ssl: connectionString ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.error("Unexpected Postgres pool error", err);
});

export default pool;
