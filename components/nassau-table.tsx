"use client";

import Link from "next/link";
import { Paperclip } from "lucide-react";
import { useMemo, useState } from "react";
import { DeleteButton } from "@/components/delete-button";
import { deleteNassauEntry } from "@/lib/actions/nassau";
import { formatDate, formatMoney } from "@/lib/derive";
import type { NassauEntryRow } from "@/lib/data/nassau";

const inputClass =
  "rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-surface";

function distinct(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v)))).sort();
}

export function NassauTable({
  entries,
  canEdit,
  canDelete,
}: {
  entries: NassauEntryRow[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [vendor, setVendor] = useState("all");

  const statuses = useMemo(() => distinct(entries.map((e) => e.paymentStatus)), [entries]);
  const vendors = useMemo(() => distinct(entries.map((e) => e.vendor)), [entries]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (status !== "all" && e.paymentStatus !== status) return false;
      if (vendor !== "all" && e.vendor !== vendor) return false;
      if (query) {
        const haystack = [e.vendor, e.poNumber, e.invoiceNumber, e.project, e.wrNumber, e.notes]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [entries, q, status, vendor]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por vendedor, PO, factura, proyecto…"
          className={`flex-1 min-w-[240px] ${inputClass}`}
        />
        <select value={vendor} onChange={(e) => setVendor(e.target.value)} className={inputClass}>
          <option value="all">Todos los vendedores</option>
          {vendors.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
          <option value="all">Todos los estados</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-muted">{filtered.length} resultado(s)</p>

      <div className="bg-surface border border-border rounded-xl overflow-x-auto card-shadow">
        <table className="w-full text-sm min-w-[1600px]">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wide">
              <th className="px-4 py-3">Vendedor</th>
              <th className="px-4 py-3">PO #</th>
              <th className="px-4 py-3">Factura #</th>
              <th className="px-4 py-3 text-right">Monto</th>
              <th className="px-4 py-3">Estado pago</th>
              <th className="px-4 py-3">Vence</th>
              <th className="px-4 py-3">Pagado el</th>
              <th className="px-4 py-3">Método</th>
              <th className="px-4 py-3">Flete</th>
              <th className="px-4 py-3">WR #</th>
              <th className="px-4 py-3">Recibido</th>
              <th className="px-4 py-3">Estado envío</th>
              <th className="px-4 py-3">Proyecto</th>
              <th className="px-4 py-3">Sub proyecto</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0 hover:bg-background/60">
                <td className="px-4 py-3 font-medium">{e.vendor}</td>
                <td className="px-4 py-3">{e.poNumber}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="line-clamp-1">{e.invoiceNumber ?? "—"}</span>
                    {e.invoiceFileDriveId && (
                      <a
                        href={`/api/nassau/entries/${e.id}/invoice`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Ver factura"
                        className="shrink-0 text-brand hover:text-brand-dark"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-medium">{formatMoney(e.amount)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-xs whitespace-nowrap">
                    {e.paymentStatus ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3">{formatDate(e.dueDate)}</td>
                <td className="px-4 py-3">{formatDate(e.paidOn)}</td>
                <td className="px-4 py-3">{e.paymentMethod ?? "—"}</td>
                <td className="px-4 py-3 text-right">{formatMoney(e.freightCost)}</td>
                <td className="px-4 py-3">{e.wrNumber ?? "—"}</td>
                <td className="px-4 py-3">{formatDate(e.receivedOn)}</td>
                <td className="px-4 py-3">{e.shippingStatus ?? "—"}</td>
                <td className="px-4 py-3 max-w-[160px]">
                  <span className="line-clamp-2">{e.project ?? "—"}</span>
                </td>
                <td className="px-4 py-3 max-w-[140px]">
                  <span className="line-clamp-2">{e.subProject ?? "—"}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                    <Link
                      href={`/compras/nassau/${e.id}`}
                      className="text-sm text-brand hover:text-brand-dark"
                    >
                      {canEdit ? "Editar" : "Ver"}
                    </Link>
                    {canDelete && (
                      <DeleteButton
                        action={deleteNassauEntry.bind(null, e.id)}
                        confirmText={`¿Eliminar la compra de "${e.vendor}" (PO ${e.poNumber})?`}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={15} className="px-4 py-10 text-center text-muted">
                  No hay compras de Nassau que coincidan con el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
