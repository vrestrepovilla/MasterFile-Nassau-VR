"use client";

import { useMemo, useState } from "react";
import type { MasterFileEntry } from "@/lib/types";
import MarkPaidModal from "@/app/components/MarkPaidModal";
import ReconcileStatementModal from "@/app/components/ReconcileStatementModal";

function formatAmount(amount: number | null) {
  if (amount == null) return "-";
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function OutstandingInvoicesDashboard({
  initialByVendor,
}: {
  initialByVendor: { vendor: string; entries: MasterFileEntry[] }[];
}) {
  const [byVendor, setByVendor] = useState(initialByVendor);
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(initialByVendor.flatMap((v) => v.entries.map((e) => e.id)))
  );
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showMarkPaid, setShowMarkPaid] = useState(false);
  const [showReconcile, setShowReconcile] = useState(false);

  async function refresh() {
    const res = await fetch("/api/nassau/outstanding-invoices", { cache: "no-store" });
    const data = await res.json();
    setByVendor(data.byVendor);
    setChecked(new Set(data.byVendor.flatMap((v: { entries: MasterFileEntry[] }) => v.entries.map((e) => e.id))));
  }

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleVendor(vendorEntries: MasterFileEntry[], allChecked: boolean) {
    setChecked((prev) => {
      const next = new Set(prev);
      for (const e of vendorEntries) {
        if (allChecked) next.delete(e.id);
        else next.add(e.id);
      }
      return next;
    });
  }

  const vendorTotals = useMemo(() => {
    return byVendor.map(({ vendor, entries }) => {
      const checkedEntries = entries.filter((e) => checked.has(e.id));
      const total = checkedEntries.reduce((sum, e) => sum + (e.amount ?? 0), 0);
      return { vendor, entries, checkedEntries, total };
    });
  }, [byVendor, checked]);

  const grandTotal = vendorTotals.reduce((sum, v) => sum + v.total, 0);
  const totalChecked = vendorTotals.reduce((sum, v) => sum + v.checkedEntries.length, 0);

  function validateSelection(): string[] | null {
    if (!dueDate) {
      setError("Elige la fecha de pago para esta tanda.");
      return null;
    }
    if (totalChecked === 0) {
      setError("Selecciona al menos una factura.");
      return null;
    }
    return vendorTotals.flatMap((v) => v.checkedEntries.map((e) => e.id));
  }

  async function saveDueDate(allCheckedIds: string[]) {
    const res = await fetch("/api/nassau/outstanding-invoices/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dueDate, entryIds: allCheckedIds }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo guardar la fecha de pago.");
  }

  async function handleGenerate() {
    setError(null);
    setMessage(null);
    const allCheckedIds = validateSelection();
    if (!allCheckedIds) return;

    setSaving(true);
    try {
      await saveDueDate(allCheckedIds);

      // Un solo archivo .zip con el Excel y los PDFs adentro - el navegador bloquea varias
      // descargas automaticas seguidas si se piden una por una.
      const byVendorPayload = vendorTotals
        .filter((v) => v.checkedEntries.length > 0)
        .map((v) => ({ vendor: v.vendor, entryIds: v.checkedEntries.map((e) => e.id) }));

      const res = await fetch("/api/nassau/outstanding-invoices/report/zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate, byVendor: byVendorPayload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo generar el reporte.");
      }
      const disposition = res.headers.get("content-disposition") ?? "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? "Outstanding Invoices Nassau.zip";
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      triggerDownload(url, filename);
      URL.revokeObjectURL(url);

      setMessage(
        `Listo: se descargo un .zip con el Excel y ${byVendorPayload.length} PDF(s). La fecha de pago quedo guardada en esas ${allCheckedIds.length} fila(s).`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el reporte.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateDraft() {
    setError(null);
    setMessage(null);
    const allCheckedIds = validateSelection();
    if (!allCheckedIds) return;

    setSaving(true);
    try {
      await saveDueDate(allCheckedIds);

      const byVendorPayload = vendorTotals
        .filter((v) => v.checkedEntries.length > 0)
        .map((v) => ({ vendor: v.vendor, entryIds: v.checkedEntries.map((e) => e.id) }));

      const res = await fetch("/api/nassau/outstanding-invoices/report/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate, byVendor: byVendorPayload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear el borrador.");

      setMessage(
        "Borrador creado en Gmail (a isabel.soto@caybuilding.com, copia juliana.trujillo@caybuilding.com). Revisalo y envialo tu misma desde Gmail."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el borrador.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6 rounded-lg border border-cay-black/10 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="brand-heading text-2xl text-cay-black">Cuentas por Pagar</h1>
            <p className="mt-1 text-sm text-cay-ink/70">
              Facturas sin pagar de los proveedores con credito (Ace, Premier Importers, Paint Suppliers).
            </p>
          </div>
          <div className="shrink-0">
            <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-cay-ink/50">
              Fecha de pago
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-md border border-cay-black/20 px-3 py-1.5 text-sm focus:border-cay-red focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-cay-black/10 pt-4">
          <button
            onClick={() => setShowReconcile(true)}
            className="rounded-md border border-cay-black/20 px-4 py-2 text-sm font-semibold text-cay-black transition hover:bg-cay-black/5"
          >
            Reconciliar Statement
          </button>
          <button
            onClick={handleGenerate}
            disabled={saving}
            className="rounded-md border border-cay-black/20 px-4 py-2 text-sm font-semibold text-cay-black transition hover:bg-cay-black/5 disabled:opacity-50"
          >
            {saving ? "Generando..." : "Descargar Excel + PDFs"}
          </button>

          <span className="mx-1 hidden h-6 w-px bg-cay-black/10 sm:block" />

          <button
            onClick={handleCreateDraft}
            disabled={saving}
            className="rounded-md bg-cay-red px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Generando..." : "Crear borrador en Gmail"}
          </button>
          <button
            onClick={() => {
              setError(null);
              if (totalChecked === 0) {
                setError("Selecciona al menos una factura.");
                return;
              }
              setShowMarkPaid(true);
            }}
            className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            Marcar como pagadas
          </button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-md bg-cay-red/10 px-3 py-2 text-sm text-cay-red">{error}</p>}
      {message && <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

      <div className="space-y-6">
        {vendorTotals.map(({ vendor, entries, checkedEntries, total }) => {
          const allChecked = entries.length > 0 && checkedEntries.length === entries.length;
          return (
            <div key={vendor} className="overflow-hidden rounded-lg border border-cay-black/10 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-cay-black/10 bg-cay-paper px-4 py-2.5">
                <h2 className="brand-heading text-sm text-cay-black">{vendor}</h2>
                <span className="text-sm font-semibold text-cay-black">{formatAmount(total)}</span>
              </div>
              {entries.length === 0 ? (
                <p className="p-6 text-center text-sm text-cay-ink/50">Sin facturas pendientes.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-cay-black/10 text-xs uppercase tracking-wide text-cay-ink/50">
                      <th className="w-8 px-4 py-2">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={() => toggleVendor(entries, allChecked)}
                        />
                      </th>
                      <th className="px-2 py-2">P.O#</th>
                      <th className="px-2 py-2">Invoice#</th>
                      <th className="px-2 py-2">Amount</th>
                      <th className="px-2 py-2">Project</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id} className="border-b border-cay-black/5 last:border-0">
                        <td className="px-4 py-1.5">
                          <input type="checkbox" checked={checked.has(e.id)} onChange={() => toggle(e.id)} />
                        </td>
                        <td className="px-2 py-1.5 text-cay-ink/80">{e.poNumber || "-"}</td>
                        <td className="px-2 py-1.5 text-cay-ink/80">{e.invoiceNumber || "-"}</td>
                        <td className="px-2 py-1.5 text-cay-ink/80">{formatAmount(e.amount)}</td>
                        <td className="px-2 py-1.5 text-cay-ink/80">{e.project || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end">
        <p className="text-sm font-semibold text-cay-black">
          TOTAL INVOICES: {formatAmount(grandTotal)} ({totalChecked} factura(s) seleccionada(s))
        </p>
      </div>

      {showMarkPaid && (
        <MarkPaidModal
          vendorGroups={vendorTotals
            .filter((v) => v.checkedEntries.length > 0)
            .map((v) => ({ vendor: v.vendor, entries: v.checkedEntries }))}
          onClose={() => setShowMarkPaid(false)}
          onDone={() => {
            setMessage("Listo: las facturas quedaron marcadas como pagadas en el Master File.");
            refresh();
          }}
        />
      )}

      {showReconcile && <ReconcileStatementModal onClose={() => setShowReconcile(false)} />}
    </div>
  );
}
