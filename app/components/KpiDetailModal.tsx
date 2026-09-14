"use client";

import { useEffect, useState } from "react";

type KpiDetailRow = {
  vendor: string;
  poNumber: string;
  invoiceNumber: string | null;
  amount: number;
  project: string | null;
  date: string | null;
};

export type KpiQuery =
  | { type: "outstanding" | "overdue" | "missing_invoices" | "spend_this_month" }
  | { type: "vendor" | "project"; name: string; month?: string };

function formatAmount(amount: number) {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", { dateStyle: "medium" });
}

export default function KpiDetailModal({ query, onClose }: { query: KpiQuery; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<KpiDetailRow[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ type: query.type });
    if (query.type === "vendor" || query.type === "project") {
      params.set("name", query.name);
      if (query.month) params.set("month", query.month);
    }
    fetch(`/api/nassau/dashboard/kpi-detail?${params.toString()}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo cargar el detalle.");
        if (cancelled) return;
        setTitle(data.title);
        setRows(data.rows);
        setTotal(data.total);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudo cargar el detalle.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-cay-paper p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="brand-heading text-lg text-cay-black">{title || "Detalle"}</h2>
          <button type="button" onClick={onClose} className="text-sm font-medium text-cay-ink/60 hover:text-cay-black">
            Cerrar
          </button>
        </div>

        {loading && <p className="mt-4 text-sm text-cay-ink/60">Cargando...</p>}
        {error && <p className="mt-4 text-sm text-cay-red">{error}</p>}

        {!loading && !error && (
          <>
            <p className="mt-1 text-sm text-cay-ink/60">
              {rows.length} factura{rows.length === 1 ? "" : "s"} &middot; total {formatAmount(total)}
            </p>
            <div className="mt-4 overflow-x-auto rounded-lg border border-cay-black/10 bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cay-black/10 text-xs uppercase tracking-wide text-cay-ink/50">
                    <th className="px-3 py-2">Vendor</th>
                    <th className="px-3 py-2">P.O#</th>
                    <th className="px-3 py-2">Invoice#</th>
                    <th className="px-3 py-2">Project</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-cay-black/5 last:border-0">
                      <td className="px-3 py-1.5 text-cay-ink/80">{row.vendor}</td>
                      <td className="px-3 py-1.5 text-cay-ink/80">{row.poNumber}</td>
                      <td className="px-3 py-1.5 text-cay-ink/80">{row.invoiceNumber ?? "-"}</td>
                      <td className="px-3 py-1.5 text-cay-ink/80">{row.project ?? "-"}</td>
                      <td className="px-3 py-1.5 text-cay-ink/80">{formatAmount(row.amount)}</td>
                      <td className="px-3 py-1.5 text-cay-ink/80">{formatDate(row.date)}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td className="px-3 py-4 text-center text-cay-ink/50" colSpan={6}>
                        Sin resultados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
