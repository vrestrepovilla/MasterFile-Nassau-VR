CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS purchase_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agentmail_message_id  text UNIQUE NOT NULL,
  agentmail_thread_id   text,
  from_email            text NOT NULL,
  subject               text,
  body_text             text,
  body_html             text,
  received_at           timestamptz NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id        uuid NOT NULL UNIQUE REFERENCES purchase_requests(id),
  po_number         text NOT NULL,
  notes             text,
  pdf_filename      text,
  pdf_content_type  text,
  pdf_data          bytea,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_received_at
  ON purchase_requests (received_at DESC);

CREATE TABLE IF NOT EXISTS master_file_entries (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id         uuid UNIQUE REFERENCES purchase_orders(id),
  vendor                    text NOT NULL,
  account                   text,
  invoice_number            text,
  po_number                 text NOT NULL,
  amount                    numeric,
  payment_status            text,
  due_date                  date,
  paid_on                   date,
  payment_method            text,
  freight_lead_time         text,
  freight_cost              numeric,
  wr_number                 text,
  received_on               date,
  weight_lb                 numeric,
  volume_ft3                numeric,
  commercial_invoice_number text,
  shipping_status           text,
  project                   text,
  sub_project               text,
  notes                     text,
  location                  text NOT NULL DEFAULT 'us',
  invoice_file_name         text,
  invoice_file_content_type text,
  invoice_file_data         bytea,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE master_file_entries ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT 'us';
ALTER TABLE master_file_entries ADD COLUMN IF NOT EXISTS invoice_file_name text;
ALTER TABLE master_file_entries ADD COLUMN IF NOT EXISTS invoice_file_content_type text;
ALTER TABLE master_file_entries ADD COLUMN IF NOT EXISTS invoice_file_data bytea;
-- El archivo en si ahora se guarda en Google Drive (no en Postgres) - esta columna guarda solo
-- el id del archivo en Drive. invoice_file_data se deja en NULL para filas nuevas y se va vaciando
-- para las filas viejas al migrarlas, para no llenar de nuevo el espacio de la base de datos.
ALTER TABLE master_file_entries ADD COLUMN IF NOT EXISTS invoice_file_drive_id text;

CREATE INDEX IF NOT EXISTS idx_master_file_entries_location
  ON master_file_entries (location);

-- Cola de revision: facturas que llegaron por correo (AgentMail) o se subieron a mano,
-- con su PO sugerida, pendientes de que alguien las apruebe (o corrija) antes de adjuntarlas de verdad.
CREATE TABLE IF NOT EXISTS nassau_invoice_matches (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source                   text NOT NULL DEFAULT 'email',
  agentmail_message_id     text NOT NULL,
  agentmail_attachment_id  text NOT NULL,
  from_email               text NOT NULL,
  subject                  text,
  received_at              timestamptz NOT NULL,
  attachment_filename      text NOT NULL,
  attachment_content_type  text NOT NULL,
  attachment_data          bytea NOT NULL,
  extracted_invoice_number text,
  extracted_vendor         text,
  extracted_amount         numeric,
  suggested_entry_id       uuid REFERENCES master_file_entries(id),
  status                   text NOT NULL DEFAULT 'pending',
  resolved_entry_id        uuid REFERENCES master_file_entries(id),
  resolved_at              timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agentmail_message_id, agentmail_attachment_id)
);

ALTER TABLE nassau_invoice_matches ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'email';
ALTER TABLE nassau_invoice_matches ADD COLUMN IF NOT EXISTS extracted_vendor text;
ALTER TABLE nassau_invoice_matches ADD COLUMN IF NOT EXISTS extracted_amount numeric;
-- Igual que en master_file_entries: el archivo se guarda en Google Drive, no en Postgres.
ALTER TABLE nassau_invoice_matches ADD COLUMN IF NOT EXISTS attachment_drive_id text;
ALTER TABLE nassau_invoice_matches ALTER COLUMN attachment_data DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nassau_invoice_matches_status
  ON nassau_invoice_matches (status);

-- Proveedores de Nassau registrados manualmente (para que aparezca su carpeta en Invoices
-- desde el dia uno, incluso antes de tener alguna PO o factura cargada).
CREATE TABLE IF NOT EXISTS nassau_vendors (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Soporte de pago que envia la contadora (un PDF por proveedor por tanda de pago), guardado en
-- Drive junto con las facturas de ese proveedor. Cada master_file_entries pagada puede apuntar
-- a uno de estos como prueba de que efectivamente se pago.
CREATE TABLE IF NOT EXISTS nassau_payment_receipts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor     text NOT NULL,
  paid_on    date NOT NULL,
  drive_id   text NOT NULL,
  file_name  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE master_file_entries ADD COLUMN IF NOT EXISTS payment_receipt_id uuid REFERENCES nassau_payment_receipts(id);

-- Fecha real de la orden en Odoo (date_order). created_at solo refleja cuando esta fila se
-- sincronizo/creo en este sistema, no cuando se hizo la compra realmente - por eso el reporte
-- mensual del dashboard necesita esta columna en vez de created_at para las POs de Odoo.
ALTER TABLE master_file_entries ADD COLUMN IF NOT EXISTS po_date date;
