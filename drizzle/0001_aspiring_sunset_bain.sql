CREATE TABLE "container_projects" (
	"container_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	CONSTRAINT "container_projects_container_id_project_id_pk" PRIMARY KEY("container_id","project_id")
);
--> statement-breakpoint
ALTER TABLE "containers" DROP CONSTRAINT "containers_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "containers" ALTER COLUMN "size" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "container_projects" ADD CONSTRAINT "container_projects_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."containers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "container_projects" ADD CONSTRAINT "container_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "containers" DROP COLUMN "project_id";--> statement-breakpoint
DROP TYPE "public"."size";