"use client";

import { useTransition } from "react";
import { uploadNassauEntryInvoice } from "@/lib/actions/nassau";
import type { NassauEntryRow } from "@/lib/data/nassau";

export function NassauEntryInvoice({
  entry,
  readOnly,
}: {
  entry: NassauEntryRow;
  readOnly: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <section className="bg-surface border border-border rounded-xl p-5 space-y-3 card-shadow">
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Factura</h2>
      {entry.invoiceFileDriveId ? (
        <a
          href={`/api/nassau/entries/${entry.id}/invoice`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-brand hover:text-brand-dark font-medium"
        >
          {entry.invoiceFileName ?? "Ver factura"}
        </a>
      ) : (
        <p className="text-sm text-muted">Todavía no se ha subido la factura de esta compra.</p>
      )}
      {!readOnly && (
        <form
          action={(formData) => startTransition(() => uploadNassauEntryInvoice(entry.id, formData))}
          className="flex flex-wrap items-center gap-3"
        >
          <input
            type="file"
            name="file"
            required
            accept=".pdf,application/pdf"
            className="text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-60"
          >
            {pending ? "Subiendo…" : entry.invoiceFileDriveId ? "Reemplazar" : "Subir factura"}
          </button>
        </form>
      )}
    </section>
  );
}
