import { deleteBrokerInvoice, uploadBrokerInvoice } from "@/lib/actions/broker-invoices";
import { DeleteButton } from "@/components/delete-button";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Invoice = {
  id: number;
  label: string | null;
  ciNumber: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
};

export function BrokerInvoices({
  containerId,
  containerCiNumbers,
  invoices,
  readOnly = false,
}: {
  containerId: number;
  containerCiNumbers?: string | null;
  invoices: Invoice[];
  readOnly?: boolean;
}) {
  const ciSuggestions = (containerCiNumbers ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <section className="bg-surface border border-border rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
        Facturas del broker
      </h2>

      {containerCiNumbers && (
        <p className="text-xs text-muted -mt-2">
          Commercial Invoice(s) de este contenedor:{" "}
          <span className="font-medium text-foreground">{containerCiNumbers}</span>
        </p>
      )}

      {invoices.length === 0 ? (
        <p className="text-sm text-muted">Todavía no se han subido facturas para este contenedor.</p>
      ) : (
        <ul className="divide-y divide-border">
          {invoices.map((inv) => (
            <li key={inv.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {inv.ciNumber && (
                    <span className="inline-flex items-center rounded-full border border-brand/30 bg-brand/10 text-brand px-2 py-0.5 text-xs font-medium whitespace-nowrap">
                      CI {inv.ciNumber}
                    </span>
                  )}
                  <a
                    href={`/api/broker-invoices/${inv.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand hover:text-brand-dark truncate"
                  >
                    {inv.label ? `${inv.label} — ${inv.fileName}` : inv.fileName}
                  </a>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {formatBytes(inv.fileSize)} ·{" "}
                  {new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(inv.uploadedAt)}
                  {!inv.ciNumber && " · Sin CI asignado"}
                </p>
              </div>
              {!readOnly && (
                <DeleteButton
                  action={deleteBrokerInvoice.bind(null, inv.id, containerId)}
                  confirmText={`¿Eliminar la factura "${inv.fileName}"?`}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <form
          action={uploadBrokerInvoice.bind(null, containerId)}
          className="flex flex-wrap items-end gap-3 pt-2 border-t border-border"
        >
          <label className="block flex-1 min-w-[160px]">
            <span className="block text-xs text-muted mb-1">Commercial Invoice (CI)</span>
            <input
              name="ciNumber"
              list="ci-suggestions"
              placeholder="Ej. 31080"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-surface"
            />
            <datalist id="ci-suggestions">
              {ciSuggestions.map((ci) => (
                <option key={ci} value={ci} />
              ))}
            </datalist>
          </label>
          <label className="block flex-1 min-w-[160px]">
            <span className="block text-xs text-muted mb-1">Número de factura del broker (opcional)</span>
            <input
              name="label"
              placeholder="Ej. 945872"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-surface"
            />
          </label>
          <label className="block flex-1 min-w-[220px]">
            <span className="block text-xs text-muted mb-1">Archivo (PDF o imagen, máx. 10MB)</span>
            <input
              type="file"
              name="file"
              required
              accept="application/pdf,image/*"
              className="w-full text-sm"
            />
          </label>
          <button
            type="submit"
            className="bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            Subir factura
          </button>
        </form>
      )}
    </section>
  );
}
