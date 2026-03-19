/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../.env") });

function pickSqlPath() {
  const arg = process.argv.find((a) => a.startsWith("--file="));
  if (arg) return arg.slice("--file=".length);
  return path.join(__dirname, "../sql/001_init.sql");
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está definida en el entorno (.env)");
  }

  const sqlPath = pickSqlPath();
  const sql = fs.readFileSync(sqlPath, "utf8");

  const needsSsl =
    /sslmode=require/i.test(connectionString) ||
    String(process.env.PGSSLMODE || "").toLowerCase() === "require";

  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 5000,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  const client = await pool.connect();
  try {
    console.log(`[migrate] ejecutando: ${sqlPath}`);
    await client.query(sql);
    console.log("[migrate] OK");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[migrate] ERROR:", err && err.message ? err.message : err);
  process.exitCode = 1;
});

