import Link from "next/link";
import { getAllCommercialInvoices } from "@/lib/data/commercial-invoices";
import {
  deleteCommercialInvoice,
  syncCommercialInvoicesFromDriveAction,
  uploadCommercialInvoice,
} from "@/lib/actions/commercial-invoices";
import { DeleteButton } from "@/components/delete-button";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FILE_KIND_LABELS: Record<string, string> = {
  pdf: "PDF",
  excel: "Excel",
};

const FILE_KIND_STYLES: Record<string, string> = {
  pdf: "border-brand/30 bg-brand/10 text-brand",
  excel: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export default async function ComprasCommInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ synced?: string }>;
}) {
  const [invoices, { synced }] = await Promise.all([getAllCommercialInvoices(), searchParams]);

  const sorted = [...invoices].sort((a, b) => {
    const aNumeric = /^[0-9]+$/.test(a.ciNumber);
    const bNumeric = /^[0-9]+$/.test(b.ciNumber);
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
    if (aNumeric && bNumeric) return Number(b.ciNumber) - Number(a.ciNumber);
    return b.ciNumber.localeCompare(a.ciNumber);
  });

  const matchedCount = invoices.filter((inv) => inv.purchaseId || inv.containerId).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Commercial Invoices (CI)</h1>
          <p className="text-sm text-muted mt-1">
            {invoices.length} archivos (PDF y Excel), {matchedCount} vinculados a una compra o
            contenedor. Ordenados del CI más reciente al más antiguo.
          </p>
        </div>
        <form action={syncCommercialInvoicesFromDriveAction}>
          <button
            type="submit"
            className="bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors whitespace-nowrap"
          >
            Sincronizar desde Drive
          </button>
        </form>
      </div>

      {synced != null && (
        <div className="rounded-lg border border-border bg-background/40 px-4 py-3 text-sm">
          {Number(synced) > 0
            ? `Se vincularon ${synced} Commercial Invoice(s) nuevo(s) desde Drive.`
            : "No hay Commercial Invoices nuevos en Drive."}
        </div>
      )}

      <section className="bg-surface border border-border rounded-xl p-5 card-shadow">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
          Subir un CI
        </h2>
        <form action={uploadCommercialInvoice} className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="block text-xs text-muted mb-1">Número de CI</span>
            <input
              type="text"
              name="ciNumber"
              required
              placeholder="Ej. 31124"
              className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-surface"
            />
          </label>
          <label className="block flex-1 min-w-[220px]">
            <span className="block text-xs text-muted mb-1">Archivo (PDF o Excel, máx. 20MB)</span>
            <input
              type="file"
              name="file"
              required
              accept=".pdf,.xlsx,.xls,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
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
      </section>

      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wide">
              <th className="px-4 py-3">CI #</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Archivo</th>
              <th className="px-4 py-3">Vendedor / Contenedor</th>
              <th className="px-4 py-3">Proyecto</th>
              <th className="px-4 py-3">Tamaño</th>
              <th className="px-4 py-3">Subida</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((inv) => (
              <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-background/60">
                <td className="px-4 py-3 font-medium">{inv.ciNumber}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                      FILE_KIND_STYLES[inv.fileKind] ?? "border-border bg-background text-muted"
                    }`}
                  >
                    {FILE_KIND_LABELS[inv.fileKind] ?? inv.fileKind}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`/api/commercial-invoices/${inv.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand hover:text-brand-dark"
                  >
                    {inv.fileName}
                  </a>
                </td>
                <td className="px-4 py-3">
                  {inv.purchaseId ? (
                    <Link href={`/compras/purchases/${inv.purchaseId}`} className="hover:text-brand">
                      {inv.vendor ?? "—"}
                    </Link>
                  ) : inv.containerId ? (
                    <Link href={`/containers/${inv.containerId}`} className="hover:text-brand">
                      {inv.containerNumber ?? "—"}
                    </Link>
                  ) : (
                    <span className="text-muted">Sin vincular</span>
                  )}
                </td>
                <td className="px-4 py-3">{inv.project ?? "—"}</td>
                <td className="px-4 py-3">{formatBytes(inv.fileSize)}</td>
                <td className="px-4 py-3">
                  {new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(inv.uploadedAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <DeleteButton
                    action={deleteCommercialInvoice.bind(null, inv.id)}
                    confirmText={`¿Eliminar "${inv.fileName}"?`}
                  />
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted">
                  Todavía no se ha subido ningún Commercial Invoice.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
