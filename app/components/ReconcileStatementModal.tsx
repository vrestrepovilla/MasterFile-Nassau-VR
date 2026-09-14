"use client";

import { useState } from "react";
import { OUTSTANDING_INVOICE_VENDORS } from "@/lib/outstandingInvoices";

type ReconcileRow = {
  poNumber: string;
  statementAmount: number;
  masterFileEntryId: string | null;
  masterFileAmount: number | null;
  masterFilePaymentStatus: string | null;
  masterFileInvoiceNumber: string | null;
  verdict: "paid_ok" | "amount_mismatch" | "still_owed" | "not_found_in_master_file";
};

type ReconcileResult = {
  rows: ReconcileRow[];
  notOnStatement: { poNumber: string; amount: number | null; invoiceNumber: string | null }[];
};

function formatAmount(amount: number | null) {
  if (amount == null) return "-";
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const VERDICT_LABEL: Record<ReconcileRow["verdict"], string> = {
  paid_ok: "Ya pagada",
  amount_mismatch: "El monto no coincide",
  still_owed: "Falta pagar",
  not_found_in_master_file: "No esta en el Master File",
};

const VERDICT_CLASS: Record<ReconcileRow["verdict"], string> = {
  paid_ok: "bg-emerald-100 text-emerald-700",
  amount_mismatch: "bg-amber-100 text-amber-800",
  still_owed: "bg-cay-red/10 text-cay-red",
  not_found_in_master_file: "bg-amber-100 text-amber-800",
};

export default function ReconcileStatementModal({ onClose }: { onClose: () => void }) {
  const [vendor, setVendor] = useState<string>(OUTSTANDING_INVOICE_VENDORS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReconcileResult | null>(null);

  async function handleReconcile() {
    setError(null);
    setResult(null);
    if (!file) {
      setError("Selecciona el PDF del statement.");
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.set("vendor", vendor);
      form.set("file", file);
      const res = await fetch("/api/nassau/outstanding-invoices/reconcile", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo reconciliar el statement.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reconciliar el statement.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-cay-paper p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="brand-heading text-lg text-cay-black">Reconciliar Statement</h2>
          <button type="button" onClick={onClose} className="text-sm font-medium text-cay-ink/60 hover:text-cay-black">
            Cerrar
          </button>
        </div>
        <p className="mt-1 text-sm text-cay-ink/60">
          Sube el statement (PDF) que te mande el proveedor y te digo cuales PO ya estan pagadas y cuales faltan.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-cay-ink/70">Proveedor</label>
            <select
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="w-full rounded-md border border-cay-black/20 bg-white px-3 py-1.5 text-sm focus:border-cay-red focus:outline-none"
            >
              {OUTSTANDING_INVOICE_VENDORS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-cay-ink/70">Statement (PDF)</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-cay-red">{error}</p>}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleReconcile}
            disabled={loading}
            className="rounded-md bg-cay-red px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Leyendo statement..." : "Reconciliar"}
          </button>
        </div>

        {result && (
          <div className="mt-5">
            <h3 className="brand-heading text-sm text-cay-black">Facturas del statement</h3>
            <div className="mt-2 overflow-x-auto rounded-lg border border-cay-black/10 bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cay-black/10 text-xs uppercase tracking-wide text-cay-ink/50">
                    <th className="px-3 py-2">P.O#</th>
                    <th className="px-3 py-2">Statement</th>
                    <th className="px-3 py-2">Master File</th>
                    <th className="px-3 py-2">Invoice#</th>
                    <th className="px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.poNumber} className="border-b border-cay-black/5 last:border-0">
                      <td className="px-3 py-1.5 text-cay-ink/80">{row.poNumber}</td>
                      <td className="px-3 py-1.5 text-cay-ink/80">{formatAmount(row.statementAmount)}</td>
                      <td className="px-3 py-1.5 text-cay-ink/80">{formatAmount(row.masterFileAmount)}</td>
                      <td className="px-3 py-1.5 text-cay-ink/80">{row.masterFileInvoiceNumber ?? "-"}</td>
                      <td className="px-3 py-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${VERDICT_CLASS[row.verdict]}`}>
                          {VERDICT_LABEL[row.verdict]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.notOnStatement.length > 0 && (
              <div className="mt-4">
                <h3 className="brand-heading text-sm text-cay-black">
                  Sin pagar, pero no estan en este statement
                </h3>
                <p className="mt-0.5 text-xs text-cay-ink/50">
                  Puede que el proveedor todavia no las haya facturado, o que ya se hayan resuelto por otro lado.
                </p>
                <div className="mt-2 overflow-x-auto rounded-lg border border-cay-black/10 bg-white">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-cay-black/10 text-xs uppercase tracking-wide text-cay-ink/50">
                        <th className="px-3 py-2">P.O#</th>
                        <th className="px-3 py-2">Invoice#</th>
                        <th className="px-3 py-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.notOnStatement.map((row) => (
                        <tr key={row.poNumber} className="border-b border-cay-black/5 last:border-0">
                          <td className="px-3 py-1.5 text-cay-ink/80">{row.poNumber}</td>
                          <td className="px-3 py-1.5 text-cay-ink/80">{row.invoiceNumber ?? "-"}</td>
                          <td className="px-3 py-1.5 text-cay-ink/80">{formatAmount(row.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
