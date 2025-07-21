CREATE TABLE "concept_maps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"week_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"style" varchar(50) DEFAULT 'hierarchical' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "concept_maps" ADD CONSTRAINT "concept_maps_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_maps" ADD CONSTRAINT "concept_maps_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "public"."course_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_concept_maps_course_id" ON "concept_maps" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_concept_maps_week_id" ON "concept_maps" USING btree ("week_id");--> statement-breakpoint
CREATE INDEX "idx_concept_maps_style" ON "concept_maps" USING btree ("style");--> statement-breakpoint
CREATE INDEX "idx_concept_maps_course_week" ON "concept_maps" USING btree ("course_id","week_id");