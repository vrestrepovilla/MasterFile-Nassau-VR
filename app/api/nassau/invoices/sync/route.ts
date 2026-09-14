import { NextResponse } from "next/server";
import { syncNassauInvoiceEmails } from "@/lib/nassauInvoiceSync";

export async function POST() {
  try {
    const result = await syncNassauInvoiceEmails();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo sincronizar el correo." },
      { status: 500 }
    );
  }
}
