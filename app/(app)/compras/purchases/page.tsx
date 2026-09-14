import Link from "next/link";
import { auth } from "@/lib/auth";
import { canWriteArea } from "@/lib/auth-helpers";
import { getPurchases } from "@/lib/data/purchases";
import { getPurchaseInvoiceSummaries } from "@/lib/data/purchase-invoices";
import { syncPurchasesFromSheetAction } from "@/lib/actions/purchases";
import { PurchasesTable } from "@/components/purchases-table";

export default async function PurchasesListPage({
  searchParams,
}: {
  searchParams: Promise<{ synced?: string }>;
}) {
  const [purchases, session, invoiceSummaries, poSummaries, { synced }] = await Promise.all([
    getPurchases({ source: "2026" }),
    auth(),
    getPurchaseInvoiceSummaries("invoice"),
    getPurchaseInvoiceSummaries("po"),
    searchParams,
  ]);
  const invoicesByPurchase = Object.fromEntries(
    invoiceSummaries.map(({ purchaseId, ...rest }) => [purchaseId, rest]),
  );
  const posByPurchase = Object.fromEntries(
    poSummaries.map(({ purchaseId, ...rest }) => [purchaseId, rest]),
  );
  const canEdit = canWriteArea(session, "compras");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Compras</h1>
          <p className="text-sm text-muted mt-1">
            {purchases.length} registros de 2026 — de la P.O. más reciente a la más antigua.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && (
            <form action={syncPurchasesFromSheetAction}>
              <button
                type="submit"
                className="border border-border hover:border-brand/40 text-sm font-medium rounded-lg px-4 py-2 transition-colors whitespace-nowrap"
              >
                Sincronizar desde el archivo
              </button>
            </form>
          )}
          {canEdit && (
            <Link
              href="/compras/purchases/new"
              className="bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors whitespace-nowrap"
            >
              + Nueva compra
            </Link>
          )}
        </div>
      </div>

      {synced != null && (
        <div className="rounded-lg border border-border bg-background/40 px-4 py-3 text-sm">
          {Number(synced) > 0
            ? `Se agregaron ${synced} compra(s) nueva(s) desde el archivo de Procurement.`
            : "No hay compras nuevas en el archivo de Procurement."}
        </div>
      )}

      <PurchasesTable
        purchases={purchases}
        canDelete={session?.user.role === "admin"}
        canEdit={canEdit}
        invoicesByPurchase={invoicesByPurchase}
        posByPurchase={posByPurchase}
      />
    </div>
  );
}
