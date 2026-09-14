import Link from "next/link";
import { getAllPurchaseInvoices } from "@/lib/data/purchase-invoices";
import {
  deletePurchaseInvoiceGroup,
  syncPurchaseOrdersFromDriveAction,
} from "@/lib/actions/purchase-invoices";
import { DeleteButton } from "@/components/delete-button";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type PoGroup = {
  poNumber: string;
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
  viewId: number;
  ids: number[];
  vendors: Set<string>;
  projects: Set<string>;
};

export default async function ComprasPosPage({
  searchParams,
}: {
  searchParams: Promise<{ synced?: string; created?: string; pending?: string }>;
}) {
  const [invoices, { synced, created, pending }] = await Promise.all([
    getAllPurchaseInvoices(),
    searchParams,
  ]);
  const poDocs = invoices.filter((inv) => inv.docType === "po");
  const pendingList = pending ? pending.split(",") : [];

  const groups = new Map<string, PoGroup>();
  for (const inv of poDocs) {
    const key = `${inv.poNumber ?? "—"}|${inv.fileName}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        poNumber: inv.poNumber ?? "—",
        fileName: inv.fileName,
        fileSize: inv.fileSize,
        uploadedAt: inv.uploadedAt,
        viewId: inv.id,
        ids: [],
        vendors: new Set(),
        projects: new Set(),
      };
      groups.set(key, group);
    }
    group.ids.push(inv.id);
    if (inv.vendor) group.vendors.add(inv.vendor);
    if (inv.project) group.projects.add(inv.project);
  }

  const sorted = Array.from(groups.values()).sort((a, b) => {
    const aNumeric = /^[0-9]+$/.test(a.poNumber);
    const bNumeric = /^[0-9]+$/.test(b.poNumber);
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
    if (aNumeric && bNumeric) return Number(b.poNumber) - Number(a.poNumber);
    return b.poNumber.localeCompare(a.poNumber);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">P.O.&apos;s</h1>
          <p className="text-sm text-muted mt-1">
            {sorted.length} órdenes de compra en PDF. Ordenadas de mayor a menor — la más reciente
            aparece primero. Se sincronizan automáticamente desde Drive una vez al día.
          </p>
        </div>
        <form action={syncPurchaseOrdersFromDriveAction}>
          <button
            type="submit"
            className="bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors whitespace-nowrap"
          >
            Sincronizar desde Drive
          </button>
        </form>
      </div>

      {synced != null && (
        <div className="rounded-lg border border-border bg-background/40 px-4 py-3 text-sm space-y-1">
          <p>
            {Number(synced) > 0
              ? `Se vincularon ${synced} documento(s) de P.O. nuevos desde Drive.`
              : "No hay documentos de P.O. nuevos en Drive."}
          </p>
          {Number(created) > 0 && (
            <p className="text-muted">
              {created} compra(s) nueva(s) se crearon automáticamente a partir del archivo maestro
              de Procurement, con los datos de vendedor, monto, proyecto, etc. ya completos.
            </p>
          )}
          {pendingList.length > 0 && (
            <p className="text-muted">
              {pendingList.length} P.O. en Drive no están ni en la app ni en el archivo maestro de
              Procurement, así que no se pudieron vincular: {pendingList.join(", ")}. Agrégalos a
              cualquiera de los dos y se vincularán solos en la siguiente sincronización.
            </p>
          )}
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wide">
              <th className="px-4 py-3">P.O #</th>
              <th className="px-4 py-3">Archivo</th>
              <th className="px-4 py-3">Vendedor(es)</th>
              <th className="px-4 py-3">Proyecto(s)</th>
              <th className="px-4 py-3">Tamaño</th>
              <th className="px-4 py-3">Subida</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((group) => (
              <tr
                key={`${group.poNumber}-${group.fileName}`}
                className="border-b border-border last:border-0 hover:bg-background/60"
              >
                <td className="px-4 py-3 font-medium">{group.poNumber}</td>
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
                <td className="px-4 py-3 max-w-[220px]">
                  <span className="line-clamp-2">
                    {group.vendors.size ? Array.from(group.vendors).join(", ") : "—"}
                  </span>
                </td>
                <td className="px-4 py-3 max-w-[220px]">
                  <span className="line-clamp-2">
                    {group.projects.size ? Array.from(group.projects).join(", ") : "—"}
                  </span>
                </td>
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
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  Todavía no se ha subido ningún P.O. Puedes subirlos desde la página de cada
                  compra, o desde{" "}
                  <Link href="/compras/invoices" className="text-brand hover:text-brand-dark">
                    Facturas
                  </Link>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
