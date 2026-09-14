ALTER TABLE "purchase_invoices" ALTER COLUMN "file_data" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "blob_url" text;