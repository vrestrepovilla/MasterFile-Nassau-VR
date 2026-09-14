import Link from "next/link";
import { getAllBrokerInvoices } from "@/lib/data/broker-invoices";
import { deleteBrokerInvoice } from "@/lib/actions/broker-invoices";
import { DeleteButton } from "@/components/delete-button";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function InvoicesPage() {
  const invoices = await getAllBrokerInvoices();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Facturas del broker</h1>
        <p className="text-sm text-muted mt-1">
          Todas las facturas subidas, de todos los contenedores. {invoices.length} en total.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wide">
              <th className="px-4 py-3">Commercial Invoice (CI)</th>
              <th className="px-4 py-3">Factura</th>
              <th className="px-4 py-3">Contenedor</th>
              <th className="px-4 py-3">Broker</th>
              <th className="px-4 py-3">Tamaño</th>
              <th className="px-4 py-3">Subida</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-background/60">
                <td className="px-4 py-3">
                  {inv.ciNumber ? (
                    <span className="inline-flex items-center rounded-full border border-brand/30 bg-brand/10 text-brand px-2 py-0.5 text-xs font-medium whitespace-nowrap">
                      CI {inv.ciNumber}
                    </span>
                  ) : (
                    <span className="text-xs text-muted" title="No se asignó un CI específico a esta factura">
                      {inv.containerCiNumbers ?? "Sin CI"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`/api/broker-invoices/${inv.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand hover:text-brand-dark"
                  >
                    {inv.label ? `${inv.label} — ${inv.fileName}` : inv.fileName}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/containers/${inv.containerId}`} className="hover:text-brand">
                    {inv.containerNumber ?? "Sin número"}
                  </Link>
                </td>
                <td className="px-4 py-3">{inv.broker ?? "—"}</td>
                <td className="px-4 py-3">{formatBytes(inv.fileSize)}</td>
                <td className="px-4 py-3">
                  {new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(inv.uploadedAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <DeleteButton
                    action={deleteBrokerInvoice.bind(null, inv.id, inv.containerId)}
                    confirmText={`¿Eliminar la factura "${inv.fileName}"?`}
                  />
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  Todavía no se ha subido ninguna factura. Puedes subirlas desde la página de
                  cada contenedor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
