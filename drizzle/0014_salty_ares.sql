CREATE TABLE "price_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"material" text NOT NULL,
	"unit" text,
	"unit_cost" numeric(12, 3),
	"vendor" text,
	"po_number" text,
	"po_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
