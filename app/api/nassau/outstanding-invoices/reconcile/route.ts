import { NextRequest, NextResponse } from "next/server";
import { reconcileStatement } from "@/lib/statementReconcile";
import { OUTSTANDING_INVOICE_VENDORS } from "@/lib/outstandingInvoices";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const vendor = form.get("vendor") as string | null;
  const file = form.get("file") as File | null;

  if (!vendor || !(OUTSTANDING_INVOICE_VENDORS as readonly string[]).includes(vendor)) {
    return NextResponse.json({ error: "Vendor invalido." }, { status: 400 });
  }
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Selecciona el PDF del statement." }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "El statement debe ser un PDF." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await reconcileStatement(vendor, buffer);
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "No pude encontrar ninguna referencia de PO en ese PDF. Puede que el formato de este statement sea distinto al que ya conozco." },
        { status: 422 }
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo leer el statement." },
      { status: 500 }
    );
  }
}
