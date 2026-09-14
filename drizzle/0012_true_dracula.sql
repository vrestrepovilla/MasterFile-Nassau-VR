CREATE TABLE "commercial_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"ci_number" text NOT NULL,
	"file_kind" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"blob_url" text NOT NULL,
	"purchase_id" integer,
	"container_id" integer,
	"uploaded_by" integer,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commercial_invoices" ADD CONSTRAINT "commercial_invoices_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_invoices" ADD CONSTRAINT "commercial_invoices_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."containers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_invoices" ADD CONSTRAINT "commercial_invoices_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;