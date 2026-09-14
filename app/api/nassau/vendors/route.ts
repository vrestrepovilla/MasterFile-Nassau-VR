import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  const { rows } = await pool.query<{ name: string }>("SELECT name FROM nassau_vendors ORDER BY name");
  return NextResponse.json({ vendors: rows.map((r) => r.name) });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "El nombre del proveedor es obligatorio." }, { status: 400 });
  }

  try {
    await pool.query(
      `INSERT INTO nassau_vendors (name) VALUES ($1)
       ON CONFLICT (name) DO NOTHING`,
      [name]
    );
    return NextResponse.json({ ok: true, name });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo crear el proveedor." },
      { status: 500 }
    );
  }
}
