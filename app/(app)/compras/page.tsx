import { auth } from "@/lib/auth";
import { getPurchases } from "@/lib/data/purchases";
import { getAllPurchaseInvoices } from "@/lib/data/purchase-invoices";
import { getUsersLite } from "@/lib/data/users";
import { PurchasesDashboardClient } from "@/components/compras/purchases-dashboard-client";

export default async function ComprasDashboardPage() {
  const [purchases, invoices, usersLite, session] = await Promise.all([
    getPurchases(),
    getAllPurchaseInvoices(),
    getUsersLite(),
    auth(),
  ]);

  return (
    <PurchasesDashboardClient
      purchases={purchases}
      invoices={invoices}
      usersById={usersLite.map((u) => [u.id, u.name] as [number, string])}
      userName={session?.user.name ?? session?.user.email ?? "Usuario"}
    />
  );
}
