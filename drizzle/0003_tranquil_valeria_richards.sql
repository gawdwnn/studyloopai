ALTER TABLE "course_materials" ADD COLUMN "content_type" varchar(50) DEFAULT 'pdf';--> statement-breakpoint
ALTER TABLE "course_materials" ADD COLUMN "original_filename" varchar(255);--> statement-breakpoint
ALTER TABLE "course_materials" ADD COLUMN "processing_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "course_materials" ADD COLUMN "processing_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "course_materials" ADD COLUMN "content_metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "course_materials" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "course_materials" ADD COLUMN "transcript_path" varchar(500);--> statement-breakpoint
ALTER TABLE "course_materials" ADD COLUMN "thumbnail_path" varchar(500);--> statement-breakpoint
CREATE INDEX "idx_course_materials_content_type" ON "course_materials" USING btree ("content_type");--> statement-breakpoint
CREATE INDEX "idx_course_materials_processing_status" ON "course_materials" USING btree ("processing_metadata");