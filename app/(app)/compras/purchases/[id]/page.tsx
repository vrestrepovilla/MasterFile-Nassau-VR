import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { canWriteArea } from "@/lib/auth-helpers";
import { getPurchaseById } from "@/lib/data/purchases";
import { getPurchaseInvoices } from "@/lib/data/purchase-invoices";
import { updatePurchase } from "@/lib/actions/purchases";
import { PurchaseForm } from "@/components/purchase-form";
import { PurchaseInvoices } from "@/components/purchase-invoices";

export default async function EditPurchasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const purchaseId = Number(id);
  if (!Number.isFinite(purchaseId)) notFound();

  const [purchase, invoices, session] = await Promise.all([
    getPurchaseById(purchaseId),
    getPurchaseInvoices(purchaseId),
    auth(),
  ]);
  if (!purchase) notFound();

  const readOnly = !canWriteArea(session, "compras");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">{purchase.vendor ?? "Compra sin vendedor"}</h1>
        <p className="text-sm text-muted mt-1">
          {readOnly ? "Detalle de la compra" : "Edita el registro de compra"}
        </p>
      </div>
      <PurchaseForm
        action={updatePurchase.bind(null, purchaseId)}
        defaultValues={purchase}
        submitLabel="Guardar cambios"
        readOnly={readOnly}
      />
      <PurchaseInvoices purchaseId={purchaseId} invoices={invoices} readOnly={readOnly} />
    </div>
  );
}
