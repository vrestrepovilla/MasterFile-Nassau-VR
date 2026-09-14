import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canWriteArea } from "@/lib/auth-helpers";
import { createPurchase } from "@/lib/actions/purchases";
import { PurchaseForm } from "@/components/purchase-form";

export default async function NewPurchasePage() {
  const session = await auth();
  if (!canWriteArea(session, "compras")) redirect("/compras/purchases");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Nueva compra</h1>
        <p className="text-sm text-muted mt-1">Registra una orden de compra o factura de proveedor.</p>
      </div>
      <PurchaseForm action={createPurchase} submitLabel="Registrar compra" />
    </div>
  );
}
