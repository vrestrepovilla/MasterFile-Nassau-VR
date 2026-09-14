import { Pool, types } from "pg";

// Las columnas "date" (due_date, paid_on, received_on) no deben convertirse a Date/timezone -
// eso hace que un mismo dia se corra al dia anterior o siguiente segun la zona horaria. Las
// dejamos como texto plano "YYYY-MM-DD" tal cual estan guardadas.
types.setTypeParser(1082, (value: string) => value);

declare global {
  // eslint-disable-next-line no-var
  var __cayPgPool: Pool | undefined;
}

export const pool =
  global.__cayPgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") {
  global.__cayPgPool = pool;
}
