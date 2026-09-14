import { deletePurchaseInvoice, uploadPurchaseInvoice } from "@/lib/actions/purchase-invoices";
import { DeleteButton } from "@/components/delete-button";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  po: "P.O",
  invoice: "Factura",
};

const DOC_TYPE_STYLES: Record<string, string> = {
  po: "border-sky-200 bg-sky-50 text-sky-700",
  invoice: "border-brand/30 bg-brand/10 text-brand",
};

type Invoice = {
  id: number;
  docType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
};

export function PurchaseInvoices({
  purchaseId,
  invoices,
  readOnly = false,
}: {
  purchaseId: number;
  invoices: Invoice[];
  readOnly?: boolean;
}) {
  return (
    <section className="bg-surface border border-border rounded-xl p-5 space-y-4 card-shadow">
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
        P.O y facturas
      </h2>

      {invoices.length === 0 ? (
        <p className="text-sm text-muted">Todavía no se ha subido el P.O ni la factura de esta compra.</p>
      ) : (
        <ul className="divide-y divide-border">
          {invoices.map((inv) => (
            <li key={inv.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                      DOC_TYPE_STYLES[inv.docType] ?? "border-border bg-background text-muted"
                    }`}
                  >
                    {DOC_TYPE_LABELS[inv.docType] ?? inv.docType}
                  </span>
                  <a
                    href={`/api/purchase-invoices/${inv.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand hover:text-brand-dark truncate"
                  >
                    {inv.fileName}
                  </a>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {formatBytes(inv.fileSize)} ·{" "}
                  {new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(inv.uploadedAt)}
                </p>
              </div>
              {!readOnly && (
                <DeleteButton
                  action={deletePurchaseInvoice.bind(null, inv.id, purchaseId)}
                  confirmText={`¿Eliminar "${inv.fileName}"?`}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <form
          action={uploadPurchaseInvoice.bind(null, purchaseId)}
          className="flex flex-wrap items-end gap-3 pt-2 border-t border-border"
        >
          <label className="block">
            <span className="block text-xs text-muted mb-1">Tipo de documento</span>
            <select
              name="docType"
              defaultValue="invoice"
              className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-surface"
            >
              <option value="po">P.O</option>
              <option value="invoice">Factura</option>
            </select>
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
            Subir
          </button>
        </form>
      )}
    </section>
  );
}
