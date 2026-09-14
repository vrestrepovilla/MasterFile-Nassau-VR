CREATE TYPE "public"."department" AS ENUM('all', 'logistica', 'compras');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "department" "department" DEFAULT 'all' NOT NULL;