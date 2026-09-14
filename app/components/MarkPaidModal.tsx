"use client";

import { useState } from "react";
import type { MasterFileEntry } from "@/lib/types";

function formatAmount(amount: number | null) {
  if (amount == null) return "-";
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function MarkPaidModal({
  vendorGroups,
  onClose,
  onDone,
}: {
  vendorGroups: { vendor: string; entries: MasterFileEntry[] }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [paidOn, setPaidOn] = useState("");
  const [receipts, setReceipts] = useState<Record<string, File | null>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!paidOn) {
      setError("Elige la fecha en que se pagaron.");
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      form.set("paidOn", paidOn);
      form.set(
        "vendors",
        JSON.stringify(vendorGroups.map((v) => ({ vendor: v.vendor, entryIds: v.entries.map((e) => e.id) })))
      );
      for (const v of vendorGroups) {
        const file = receipts[v.vendor];
        if (file) form.set(`receipt_${v.vendor}`, file);
      }

      const res = await fetch("/api/nassau/outstanding-invoices/mark-paid", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo marcar como pagadas.");

      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo marcar como pagadas.");
    } finally {
      setSaving(false);
    }
  }

  const totalEntries = vendorGroups.reduce((sum, v) => sum + v.entries.length, 0);
  const grandTotal = vendorGroups.reduce(
    (sum, v) => sum + v.entries.reduce((s, e) => s + (e.amount ?? 0), 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-cay-paper p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="brand-heading text-lg text-cay-black">Marcar como pagadas</h2>
          <button type="button" onClick={onClose} className="text-sm font-medium text-cay-ink/60 hover:text-cay-black">
            Cerrar
          </button>
        </div>
        <p className="mt-1 text-sm text-cay-ink/60">
          {totalEntries} factura(s) seleccionada(s) &middot; {formatAmount(grandTotal)}
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-cay-ink/70">Fecha en que se pagaron</label>
          <input
            type="date"
            value={paidOn}
            onChange={(e) => setPaidOn(e.target.value)}
            className="w-full rounded-md border border-cay-black/20 px-3 py-1.5 text-sm focus:border-cay-red focus:outline-none"
          />
        </div>

        <div className="mt-4 space-y-3">
          {vendorGroups.map((v) => (
            <div key={v.vendor} className="rounded-md border border-cay-black/10 bg-white p-3">
              <p className="text-sm font-semibold text-cay-black">
                {v.vendor} <span className="font-normal text-cay-ink/50">({v.entries.length} factura(s))</span>
              </p>
              <label className="mt-2 block text-xs font-medium text-cay-ink/70">
                Soporte de pago de {v.vendor} (opcional)
              </label>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
                onChange={(e) =>
                  setReceipts((prev) => ({ ...prev, [v.vendor]: e.target.files?.[0] ?? null }))
                }
                className="mt-1 w-full text-sm"
              />
            </div>
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-cay-red">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-cay-ink/70 hover:bg-cay-black/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-md bg-cay-red px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Marcar como pagadas"}
          </button>
        </div>
      </div>
    </div>
  );
}
