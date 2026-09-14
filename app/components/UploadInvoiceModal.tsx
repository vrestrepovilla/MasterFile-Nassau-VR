"use client";

import { useState } from "react";
import type { MasterFileEntry } from "@/lib/types";
import { PendingRow, type PendingMatch } from "@/app/components/PendingInvoicesReview";

export default function UploadInvoiceModal({
  entry,
  onClose,
  onApproved,
}: {
  entry: MasterFileEntry;
  onClose: () => void;
  onApproved: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<PendingMatch | null>(null);

  async function handleUpload() {
    if (!file) {
      setError("Selecciona un archivo primero.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("entryId", entry.id);
      const res = await fetch("/api/nassau/invoices/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo subir la factura.");
      setMatch(data.match);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la factura.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-cay-paper p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="brand-heading text-lg text-cay-black">Montar Invoice</h2>
            <p className="mt-0.5 text-xs text-cay-ink/50">
              {entry.vendor} &middot; {entry.poNumber}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-medium text-cay-ink/60 hover:text-cay-black">
            Cerrar
          </button>
        </div>

        {!match ? (
          <div className="mt-4 rounded-lg border border-cay-black/10 bg-white p-6">
            <label className="mb-1 block text-xs font-medium text-cay-ink/70">Archivo de la factura</label>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
            <p className="mt-2 text-xs text-cay-ink/50">
              Al subirla, intento leer el numero de factura y el monto automaticamente. Despues me confirmas o
              corriges esos datos antes de guardarla en esta PO.
            </p>
            {error && <p className="mt-3 text-sm text-cay-red">{error}</p>}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading || !file}
                className="rounded-md bg-cay-red px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {uploading ? "Leyendo factura..." : "Subir"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <PendingRow
              match={match}
              entries={[entry]}
              lockedEntry={entry}
              onResolved={() => {
                onApproved();
                onClose();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
