CREATE TABLE "freight_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor" text NOT NULL,
	"shipping_line" text,
	"pol" text,
	"pod" text,
	"transshipment" text,
	"transit_days" integer,
	"departure_days" text,
	"container_size" text NOT NULL,
	"price" numeric(12, 2),
	"currency" text DEFAULT 'USD',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
