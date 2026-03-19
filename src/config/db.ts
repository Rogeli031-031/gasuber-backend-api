import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const schemaRaw = process.env.DB_SCHEMA ?? "public";

if (!connectionString) {
  throw new Error("DATABASE_URL no está definida en .env");
}

if (!/^[a-z_][a-z0-9_]*$/i.test(schemaRaw)) {
  throw new Error("DB_SCHEMA inválido (usa solo letras/números/guion_bajo)");
}

const needsSsl =
  /sslmode=require/i.test(connectionString) ||
  process.env.PGSSLMODE?.toLowerCase() === "require";

export const DB_SCHEMA = schemaRaw;

export const db = new Pool({
  connectionString,
  connectionTimeoutMillis: 5000,
  ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  options: `-c search_path=${DB_SCHEMA},public`,
});

