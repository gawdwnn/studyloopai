DROP INDEX "idx_course_materials_processing_status";--> statement-breakpoint
DROP INDEX "idx_course_weeks_content_generation_status";--> statement-breakpoint
ALTER TABLE "generation_configs" ADD COLUMN "generation_status" varchar(20) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "generation_configs" ADD COLUMN "generation_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "generation_configs" ADD COLUMN "generation_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "generation_configs" ADD COLUMN "failed_features" jsonb DEFAULT '[]';--> statement-breakpoint
CREATE INDEX "idx_course_materials_embedding_status" ON "course_materials" USING btree ("embedding_status");--> statement-breakpoint
CREATE INDEX "idx_course_materials_upload_status" ON "course_materials" USING btree ("upload_status");--> statement-breakpoint
ALTER TABLE "course_materials" DROP COLUMN "processing_metadata";--> statement-breakpoint
ALTER TABLE "course_materials" DROP COLUMN "run_id";--> statement-breakpoint
ALTER TABLE "course_materials" DROP COLUMN "embedding_metadata";--> statement-breakpoint
ALTER TABLE "course_materials" DROP COLUMN "content_metadata";--> statement-breakpoint
ALTER TABLE "course_materials" DROP COLUMN "generation_metadata";--> statement-breakpoint
ALTER TABLE "course_weeks" DROP COLUMN "start_date";--> statement-breakpoint
ALTER TABLE "course_weeks" DROP COLUMN "end_date";--> statement-breakpoint
ALTER TABLE "course_weeks" DROP COLUMN "content_generation_status";--> statement-breakpoint
ALTER TABLE "course_weeks" DROP COLUMN "content_generation_metadata";--> statement-breakpoint
ALTER TABLE "course_weeks" DROP COLUMN "content_generation_triggered_at";--> statement-breakpoint
ALTER TABLE "course_weeks" DROP COLUMN "content_generation_completed_at";