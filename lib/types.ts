export type PurchaseOrder = {
  id: string;
  poNumber: string;
  notes: string | null;
  pdfFilename: string | null;
  createdAt: string;
  vendor: string | null;
  project: string | null;
  subProject: string | null;
};

export type PurchaseRequest = {
  id: string;
  fromEmail: string;
  subject: string | null;
  bodyText: string | null;
  receivedAt: string;
  purchaseOrder: PurchaseOrder | null;
};

export type MasterFileEntry = {
  id: string;
  purchaseOrderId: string | null;
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
  invoiceFileName: string | null;
  invoiceFileContentType: string | null;
  createdAt: string;
};

export type MasterFileLocation = "us" | "nassau";
