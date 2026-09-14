ALTER TABLE "commercial_invoices" ALTER COLUMN "blob_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ALTER COLUMN "blob_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "commercial_invoices" ADD COLUMN "drive_file_id" text;--> statement-breakpoint
ALTER TABLE "purchase_invoices" ADD COLUMN "drive_file_id" text;