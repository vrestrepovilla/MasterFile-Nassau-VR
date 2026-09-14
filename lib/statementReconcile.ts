import PDFParser from "pdf2json";
import { pool } from "@/lib/db";

export type StatementLine = {
  poRaw: string;
  poNormalized: string;
  amount: number;
  invoiceRef: string | null;
  transactionType: string;
};

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

// "PO0351" / "P00351" / "po0365" -> "351" - asi comparamos el numero de PO del statement del
// proveedor contra el po_number del Master File sin importar el formato exacto (letras, ceros).
export function normalizePoNumber(po: string): string {
  const digits = po.replace(/\D/g, "");
  return String(Number(digits || "0"));
}

// Lee un PDF de statement (uno digitalmente generado, no una foto/escaneo) y saca las lineas que
// tengan una referencia "PO:xxxx" y un monto - funciona con el formato de statement de Premier
// Importers; otros proveedores pueden necesitar ajustes si su formato es muy distinto.
export async function extractStatementLines(buffer: Buffer): Promise<StatementLine[]> {
  const parser = new PDFParser();
  const data = await new Promise<any>((resolve, reject) => {
    parser.on("pdfParser_dataError", (err: any) => reject(err?.parserError ?? err));
    parser.on("pdfParser_dataReady", (d: any) => resolve(d));
    parser.parseBuffer(buffer);
  });

  const lines: StatementLine[] = [];

  for (const page of data.Pages ?? []) {
    const items = (page.Texts ?? []).map((t: any) => ({
      x: t.x,
      y: t.y,
      text: safeDecode((t.R ?? []).map((r: any) => r.T).join("")),
    }));

    const rows = new Map<number, typeof items>();
    for (const item of items) {
      const key = Math.round(item.y * 2) / 2;
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key)!.push(item);
    }

    for (const key of Array.from(rows.keys()).sort((a, b) => a - b)) {
      const rowItems = rows.get(key)!.sort((a: any, b: any) => a.x - b.x);
      const rowText = rowItems.map((i: any) => i.text).join(" | ");

      const poMatch = rowText.match(/PO:\s*([A-Za-z0-9]+)/i);
      if (!poMatch) continue;

      const amounts = Array.from(rowText.matchAll(/(\(?)\$([\d,]+\.\d{2})\)?/g));
      if (amounts.length === 0) continue;
      const last = amounts[amounts.length - 1];
      const isNegative = last[1] === "(";
      const amount = Number(last[2].replace(/,/g, "")) * (isNegative ? -1 : 1);

      const invoiceMatch = rowText.match(/\b(\d{4,})\b/);
      const typeMatch = rowText.match(/Sales (Invoice|Credit Memo)/i);

      lines.push({
        poRaw: poMatch[1],
        poNormalized: normalizePoNumber(poMatch[1]),
        amount,
        invoiceRef: invoiceMatch ? invoiceMatch[1] : null,
        transactionType: typeMatch ? typeMatch[0] : "?",
      });
    }
  }

  return lines;
}

export type ReconcileRow = {
  poNumber: string;
  statementAmount: number;
  masterFileEntryId: string | null;
  masterFileAmount: number | null;
  masterFilePaymentStatus: string | null;
  masterFileInvoiceNumber: string | null;
  verdict: "paid_ok" | "amount_mismatch" | "still_owed" | "not_found_in_master_file";
};

export async function reconcileStatement(
  vendor: string,
  buffer: Buffer
): Promise<{ rows: ReconcileRow[]; notOnStatement: { poNumber: string; amount: number | null; invoiceNumber: string | null }[] }> {
  const lines = await extractStatementLines(buffer);

  // Sumar por PO (para casos como notas de credito + re-facturacion que se cancelan entre si).
  const byPo = new Map<string, { poRaw: string; amount: number }>();
  for (const line of lines) {
    const existing = byPo.get(line.poNormalized);
    if (existing) existing.amount += line.amount;
    else byPo.set(line.poNormalized, { poRaw: line.poRaw, amount: line.amount });
  }

  const { rows: entries } = await pool.query(
    `SELECT id, po_number, invoice_number, amount, payment_status
     FROM master_file_entries
     WHERE location = 'nassau' AND vendor = $1`,
    [vendor]
  );
  const entriesByNormalizedPo = new Map<string, (typeof entries)[number]>();
  for (const e of entries) entriesByNormalizedPo.set(normalizePoNumber(e.po_number), e);

  const rows: ReconcileRow[] = [];
  for (const [poNormalized, { poRaw, amount }] of byPo) {
    const entry = entriesByNormalizedPo.get(poNormalized);
    if (!entry) {
      rows.push({
        poNumber: poRaw,
        statementAmount: amount,
        masterFileEntryId: null,
        masterFileAmount: null,
        masterFilePaymentStatus: null,
        masterFileInvoiceNumber: null,
        verdict: "not_found_in_master_file",
      });
      continue;
    }
    const masterFileAmount = entry.amount != null ? Number(entry.amount) : null;
    let verdict: ReconcileRow["verdict"];
    if (entry.payment_status === "Paid") {
      verdict = "paid_ok";
    } else if (masterFileAmount != null && Math.abs(masterFileAmount - amount) > 0.05) {
      verdict = "amount_mismatch";
    } else {
      verdict = "still_owed";
    }
    rows.push({
      poNumber: entry.po_number,
      statementAmount: amount,
      masterFileEntryId: entry.id,
      masterFileAmount,
      masterFilePaymentStatus: entry.payment_status,
      masterFileInvoiceNumber: entry.invoice_number,
      verdict,
    });
  }

  // Filas del Master File sin pagar que ni siquiera aparecen en este statement (informativo).
  const statementPoSet = new Set(Array.from(byPo.keys()));
  const notOnStatement = entries
    .filter((e) => e.payment_status !== "Paid" && e.payment_status !== "Cancelled")
    .filter((e) => !statementPoSet.has(normalizePoNumber(e.po_number)))
    .map((e) => ({
      poNumber: e.po_number as string,
      amount: e.amount != null ? Number(e.amount) : null,
      invoiceNumber: e.invoice_number as string | null,
    }));

  rows.sort((a, b) => a.poNumber.localeCompare(b.poNumber));
  return { rows, notOnStatement };
}
