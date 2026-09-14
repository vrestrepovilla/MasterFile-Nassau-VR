"use client";

import { useEffect, useMemo, useState } from "react";
import type { MasterFileEntry } from "@/lib/types";
import PendingInvoicesReview, { type PendingMatch } from "@/app/components/PendingInvoicesReview";
import FileViewerModal from "@/app/components/FileViewerModal";

function formatAmount(amount: number | null) {
  if (amount == null) return "-";
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(value: string | null) {
  if (!value) return "-";
  // Construimos la fecha en hora local (no UTC) para que no se corra un dia por la zona horaria.
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", { dateStyle: "medium" });
}

function FolderIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

function NewVendorModal({
  existingVendors,
  onClose,
  onCreated,
}: {
  existingVendors: string[];
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Escribe el nombre del proveedor.");
      return;
    }
    if (existingVendors.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      setError("Ya existe un proveedor con ese nombre.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/nassau/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear el proveedor.");
      onCreated(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el proveedor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="brand-heading text-lg text-cay-black">Nuevo proveedor</h2>
        <p className="mt-1 text-xs text-cay-ink/50">
          Crea la carpeta del proveedor de una vez, aunque todavia no tengas ninguna PO o factura suya.
        </p>
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-cay-ink/70">Nombre del proveedor</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            className="w-full rounded-md border border-cay-black/20 px-3 py-1.5 text-sm focus:border-cay-red focus:outline-none"
          />
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
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-cay-red px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InvoicesBrowser({
  entries: initialEntries,
  title = "Invoices",
  location = "us",
  showPendingReview = false,
  extraVendors = [],
}: {
  entries: MasterFileEntry[];
  title?: string;
  location?: "us" | "nassau";
  /** Nassau: muestra el aviso de facturas pendientes de aprobar (montadas por renglon y sin resolver todavia). */
  showPendingReview?: boolean;
  /** Proveedores registrados a mano (con "Nuevo proveedor") que todavia no tienen ninguna PO/factura. */
  extraVendors?: string[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [manualVendors, setManualVendors] = useState(extraVendors);
  const [search, setSearch] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [viewingEntry, setViewingEntry] = useState<MasterFileEntry | null>(null);
  const [pending, setPending] = useState<PendingMatch[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [addingVendor, setAddingVendor] = useState(false);

  async function refreshPending() {
    const res = await fetch("/api/nassau/invoices/pending", { cache: "no-store" });
    const data = await res.json();
    setPending(data.pending ?? []);
  }

  useEffect(() => {
    if (showPendingReview) refreshPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPendingReview]);

  async function handleResolved(matchId: string) {
    setPending((prev) => prev.filter((p) => p.id !== matchId));
    const res = await fetch(`/api/master-file?location=${location}`, { cache: "no-store" });
    const data = await res.json();
    setEntries(data.entries);
  }

  const vendors = useMemo(() => {
    const map = new Map<string, { total: number; withFile: number }>();
    for (const name of manualVendors) map.set(name, { total: 0, withFile: 0 });
    for (const e of entries) {
      const v = map.get(e.vendor) ?? { total: 0, withFile: 0 };
      v.total += 1;
      if (e.invoiceFileName) v.withFile += 1;
      map.set(e.vendor, v);
    }
    return Array.from(map.entries())
      .map(([vendor, stats]) => ({ vendor, ...stats }))
      .sort((a, b) => a.vendor.localeCompare(b.vendor));
  }, [entries, manualVendors]);

  const filteredVendors = useMemo(
    () => vendors.filter((v) => v.vendor.toLowerCase().includes(search.toLowerCase())),
    [vendors, search]
  );

  const vendorEntries = useMemo(() => {
    if (!selectedVendor) return [];
    return entries
      .filter((e) => e.vendor === selectedVendor)
      .sort((a, b) => b.poNumber.localeCompare(a.poNumber));
  }, [entries, selectedVendor]);

  if (selectedVendor) {
    return (
      <div>
        <button
          onClick={() => setSelectedVendor(null)}
          className="mb-4 flex items-center gap-1 text-sm font-medium text-cay-ink/70 hover:text-cay-red"
        >
          &larr; Todos los proveedores
        </button>
        <h1 className="brand-heading text-2xl text-cay-black">{selectedVendor}</h1>
        <p className="mt-1 text-sm text-cay-ink/70">{vendorEntries.length} factura(s)</p>

        <div className="mt-6 overflow-x-auto rounded-lg border border-cay-black/10 bg-white shadow-sm">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-cay-black/10 text-xs uppercase tracking-wide text-cay-ink/50">
                <th className="px-4 py-3">P.O#</th>
                <th className="px-4 py-3">Invoice#</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Factura</th>
              </tr>
            </thead>
            <tbody>
              {vendorEntries.map((e) => (
                <tr key={e.id} className="border-b border-cay-black/5 last:border-0 hover:bg-cay-paper">
                  <td className="px-4 py-2 text-cay-ink/80">{e.poNumber}</td>
                  <td className="px-4 py-2 text-cay-ink/80">{e.invoiceNumber ?? "-"}</td>
                  <td className="px-4 py-2 text-cay-ink/80">{formatAmount(e.amount)}</td>
                  <td className="px-4 py-2 text-cay-ink/80">{formatDate(e.dueDate)}</td>
                  <td className="px-4 py-2">
                    {e.invoiceFileName ? (
                      <button
                        type="button"
                        onClick={() => setViewingEntry(e)}
                        className="text-cay-red hover:underline"
                      >
                        Ver factura
                      </button>
                    ) : (
                      <span className="text-cay-ink/40">Sin factura adjunta</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {vendorEntries.length === 0 && (
            <p className="p-10 text-center text-cay-ink/60">Este proveedor no tiene registros.</p>
          )}
        </div>

        {viewingEntry && (
          <FileViewerModal
            url={`/api/master-file/${viewingEntry.id}/invoice-file`}
            contentType={viewingEntry.invoiceFileContentType}
            filename={viewingEntry.invoiceFileName}
            onClose={() => setViewingEntry(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="brand-heading text-2xl text-cay-black">{title}</h1>
          <p className="mt-1 text-sm text-cay-ink/70">{vendors.length} proveedor(es)</p>
        </div>
        <div className="flex items-center gap-2">
          {showPendingReview && pending.length > 0 && (
            <button
              onClick={() => setShowReview(true)}
              className="rounded-md bg-amber-100 px-4 py-1.5 text-sm font-semibold text-amber-800 transition hover:opacity-90"
            >
              Revisar pendientes ({pending.length})
            </button>
          )}
          {location === "nassau" && (
            <button
              onClick={() => setAddingVendor(true)}
              className="rounded-md border border-cay-black/20 px-4 py-1.5 text-sm font-semibold text-cay-black transition hover:bg-cay-black/5"
            >
              Nuevo proveedor
            </button>
          )}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar proveedor..."
            className="w-full max-w-xs rounded-md border border-cay-black/20 px-3 py-1.5 text-sm focus:border-cay-red focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {filteredVendors.map(({ vendor, total, withFile }) => (
          <button
            key={vendor}
            onClick={() => setSelectedVendor(vendor)}
            className="flex flex-col items-center gap-2 rounded-lg border border-cay-black/10 bg-white p-4 text-center shadow-sm transition hover:border-cay-red/40 hover:shadow-md"
          >
            <span className="text-cay-red/70">
              <FolderIcon />
            </span>
            <span className="line-clamp-2 text-sm font-medium text-cay-black">{vendor}</span>
            <span className="text-xs text-cay-ink/50">
              {withFile} de {total} con factura
            </span>
          </button>
        ))}
      </div>

      {filteredVendors.length === 0 && (
        <p className="p-10 text-center text-cay-ink/60">Ningun proveedor coincide con la busqueda.</p>
      )}

      {showReview && (
        <PendingInvoicesReview
          entries={entries}
          pending={pending}
          onClose={() => setShowReview(false)}
          onResolved={handleResolved}
        />
      )}

      {addingVendor && (
        <NewVendorModal
          existingVendors={vendors.map((v) => v.vendor)}
          onClose={() => setAddingVendor(false)}
          onCreated={(name) => setManualVendors((prev) => [...prev, name])}
        />
      )}
    </div>
  );
}
