import Link from "next/link";
import { Folder, ArrowLeft } from "lucide-react";
import { getAllPurchaseInvoices } from "@/lib/data/purchase-invoices";
import {
  deletePurchaseInvoiceGroup,
  syncFacturasFromDriveAction,
} from "@/lib/actions/purchase-invoices";
import { DeleteButton } from "@/components/delete-button";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const UNASSIGNED_VENDOR = "Sin vendedor";

type VendorFileGroup = {
  fileName: string;
  poNumber: string | null;
  project: string | null;
  fileSize: number;
  uploadedAt: Date;
  viewId: number;
  ids: number[];
};

export default async function ComprasInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ vendor?: string; synced?: string }>;
}) {
  const [allInvoices, { vendor: selectedVendor, synced }] = await Promise.all([
    getAllPurchaseInvoices(),
    searchParams,
  ]);

  // This page is the vendor invoice library — P.O.'s belong on /compras/pos,
  // so only docType "invoice" documents show up here, one row per unique
  // file (a single Factura can attach to several purchase lines sharing its
  // invoice number, the same way one P.O. can span several WR lines).
  const facturas = allInvoices.filter((inv) => inv.docType === "invoice");

  const fileGroups = new Map<string, VendorFileGroup>();
  for (const inv of facturas) {
    const vendorKey = inv.vendor ?? UNASSIGNED_VENDOR;
    const key = `${vendorKey}|${inv.fileName}`;
    const existing = fileGroups.get(key);
    if (existing) {
      existing.ids.push(inv.id);
    } else {
      fileGroups.set(key, {
        fileName: inv.fileName,
        poNumber: inv.poNumber,
        project: inv.project,
        fileSize: inv.fileSize,
        uploadedAt: inv.uploadedAt,
        viewId: inv.id,
        ids: [inv.id],
      });
    }
  }

  const folders = new Map<
    string,
    { count: number; totalSize: number; lastUploadedAt: Date }
  >();
  for (const inv of facturas) {
    const key = inv.vendor ?? UNASSIGNED_VENDOR;
    const existing = folders.get(key);
    if (existing) {
      existing.count += 1;
      existing.totalSize += inv.fileSize;
      if (inv.uploadedAt > existing.lastUploadedAt) {
        existing.lastUploadedAt = inv.uploadedAt;
      }
    } else {
      folders.set(key, {
        count: 1,
        totalSize: inv.fileSize,
        lastUploadedAt: inv.uploadedAt,
      });
    }
  }
  const sortedFolders = Array.from(folders.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  if (!selectedVendor) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Facturas</h1>
            <p className="text-sm text-muted mt-1">
              {facturas.length} archivos en {sortedFolders.length} carpetas de vendedores.
            </p>
          </div>
          <form action={syncFacturasFromDriveAction}>
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
              ? `Se vincularon ${synced} factura(s) nueva(s) desde Drive.`
              : "No hay facturas nuevas en Drive que coincidan con una compra existente."}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedFolders.map(([vendor, info]) => (
            <Link
              key={vendor}
              href={`/compras/invoices?vendor=${encodeURIComponent(vendor)}`}
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
                  {info.count} {info.count === 1 ? "archivo" : "archivos"} · {formatBytes(info.totalSize)}
                </p>
              </div>
            </Link>
          ))}
          {sortedFolders.length === 0 && (
            <div className="col-span-full rounded-xl border border-border bg-surface px-4 py-10 text-center text-muted">
              Todavía no se ha subido ninguna factura. Puedes subirlas desde la página de cada
              compra.
            </div>
          )}
        </div>
      </div>
    );
  }

  const vendorKeyPrefix = `${selectedVendor}|`;
  const vendorGroups = Array.from(fileGroups.entries())
    .filter(([key]) => key.startsWith(vendorKeyPrefix))
    .map(([, group]) => group);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/compras/invoices"
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
          {vendorGroups.length} {vendorGroups.length === 1 ? "archivo" : "archivos"}.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wide">
              <th className="px-4 py-3">Archivo</th>
              <th className="px-4 py-3">P.O #</th>
              <th className="px-4 py-3">Proyecto</th>
              <th className="px-4 py-3">Tamaño</th>
              <th className="px-4 py-3">Subida</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {vendorGroups.map((group) => (
              <tr
                key={`${selectedVendor}-${group.fileName}`}
                className="border-b border-border last:border-0 hover:bg-background/60"
              >
                <td className="px-4 py-3">
                  <a
                    href={`/api/purchase-invoices/${group.viewId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand hover:text-brand-dark"
                  >
                    {group.fileName}
                  </a>
                </td>
                <td className="px-4 py-3">{group.poNumber ?? "—"}</td>
                <td className="px-4 py-3">{group.project ?? "—"}</td>
                <td className="px-4 py-3">{formatBytes(group.fileSize)}</td>
                <td className="px-4 py-3">
                  {new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(group.uploadedAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <DeleteButton
                    action={deletePurchaseInvoiceGroup.bind(null, group.ids)}
                    confirmText={`¿Eliminar "${group.fileName}"?`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
