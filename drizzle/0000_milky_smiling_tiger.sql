CREATE TYPE "public"."role" AS ENUM('admin', 'editor');--> statement-breakpoint
CREATE TYPE "public"."size" AS ENUM('LCL', '20ft', '40ft');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('Preparing', 'Booked', 'Loaded', 'In Transit', 'Arrived at Port', 'Customs', 'Released', 'Delivered', 'Delayed');--> statement-breakpoint
CREATE TABLE "containers" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" "status" DEFAULT 'Preparing' NOT NULL,
	"container_number" text,
	"project_id" integer,
	"size" "size",
	"ci_numbers" text,
	"ci_date" date,
	"ci_value" numeric(12, 2),
	"ci_currency" text DEFAULT 'USD',
	"shipping_line" text,
	"bill_of_lading" text,
	"etd" date,
	"port_of_discharge" text,
	"eta" date,
	"eta_jobsite" date,
	"return_to_port" date,
	"freight_vendor" text,
	"freight_cost" numeric(12, 2),
	"broker" text,
	"broker_invoice_number" text,
	"budgeted_broker" numeric(12, 2),
	"broker_real_cost" numeric(12, 2),
	"broker_payment_date" date,
	"broker_paid" boolean DEFAULT false NOT NULL,
	"payment_status" text,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"supervisor" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "projects_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'editor' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "containers" ADD CONSTRAINT "containers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "containers" ADD CONSTRAINT "containers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;