import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import dotenv from "dotenv";

const { Pool } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Falta DATABASE_URL en .env.local");
    process.exit(1);
  }

  const sql = readFileSync(join(__dirname, "..", "db", "schema.sql"), "utf8");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pool.query(sql);
    console.log("Migracion aplicada correctamente.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Error aplicando la migracion:", err);
  process.exit(1);
});
