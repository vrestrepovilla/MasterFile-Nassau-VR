import Link from "next/link";
import { Folder, ArrowLeft } from "lucide-react";
import { getNassauEntries } from "@/lib/data/nassau";

export default async function NassauInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ vendor?: string }>;
}) {
  const [allEntries, { vendor: selectedVendor }] = await Promise.all([
    getNassauEntries(),
    searchParams,
  ]);

  const withInvoice = allEntries.filter((e) => e.invoiceFileDriveId);

  const folders = new Map<string, { count: number; lastUploadedAt: Date }>();
  for (const e of withInvoice) {
    const existing = folders.get(e.vendor);
    if (existing) {
      existing.count += 1;
      if (e.updatedAt > existing.lastUploadedAt) existing.lastUploadedAt = e.updatedAt;
    } else {
      folders.set(e.vendor, { count: 1, lastUploadedAt: e.updatedAt });
    }
  }
  const sortedFolders = Array.from(folders.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  if (!selectedVendor) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Facturas — Nassau</h1>
          <p className="text-sm text-muted mt-1">
            {withInvoice.length} archivos en {sortedFolders.length} carpetas de vendedores.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedFolders.map(([vendor, info]) => (
            <Link
              key={vendor}
              href={`/compras/nassau/invoices?vendor=${encodeURIComponent(vendor)}`}
              className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 hover:border-brand/40 hover:shadow-sm transition"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <Folder className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate" title={vendor}>
                  {vendor}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {info.count} {info.count === 1 ? "archivo" : "archivos"}
                </p>
              </div>
            </Link>
          ))}
          {sortedFolders.length === 0 && (
            <div className="col-span-full rounded-xl border border-border bg-surface px-4 py-10 text-center text-muted">
              Todavía no se ha subido ninguna factura de Nassau.
            </div>
          )}
        </div>
      </div>
    );
  }

  const vendorEntries = withInvoice.filter((e) => e.vendor === selectedVendor);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/compras/nassau/invoices"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-brand mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Todas las carpetas
        </Link>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Folder className="h-5 w-5 text-brand" />
          {selectedVendor}
        </h1>
        <p className="text-sm text-muted mt-1">
          {vendorEntries.length} {vendorEntries.length === 1 ? "archivo" : "archivos"}.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wide">
              <th className="px-4 py-3">Archivo</th>
              <th className="px-4 py-3">P.O #</th>
              <th className="px-4 py-3">Proyecto</th>
              <th className="px-4 py-3">Subida</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {vendorEntries.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0 hover:bg-background/60">
                <td className="px-4 py-3">
                  <a
                    href={`/api/nassau/entries/${e.id}/invoice`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand hover:text-brand-dark"
                  >
                    {e.invoiceFileName ?? "Factura"}
                  </a>
                </td>
                <td className="px-4 py-3">{e.poNumber}</td>
                <td className="px-4 py-3">{e.project ?? "—"}</td>
                <td className="px-4 py-3">
                  {new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(e.updatedAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/compras/nassau/${e.id}`} className="text-sm text-brand hover:text-brand-dark">
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
