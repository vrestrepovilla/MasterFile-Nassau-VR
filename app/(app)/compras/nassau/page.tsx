import Link from "next/link";
import { auth } from "@/lib/auth";
import { canWriteArea } from "@/lib/auth-helpers";
import { getNassauEntries, getPendingNassauInvoiceMatches } from "@/lib/data/nassau";
import { syncNassauFromOdooAction } from "@/lib/actions/nassau";
import { NassauTable } from "@/components/nassau-table";

export default async function NassauPage({
  searchParams,
}: {
  searchParams: Promise<{ odooSynced?: string }>;
}) {
  const [entries, pendingMatches, session, { odooSynced }] = await Promise.all([
    getNassauEntries(),
    getPendingNassauInvoiceMatches(),
    auth(),
    searchParams,
  ]);
  const canEdit = canWriteArea(session, "compras");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Compras Nassau</h1>
          <p className="text-sm text-muted mt-1">
            {entries.length} registros de ordenes de compra, facturas y pagos de Nassau.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/compras/nassau/invoices"
            className="border border-border hover:border-brand/40 text-sm font-medium rounded-lg px-4 py-2 transition-colors whitespace-nowrap"
          >
            Ver facturas por proveedor
          </Link>
          <Link
            href="/compras/nassau/outstanding"
            className="border border-border hover:border-brand/40 text-sm font-medium rounded-lg px-4 py-2 transition-colors whitespace-nowrap"
          >
            Cuentas por pagar
          </Link>
          <Link
            href="/compras/nassau/review"
            className="border border-border hover:border-brand/40 text-sm font-medium rounded-lg px-4 py-2 transition-colors whitespace-nowrap"
          >
            Por revisar{pendingMatches.length > 0 ? ` (${pendingMatches.length})` : ""}
          </Link>
          {canEdit && (
            <form action={syncNassauFromOdooAction}>
              <button
                type="submit"
                className="border border-border hover:border-brand/40 text-sm font-medium rounded-lg px-4 py-2 transition-colors whitespace-nowrap"
              >
                Sincronizar con Odoo
              </button>
            </form>
          )}
          {canEdit && (
            <Link
              href="/compras/nassau/new"
              className="bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors whitespace-nowrap"
            >
              + Nueva compra
            </Link>
          )}
        </div>
      </div>

      {odooSynced != null && (
        <div className="rounded-lg border border-border bg-background/40 px-4 py-3 text-sm">
          {Number(odooSynced) > 0
            ? `Se agregaron ${odooSynced} orden(es) de compra nueva(s) desde Odoo.`
            : "No hay ordenes de compra nuevas en Odoo."}
        </div>
      )}

      <NassauTable entries={entries} canEdit={canEdit} canDelete={session?.user.role === "admin"} />
    </div>
  );
}
