ALTER TABLE "purchase_invoices" ALTER COLUMN "blob_url" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_invoices" DROP COLUMN "file_data";