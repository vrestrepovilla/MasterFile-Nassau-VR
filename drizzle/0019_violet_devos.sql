CREATE TABLE "nassau_invoice_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text DEFAULT 'email' NOT NULL,
	"agentmail_message_id" text NOT NULL,
	"agentmail_attachment_id" text NOT NULL,
	"from_email" text NOT NULL,
	"subject" text,
	"received_at" timestamp with time zone NOT NULL,
	"attachment_file_name" text NOT NULL,
	"attachment_content_type" text NOT NULL,
	"attachment_drive_id" text,
	"extracted_invoice_number" text,
	"extracted_vendor" text,
	"extracted_amount" numeric,
	"suggested_entry_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"resolved_entry_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nassau_master_file_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid,
	"vendor" text NOT NULL,
	"account" text,
	"invoice_number" text,
	"po_number" text NOT NULL,
	"amount" numeric,
	"payment_status" text,
	"due_date" date,
	"paid_on" date,
	"payment_method" text,
	"freight_lead_time" text,
	"freight_cost" numeric,
	"wr_number" text,
	"received_on" date,
	"weight_lb" numeric,
	"volume_ft3" numeric,
	"commercial_invoice_number" text,
	"shipping_status" text,
	"project" text,
	"sub_project" text,
	"notes" text,
	"location" text DEFAULT 'nassau' NOT NULL,
	"invoice_file_name" text,
	"invoice_file_content_type" text,
	"invoice_file_drive_id" text,
	"payment_receipt_id" uuid,
	"po_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nassau_master_file_entries_purchase_order_id_unique" UNIQUE("purchase_order_id")
);
--> statement-breakpoint
CREATE TABLE "nassau_payment_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor" text NOT NULL,
	"paid_on" date NOT NULL,
	"drive_id" text NOT NULL,
	"file_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nassau_purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"po_number" text NOT NULL,
	"notes" text,
	"pdf_file_name" text,
	"pdf_content_type" text,
	"pdf_drive_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nassau_purchase_orders_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
CREATE TABLE "nassau_purchase_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agentmail_message_id" text NOT NULL,
	"agentmail_thread_id" text,
	"from_email" text NOT NULL,
	"subject" text,
	"body_text" text,
	"body_html" text,
	"received_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nassau_purchase_requests_agentmail_message_id_unique" UNIQUE("agentmail_message_id")
);
--> statement-breakpoint
CREATE TABLE "nassau_vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nassau_vendors_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "nassau_invoice_matches" ADD CONSTRAINT "nassau_invoice_matches_suggested_entry_id_nassau_master_file_entries_id_fk" FOREIGN KEY ("suggested_entry_id") REFERENCES "public"."nassau_master_file_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nassau_invoice_matches" ADD CONSTRAINT "nassau_invoice_matches_resolved_entry_id_nassau_master_file_entries_id_fk" FOREIGN KEY ("resolved_entry_id") REFERENCES "public"."nassau_master_file_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nassau_master_file_entries" ADD CONSTRAINT "nassau_master_file_entries_purchase_order_id_nassau_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."nassau_purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nassau_master_file_entries" ADD CONSTRAINT "nassau_master_file_entries_payment_receipt_id_nassau_payment_receipts_id_fk" FOREIGN KEY ("payment_receipt_id") REFERENCES "public"."nassau_payment_receipts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nassau_purchase_orders" ADD CONSTRAINT "nassau_purchase_orders_request_id_nassau_purchase_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."nassau_purchase_requests"("id") ON DELETE no action ON UPDATE no action;