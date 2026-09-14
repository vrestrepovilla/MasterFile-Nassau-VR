CREATE TABLE "broker_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"container_id" integer NOT NULL,
	"label" text,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"file_data" text NOT NULL,
	"uploaded_by" integer,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "broker_invoices" ADD CONSTRAINT "broker_invoices_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."containers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broker_invoices" ADD CONSTRAINT "broker_invoices_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;