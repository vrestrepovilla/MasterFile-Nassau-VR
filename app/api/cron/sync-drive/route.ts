import { NextResponse } from "next/server";
import { syncPurchaseOrdersFromDrive } from "@/lib/po-drive-sync";
import { syncFacturasFromDrive } from "@/lib/factura-drive-sync";
import { syncCommercialInvoicesFromDrive } from "@/lib/ci-drive-sync";
import { syncPurchasesFromSheet } from "@/lib/purchases-sheet-sync";
import { syncNassauFromOdoo } from "@/lib/nassau/odoo-sync";

export const dynamic = "force-dynamic";

// Vercel Cron calls this once a day with `Authorization: Bearer $CRON_SECRET`
// (added automatically because CRON_SECRET is set as a project env var) —
// picks up any P.O., Factura, or Commercial Invoice PDF dropped straight
// into Drive, any new row added to the Procurement sheet, and any new
// Purchase Order issued in Odoo for Nassau, since the last run.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Purchases first, sequentially with the P.O. sync — both can create new
  // `purchases` rows from the same sheet, and running them in parallel risks
  // a race where each reads the table before the other's insert lands,
  // creating duplicates for the same new row.
  const purchasesFromSheet = await syncPurchasesFromSheet();
  const pos = await syncPurchaseOrdersFromDrive();

  const [facturas, commercialInvoices, nassauOdoo] = await Promise.all([
    syncFacturasFromDrive(),
    syncCommercialInvoicesFromDrive(),
    syncNassauFromOdoo(),
  ]);

  return NextResponse.json({ purchasesFromSheet, pos, facturas, commercialInvoices, nassauOdoo });
}
