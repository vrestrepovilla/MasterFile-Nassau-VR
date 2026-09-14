import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  date,
  boolean,
  timestamp,
  pgEnum,
  primaryKey,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "editor"]);

// "all" keeps existing users (and admins) seeing every section, unchanged.
// A user scoped to "logistica" or "compras" only sees and can only reach
// that section's pages — admins always bypass this restriction.
export const departmentEnum = pgEnum("department", ["all", "logistica", "compras"]);

export const statusEnum = pgEnum("status", [
  "Preparing",
  "In Transit",
  "Arrived at Port",
  "Customs",
  "Delivered",
  "Delayed",
]);


export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("editor"),
  department: departmentEnum("department").notNull().default("all"),
  // An extra area this user can view but never modify — e.g. a Logística
  // user who should be able to check Compras without editing it. Null means
  // no extra read-only area. Irrelevant for admins and for "all" department
  // users, who already see (and can edit) everything.
  readOnlyDepartment: departmentEnum("read_only_department"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  location: text("location"),
  supervisor: text("supervisor"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const containers = pgTable("containers", {
  id: serial("id").primaryKey(),
  status: statusEnum("status").notNull().default("Preparing"),
  containerNumber: text("container_number"),
  size: text("size"),

  // Commercial invoice
  ciNumbers: text("ci_numbers"),
  ciDate: date("ci_date"),
  ciValue: numeric("ci_value", { precision: 12, scale: 2, mode: "number" }),
  ciCurrency: text("ci_currency").default("USD"),

  // Shipping
  shippingLine: text("shipping_line"),
  billOfLading: text("bill_of_lading"),
  etd: date("etd"),
  portOfDischarge: text("port_of_discharge"),
  eta: date("eta"),
  etaJobsite: date("eta_jobsite"),
  returnToPort: date("return_to_port"),

  // Freight
  freightVendor: text("freight_vendor"),
  freightCost: numeric("freight_cost", { precision: 12, scale: 2, mode: "number" }),

  // Broker
  broker: text("broker"),
  brokerInvoiceNumber: text("broker_invoice_number"),
  budgetedBroker: numeric("budgeted_broker", { precision: 12, scale: 2, mode: "number" }),
  brokerRealCost: numeric("broker_real_cost", { precision: 12, scale: 2, mode: "number" }),
  brokerPaymentDate: date("broker_payment_date"),
  brokerPaid: boolean("broker_paid").notNull().default(false),

  paymentStatus: text("payment_status"),
  notes: text("notes"),

  createdBy: integer("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// A container can carry cargo for more than one project (seen in real data).
export const containerProjects = pgTable(
  "container_projects",
  {
    containerId: integer("container_id")
      .notNull()
      .references(() => containers.id, { onDelete: "cascade" }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.containerId, t.projectId] }),
  }),
);

// Bahamas Customs duty rate by merchandise category, used to auto-fill the
// broker cost calculator instead of typing the % by hand.
export const dutyRates = pgTable("duty_rates", {
  id: serial("id").primaryKey(),
  merchandise: text("merchandise").notNull(),
  technicalDescription: text("technical_description"),
  dutyRatePercent: numeric("duty_rate_percent", { precision: 5, scale: 2, mode: "number" }).notNull(),
  hsCode: text("hs_code"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Reference rate card given by freight vendors (e.g. Overseas, Laser) —
// not tied to a specific container, just kept for lookup when budgeting one.
export const freightRates = pgTable("freight_rates", {
  id: serial("id").primaryKey(),
  vendor: text("vendor").notNull(),
  shippingLine: text("shipping_line"),
  pol: text("pol"),
  pod: text("pod"),
  transshipment: text("transshipment"),
  transitDays: integer("transit_days"),
  departureDays: text("departure_days"),
  containerSize: text("container_size").notNull(),
  price: numeric("price", { precision: 12, scale: 2, mode: "number" }),
  currency: text("currency").default("USD"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Compras / procurement — imported from the "Procurement - MASTER FILE USA"
// spreadsheet (Invoices 2026 + Past invoices). Not tied 1:1 to a container:
// commInvoiceNumber / containerNumber are free-text cross-references into
// Logística's containers, matched by value rather than a hard foreign key
// (many purchase lines predate container tracking, or never shipped in one).
export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  source: text("source").notNull().default("manual"), // "2026" | "past" | "manual"
  // The "#" column of the "Procurement - MASTER FILE USA" Google Sheet row
  // this came from (null for rows never synced from/to that sheet) — the
  // stable key that tells the Drive/Sheet sync which rows are already
  // imported, so it doesn't re-create duplicates on every run.
  procurementRowNumber: integer("procurement_row_number"),
  vendor: text("vendor"),
  account: text("account"),
  invoiceNumber: text("invoice_number"),
  poNumber: text("po_number"),
  amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }),
  status: text("status"),
  dueDate: date("due_date"),
  paidOn: date("paid_on"),
  paymentMethod: text("payment_method"),
  leadTimeInFreight: date("lead_time_in_freight"),
  freightVendor: text("freight_vendor"),
  warehouseReceiptNumber: text("warehouse_receipt_number"),
  receivedOn: date("received_on"),
  weightLb: numeric("weight_lb", { precision: 12, scale: 2, mode: "number" }),
  volumeFt3: numeric("volume_ft3", { precision: 12, scale: 2, mode: "number" }),
  commInvoiceNumber: text("comm_invoice_number"),
  ciStatus: text("ci_status"),
  project: text("project"),
  subProject: text("sub_project"),
  notes: text("notes"),
  payApp: text("pay_app"),
  shippingMode: text("shipping_mode"),
  containerNumber: text("container_number"),
  createdBy: integer("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const brokerInvoices = pgTable("broker_invoices", {
  id: serial("id").primaryKey(),
  containerId: integer("container_id")
    .notNull()
    .references(() => containers.id, { onDelete: "cascade" }),
  label: text("label"),
  ciNumber: text("ci_number"),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  // Base64-encoded file content. Kept as text (rather than bytea) so it
  // round-trips reliably over Neon's HTTP driver.
  fileData: text("file_data").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id, {
    onDelete: "set null",
  }),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const purchaseInvoices = pgTable("purchase_invoices", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id")
    .notNull()
    .references(() => purchases.id, { onDelete: "cascade" }),
  docType: text("doc_type").notNull().default("invoice"), // "po" | "invoice"
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  // Exactly one of these two is set: either it's still on Vercel Blob (its
  // public URL) or it's been moved to Google Drive (its file ID) — Drive is
  // the long-term home going forward, kept off Vercel to save storage.
  blobUrl: text("blob_url"),
  driveFileId: text("drive_file_id"),
  uploadedBy: integer("uploaded_by").references(() => users.id, {
    onDelete: "set null",
  }),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

// USA material price reference, built from the line items of each 2026
// Applitech P.O. — mirrors "Costs Materials - Restructured.xlsx" (USA
// sheet): one row per material/vendor/date/price combination.
export const priceEntries = pgTable("price_entries", {
  id: serial("id").primaryKey(),
  material: text("material").notNull(),
  unit: text("unit"),
  unitCost: numeric("unit_cost", { precision: 12, scale: 3, mode: "number" }),
  vendor: text("vendor"),
  poNumber: text("po_number"),
  poDate: date("po_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Commercial Invoice documents (PDF + Excel) generated per CI#. A CI covers a
// whole shipment, so it usually spans several purchase lines — most CI
// numbers in practice don't map to a single purchase or container record, so
// both links are optional; this is a standalone document library keyed by
// CI# first, cross-referenced when a match exists.
export const commercialInvoices = pgTable("commercial_invoices", {
  id: serial("id").primaryKey(),
  ciNumber: text("ci_number").notNull(),
  fileKind: text("file_kind").notNull(), // "pdf" | "excel"
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  // Same "exactly one of the two" storage pointer as purchase_invoices.
  blobUrl: text("blob_url"),
  driveFileId: text("drive_file_id"),
  purchaseId: integer("purchase_id").references(() => purchases.id, {
    onDelete: "set null",
  }),
  containerId: integer("container_id").references(() => containers.id, {
    onDelete: "set null",
  }),
  uploadedBy: integer("uploaded_by").references(() => users.id, {
    onDelete: "set null",
  }),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

// --- Compras Nassau ------------------------------------------------------
// Ported from the standalone "MasterFile-Nassau-VR" app (Odoo + AgentMail +
// Drive integration for the Bahamas/Nassau office's procurement + accounts
// payable workflow). Kept as its own set of tables — sharing the login and
// app shell with the rest of Supply-Chain-App, but not merged into
// `purchases`/`purchase_invoices`, since Nassau's flow (Odoo-sourced P.O.'s,
// email-ingested invoices, vendor statement reconciliation) is a distinct
// process from the USA side's spreadsheet-driven one.

// Inbound purchase-request emails captured via AgentMail (general inbox).
export const nassauPurchaseRequests = pgTable("nassau_purchase_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentmailMessageId: text("agentmail_message_id").notNull().unique(),
  agentmailThreadId: text("agentmail_thread_id"),
  fromEmail: text("from_email").notNull(),
  subject: text("subject"),
  bodyText: text("body_text"),
  bodyHtml: text("body_html"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One P.O. per purchase request — the PDF itself lives in Drive.
export const nassauPurchaseOrders = pgTable("nassau_purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id")
    .notNull()
    .unique()
    .references(() => nassauPurchaseRequests.id),
  poNumber: text("po_number").notNull(),
  notes: text("notes"),
  pdfFileName: text("pdf_file_name"),
  pdfContentType: text("pdf_content_type"),
  pdfDriveId: text("pdf_drive_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// The core table: one row per P.O./invoice line — vendor, freight, shipping
// and payment tracking together, same shape as the source app's flat
// `master_file_entries` (kept flat rather than normalized further, to keep
// the ported Odoo sync / reconciliation logic working against the same
// shape it already expects).
export const nassauMasterFileEntries = pgTable("nassau_master_file_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  purchaseOrderId: uuid("purchase_order_id")
    .unique()
    .references(() => nassauPurchaseOrders.id),
  vendor: text("vendor").notNull(),
  account: text("account"),
  invoiceNumber: text("invoice_number"),
  poNumber: text("po_number").notNull(),
  amount: numeric("amount", { mode: "number" }),
  paymentStatus: text("payment_status"),
  dueDate: date("due_date"),
  paidOn: date("paid_on"),
  paymentMethod: text("payment_method"),
  freightLeadTime: text("freight_lead_time"),
  freightCost: numeric("freight_cost", { mode: "number" }),
  wrNumber: text("wr_number"),
  receivedOn: date("received_on"),
  weightLb: numeric("weight_lb", { mode: "number" }),
  volumeFt3: numeric("volume_ft3", { mode: "number" }),
  commercialInvoiceNumber: text("commercial_invoice_number"),
  shippingStatus: text("shipping_status"),
  project: text("project"),
  subProject: text("sub_project"),
  notes: text("notes"),
  location: text("location").notNull().default("nassau"),
  invoiceFileName: text("invoice_file_name"),
  invoiceFileContentType: text("invoice_file_content_type"),
  invoiceFileDriveId: text("invoice_file_drive_id"),
  paymentReceiptId: uuid("payment_receipt_id").references(() => nassauPaymentReceipts.id),
  poDate: date("po_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Review queue: invoices that arrived by email (AgentMail) or manual
// upload, auto-matched by invoice-number heuristics to a master file entry,
// pending human approve/reject.
export const nassauInvoiceMatches = pgTable(
  "nassau_invoice_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source").notNull().default("email"),
    agentmailMessageId: text("agentmail_message_id").notNull(),
    agentmailAttachmentId: text("agentmail_attachment_id").notNull(),
    fromEmail: text("from_email").notNull(),
    subject: text("subject"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    attachmentFileName: text("attachment_file_name").notNull(),
    attachmentContentType: text("attachment_content_type").notNull(),
    attachmentDriveId: text("attachment_drive_id"),
    extractedInvoiceNumber: text("extracted_invoice_number"),
    extractedVendor: text("extracted_vendor"),
    extractedAmount: numeric("extracted_amount", { mode: "number" }),
    suggestedEntryId: uuid("suggested_entry_id").references(() => nassauMasterFileEntries.id),
    status: text("status").notNull().default("pending"), // "pending" | "approved" | "rejected"
    resolvedEntryId: uuid("resolved_entry_id").references(() => nassauMasterFileEntries.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    messageAttachmentUnique: unique().on(t.agentmailMessageId, t.agentmailAttachmentId),
  }),
);

// Nassau vendors registered manually, so their folder shows up in the
// invoices browser from day one even before any P.O./invoice is loaded.
export const nassauVendors = pgTable("nassau_vendors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Payment-support PDF sent by the accountant (one per vendor per payment
// batch), stored in Drive alongside that vendor's invoices.
export const nassauPaymentReceipts = pgTable("nassau_payment_receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  vendor: text("vendor").notNull(),
  paidOn: date("paid_on").notNull(),
  driveId: text("drive_id").notNull(),
  fileName: text("file_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
