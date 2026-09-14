"use client";

import { useState } from "react";
import type { MasterFileEntry } from "@/lib/types";
import FileViewerModal from "@/app/components/FileViewerModal";

export default function InvoiceModal({
  entry,
  onClose,
  onSaved,
}: {
  entry: MasterFileEntry;
  onClose: () => void;
  onSaved: (patch: { invoiceNumber: string; invoiceFileName: string | null }) => void;
}) {
  const [invoiceNumber, setInvoiceNumber] = useState(entry.invoiceNumber ?? "");
  const [fileName, setFileName] = useState(entry.invoiceFileName);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      if (invoiceNumber !== (entry.invoiceNumber ?? "")) {
        const res = await fetch(`/api/master-file/${entry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceNumber }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo guardar el numero de factura.");
      }

      let finalFileName = fileName;
      if (pendingFile) {
        const form = new FormData();
        form.set("file", pendingFile);
        const res = await fetch(`/api/master-file/${entry.id}/invoice-file`, {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo subir la factura.");
        finalFileName = data.fileName;
      }

      onSaved({ invoiceNumber, invoiceFileName: finalFileName });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveFile() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/master-file/${entry.id}/invoice-file`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo quitar la factura.");
      setFileName(null);
      setPendingFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar la factura.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="brand-heading text-lg text-cay-black">Factura</h2>
        <p className="mt-1 text-xs text-cay-ink/50">
          {entry.vendor} &middot; {entry.poNumber}
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-cay-ink/70">Numero de factura</label>
          <input
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className="w-full rounded-md border border-cay-black/20 px-3 py-1.5 text-sm focus:border-cay-red focus:outline-none"
          />
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-cay-ink/70">Archivo de la factura</label>

          {fileName && !pendingFile && (
            <div className="mb-2 flex items-center justify-between rounded-md border border-cay-black/10 bg-cay-paper px-3 py-2 text-sm">
              <button
                type="button"
                onClick={() => setViewingFile(true)}
                className="truncate text-left text-cay-red hover:underline"
              >
                Ver factura ({fileName})
              </button>
              <button
                type="button"
                onClick={handleRemoveFile}
                disabled={saving}
                className="ml-2 shrink-0 text-xs font-medium text-cay-ink/50 hover:text-cay-red"
              >
                Quitar
              </button>
            </div>
          )}

          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
            onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
          {fileName && (
            <p className="mt-1 text-xs text-cay-ink/50">
              {pendingFile ? "Se reemplazara el archivo actual al guardar." : "Sube un archivo nuevo para reemplazarlo."}
            </p>
          )}
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

      {viewingFile && (
        <FileViewerModal
          url={`/api/master-file/${entry.id}/invoice-file`}
          contentType={entry.invoiceFileContentType}
          filename={fileName}
          onClose={() => setViewingFile(false)}
        />
      )}
    </div>
  );
}
