"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createNassauOutstandingReportDraftAction,
  markNassauVendorInvoicesPaid,
} from "@/lib/actions/nassau";
import { formatMoney } from "@/lib/derive";
import type { NassauEntryRow } from "@/lib/data/nassau";

type VendorGroup = { vendor: string; entries: NassauEntryRow[] };

function VendorSection({
  vendor,
  entries,
  selected,
  onToggle,
  onToggleAll,
}: {
  vendor: string;
  entries: NassauEntryRow[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
}) {
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
  const vendorIds = entries.map((e) => e.id);
  const vendorSelectedCount = vendorIds.filter((id) => selected.has(id)).length;

  function markPaid(formData: FormData) {
    for (const id of vendorIds) {
      if (selected.has(id)) formData.append("entryIds", id);
    }
    startTransition(() => markNassauVendorInvoicesPaid(vendor, formData));
  }

  return (
    <section className="bg-surface border border-border rounded-xl overflow-hidden card-shadow">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold">{vendor}</h2>
        <span className="text-sm text-muted">
          {entries.length} pendiente(s) — {formatMoney(entries.reduce((s, e) => s + (e.amount ?? 0), 0))}
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">No hay facturas pendientes de {vendor}.</p>
      ) : (
        <form action={markPaid} className="p-5 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-left text-xs text-muted uppercase tracking-wide">
                  <th className="pb-2 pr-2">
                    <input
                      type="checkbox"
                      checked={vendorSelectedCount === vendorIds.length}
                      onChange={() => onToggleAll(vendorIds)}
                    />
                  </th>
                  <th className="pb-2 pr-2">Factura #</th>
                  <th className="pb-2 pr-2">PO #</th>
                  <th className="pb-2 pr-2">Proyecto</th>
                  <th className="pb-2 pr-2 text-right">Monto</th>
                  <th className="pb-2">Vence</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="py-2 pr-2">
                      <input type="checkbox" checked={selected.has(e.id)} onChange={() => onToggle(e.id)} />
                    </td>
                    <td className="py-2 pr-2">{e.invoiceNumber ?? "—"}</td>
                    <td className="py-2 pr-2">{e.poNumber}</td>
                    <td className="py-2 pr-2 max-w-[160px]">
                      <span className="line-clamp-1">{e.project ?? "—"}</span>
                    </td>
                    <td className="py-2 pr-2 text-right">{formatMoney(e.amount)}</td>
                    <td className="py-2">
                      {e.dueDate
                        ? new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(
                            new Date(`${e.dueDate}T00:00:00`),
                          )
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-border">
            <label className="block">
              <span className="block text-xs text-muted mb-1">Fecha de pago</span>
              <input
                type="date"
                name="paidOn"
                defaultValue={today}
                className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-surface"
              />
            </label>
            <label className="block flex-1 min-w-[200px]">
              <span className="block text-xs text-muted mb-1">Soporte de pago (opcional)</span>
              <input type="file" name="receipt" accept=".pdf,image/*" className="text-sm" />
            </label>
            <button
              type="submit"
              disabled={pending || vendorSelectedCount === 0}
              className="bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
            >
              {pending ? "Guardando…" : `Marcar ${vendorSelectedCount || ""} como pagada(s)`}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export function NassauOutstandingBoard({ byVendor }: { byVendor: VendorGroup[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allEntries = useMemo(() => byVendor.flatMap((g) => g.entries), [byVendor]);
  const selectedEntries = allEntries.filter((e) => selected.has(e.id));
  const selectedTotal = selectedEntries.reduce((sum, e) => sum + (e.amount ?? 0), 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(ids: string[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      const allChecked = ids.every((id) => next.has(id));
      for (const id of ids) {
        if (allChecked) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  function generateReport(formData: FormData) {
    for (const id of selected) formData.append("entryIds", id);
    startTransition(() => createNassauOutstandingReportDraftAction(formData));
  }

  return (
    <div className="space-y-4">
      {byVendor.map(({ vendor, entries }) => (
        <VendorSection
          key={vendor}
          vendor={vendor}
          entries={entries}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
        />
      ))}

      <section className="bg-ink text-white rounded-xl p-5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/60">
          Reporte semanal para la contadora
        </h2>
        <p className="text-sm text-white/70">
          {selectedEntries.length} factura(s) seleccionada(s) — {formatMoney(selectedTotal)}. Genera el
          Excel + PDF de cada proveedor y arma un borrador de Gmail (no se envía automáticamente).
        </p>
        <form action={generateReport} className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="block text-xs text-white/60 mb-1">Fecha de vencimiento del reporte</span>
            <input
              type="date"
              name="dueDate"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <button
            type="submit"
            disabled={pending || selectedEntries.length === 0}
            className="bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
          >
            {pending ? "Generando…" : "Generar reporte y crear borrador"}
          </button>
        </form>
      </section>
    </div>
  );
}
