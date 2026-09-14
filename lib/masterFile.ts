import type { MasterFileEntry, MasterFileLocation } from "@/lib/types";

// Todas las columnas excepto invoice_file_data (bytea) - para no traer el archivo completo en cada listado.
export const MASTER_FILE_LIST_COLUMNS = `
  id, purchase_order_id, vendor, account, invoice_number, po_number, amount,
  payment_status, due_date, paid_on, payment_method, freight_lead_time, freight_cost,
  wr_number, received_on, weight_lb, volume_ft3, commercial_invoice_number, shipping_status,
  project, sub_project, notes, location, invoice_file_name, invoice_file_content_type, created_at, updated_at
`;

function toIso(value: unknown): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : (value as string);
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function rowToMasterFileEntry(row: Record<string, unknown>): MasterFileEntry {
  return {
    id: row.id as string,
    purchaseOrderId: (row.purchase_order_id as string) ?? null,
    vendor: row.vendor as string,
    account: (row.account as string) ?? null,
    invoiceNumber: (row.invoice_number as string) ?? null,
    poNumber: row.po_number as string,
    amount: toNumber(row.amount),
    paymentStatus: (row.payment_status as string) ?? null,
    dueDate: toIso(row.due_date),
    paidOn: toIso(row.paid_on),
    paymentMethod: (row.payment_method as string) ?? null,
    freightLeadTime: (row.freight_lead_time as string) ?? null,
    freightCost: toNumber(row.freight_cost),
    wrNumber: (row.wr_number as string) ?? null,
    receivedOn: toIso(row.received_on),
    weightLb: toNumber(row.weight_lb),
    volumeFt3: toNumber(row.volume_ft3),
    commercialInvoiceNumber: (row.commercial_invoice_number as string) ?? null,
    shippingStatus: (row.shipping_status as string) ?? null,
    project: (row.project as string) ?? null,
    subProject: (row.sub_project as string) ?? null,
    notes: (row.notes as string) ?? null,
    location: (row.location as MasterFileLocation) ?? "us",
    invoiceFileName: (row.invoice_file_name as string) ?? null,
    invoiceFileContentType: (row.invoice_file_content_type as string) ?? null,
    createdAt: toIso(row.created_at) as string,
  };
}

export type MasterFileInput = {
  vendor: string;
  account: string | null;
  invoiceNumber: string | null;
  poNumber: string;
  amount: number | null;
  paymentStatus: string | null;
  dueDate: string | null;
  paidOn: string | null;
  paymentMethod: string | null;
  freightLeadTime: string | null;
  freightCost: number | null;
  wrNumber: string | null;
  receivedOn: string | null;
  weightLb: number | null;
  volumeFt3: number | null;
  commercialInvoiceNumber: string | null;
  shippingStatus: string | null;
  project: string | null;
  subProject: string | null;
  notes: string | null;
  location: MasterFileLocation;
};

function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function num(value: unknown): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

type FieldKind = "required-string" | "string" | "number";

const PATCHABLE_FIELDS: Record<string, { column: string; kind: FieldKind }> = {
  vendor: { column: "vendor", kind: "required-string" },
  account: { column: "account", kind: "string" },
  invoiceNumber: { column: "invoice_number", kind: "string" },
  poNumber: { column: "po_number", kind: "required-string" },
  amount: { column: "amount", kind: "number" },
  paymentStatus: { column: "payment_status", kind: "string" },
  dueDate: { column: "due_date", kind: "string" },
  paidOn: { column: "paid_on", kind: "string" },
  paymentMethod: { column: "payment_method", kind: "string" },
  freightLeadTime: { column: "freight_lead_time", kind: "string" },
  freightCost: { column: "freight_cost", kind: "number" },
  wrNumber: { column: "wr_number", kind: "string" },
  receivedOn: { column: "received_on", kind: "string" },
  weightLb: { column: "weight_lb", kind: "number" },
  volumeFt3: { column: "volume_ft3", kind: "number" },
  commercialInvoiceNumber: { column: "commercial_invoice_number", kind: "string" },
  shippingStatus: { column: "shipping_status", kind: "string" },
  project: { column: "project", kind: "string" },
  subProject: { column: "sub_project", kind: "string" },
  notes: { column: "notes", kind: "string" },
};

export function parseMasterFilePatch(
  body: Record<string, unknown>
): { column: string; value: string | number | null } | { error: string } {
  const keys = Object.keys(body).filter((k) => k in PATCHABLE_FIELDS);
  if (keys.length !== 1) {
    return { error: "Se debe actualizar exactamente un campo por solicitud." };
  }
  const key = keys[0];
  const field = PATCHABLE_FIELDS[key];
  const raw = body[key];

  if (field.kind === "required-string") {
    const value = str(raw);
    if (!value) return { error: `El campo ${key} no puede quedar vacio.` };
    return { column: field.column, value };
  }
  if (field.kind === "number") {
    return { column: field.column, value: num(raw) };
  }
  return { column: field.column, value: str(raw) };
}

export function parseMasterFileInput(body: Record<string, unknown>): MasterFileInput | { error: string } {
  const vendor = str(body.vendor);
  const poNumber = str(body.poNumber);
  if (!vendor) return { error: "El vendor es obligatorio." };
  if (!poNumber) return { error: "El numero de PO es obligatorio." };

  const location: MasterFileLocation = body.location === "nassau" ? "nassau" : "us";

  return {
    vendor,
    poNumber,
    location,
    account: str(body.account),
    invoiceNumber: str(body.invoiceNumber),
    amount: num(body.amount),
    paymentStatus: str(body.paymentStatus),
    dueDate: str(body.dueDate),
    paidOn: str(body.paidOn),
    paymentMethod: str(body.paymentMethod),
    freightLeadTime: str(body.freightLeadTime),
    freightCost: num(body.freightCost),
    wrNumber: str(body.wrNumber),
    receivedOn: str(body.receivedOn),
    weightLb: num(body.weightLb),
    volumeFt3: num(body.volumeFt3),
    commercialInvoiceNumber: str(body.commercialInvoiceNumber),
    shippingStatus: str(body.shippingStatus),
    project: str(body.project),
    subProject: str(body.subProject),
    notes: str(body.notes),
  };
}
