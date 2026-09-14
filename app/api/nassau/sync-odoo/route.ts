import { NextResponse } from "next/server";
import { syncNassauFromOdoo } from "@/lib/odooSync";

export async function POST() {
  try {
    const result = await syncNassauFromOdoo();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo sincronizar con Odoo." },
      { status: 500 }
    );
  }
}
