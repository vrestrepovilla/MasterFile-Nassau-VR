CREATE TABLE "duty_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchandise" text NOT NULL,
	"technical_description" text,
	"duty_rate_percent" numeric(5, 2) NOT NULL,
	"hs_code" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
