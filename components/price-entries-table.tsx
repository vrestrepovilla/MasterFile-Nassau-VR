"use client";

import { useMemo, useState, useTransition } from "react";
import { formatDate } from "@/lib/derive";
import { deletePriceEntry, updatePriceEntry } from "@/lib/actions/price-entries";
import { DeleteButton } from "@/components/delete-button";
import type { PriceEntryRow } from "@/lib/data/price-entries";

const PAGE_SIZE = 50;

function distinct(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v)))).sort();
}

function formatUnitCost(v: number | null) {
  if (v == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(v);
}

const inputClass =
  "w-full rounded border border-border px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand bg-surface";

function EditableRow({
  entry,
  onDone,
}: {
  entry: PriceEntryRow;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-border last:border-0 bg-brand/5">
      <td className="px-4 py-2">
        <form
          id={`price-edit-${entry.id}`}
          action={(formData) =>
            startTransition(async () => {
              await updatePriceEntry(entry.id, formData);
              onDone();
            })
          }
        >
          <input name="material" defaultValue={entry.material} className={inputClass} />
        </form>
      </td>
      <td className="px-4 py-2">
        <input
          name="unit"
          form={`price-edit-${entry.id}`}
          defaultValue={entry.unit ?? ""}
          className={inputClass}
        />
      </td>
      <td className="px-4 py-2">
        <input
          name="unitCost"
          form={`price-edit-${entry.id}`}
          type="number"
          step="0.001"
          defaultValue={entry.unitCost ?? ""}
          className={`${inputClass} text-right`}
        />
      </td>
      <td className="px-4 py-2">
        <input
          name="vendor"
          form={`price-edit-${entry.id}`}
          defaultValue={entry.vendor ?? ""}
          className={inputClass}
        />
      </td>
      <td className="px-4 py-2">{entry.poNumber ?? "—"}</td>
      <td className="px-4 py-2">{formatDate(entry.poDate)}</td>
      <td className="px-4 py-2">
        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            form={`price-edit-${entry.id}`}
            disabled={pending}
            className="text-sm text-brand hover:text-brand-dark disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" onClick={onDone} className="text-sm text-muted hover:text-foreground">
            Cancelar
          </button>
        </div>
      </td>
    </tr>
  );
}

export function PriceEntriesTable({
  entries,
  canDelete,
}: {
  entries: PriceEntryRow[];
  canDelete: boolean;
}) {
  const [q, setQ] = useState("");
  const [vendor, setVendor] = useState("all");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);

  const vendors = useMemo(() => distinct(entries.map((e) => e.vendor)), [entries]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (vendor !== "all" && e.vendor !== vendor) return false;
      if (query && !e.material.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [entries, q, vendor]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function updateFilter(setter: (v: string) => void) {
    return (v: string) => {
      setter(v);
      setPage(1);
    };
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => updateFilter(setQ)(e.target.value)}
          placeholder="Buscar material…"
          className="flex-1 min-w-[240px] rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <select
          value={vendor}
          onChange={(e) => updateFilter(setVendor)(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="all">Todos los vendedores</option>
          {vendors.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-muted">{filtered.length} resultado(s)</p>

      <div className="bg-surface border border-border rounded-xl overflow-x-auto card-shadow">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wide">
              <th className="px-4 py-3">Material</th>
              <th className="px-4 py-3">Unidad</th>
              <th className="px-4 py-3 text-right">Costo unitario</th>
              <th className="px-4 py-3">Vendedor</th>
              <th className="px-4 py-3">P.O #</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {pageItems.map((e) =>
              editingId === e.id ? (
                <EditableRow key={e.id} entry={e} onDone={() => setEditingId(null)} />
              ) : (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-background/60">
                  <td className="px-4 py-3 max-w-[420px]">
                    <span className="line-clamp-2" title={e.material}>
                      {e.material}
                    </span>
                  </td>
                  <td className="px-4 py-3">{e.unit ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatUnitCost(e.unitCost)}</td>
                  <td className="px-4 py-3">{e.vendor ?? "—"}</td>
                  <td className="px-4 py-3">{e.poNumber ?? "—"}</td>
                  <td className="px-4 py-3">{formatDate(e.poDate)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingId(e.id)}
                        className="text-sm text-brand hover:text-brand-dark"
                      >
                        Editar
                      </button>
                      {canDelete && (
                        <DeleteButton
                          action={deletePriceEntry.bind(null, e.id)}
                          confirmText={`¿Eliminar "${e.material}"?`}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ),
            )}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  No hay precios que coincidan con el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="text-brand hover:text-brand-dark disabled:opacity-40 disabled:hover:text-brand"
          >
            ← Anterior
          </button>
          <span className="text-muted text-xs">
            Página {currentPage} de {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="text-brand hover:text-brand-dark disabled:opacity-40 disabled:hover:text-brand"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
