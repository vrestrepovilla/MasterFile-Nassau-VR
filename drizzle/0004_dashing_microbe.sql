ALTER TABLE "containers" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "containers" ALTER COLUMN "status" SET DEFAULT 'Preparing'::text;--> statement-breakpoint
DROP TYPE "public"."status";--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('Preparing', 'Booked', 'In Transit', 'Arrived at Port', 'Customs', 'Delivered', 'Delayed');--> statement-breakpoint
ALTER TABLE "containers" ALTER COLUMN "status" SET DEFAULT 'Preparing'::"public"."status";--> statement-breakpoint
ALTER TABLE "containers" ALTER COLUMN "status" SET DATA TYPE "public"."status" USING "status"::"public"."status";