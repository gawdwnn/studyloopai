ALTER TABLE "course_weeks" ADD COLUMN "content_generation_status" varchar(50) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "course_weeks" ADD COLUMN "content_generation_metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "course_weeks" ADD COLUMN "content_generation_triggered_at" timestamp;--> statement-breakpoint
ALTER TABLE "course_weeks" ADD COLUMN "content_generation_completed_at" timestamp;--> statement-breakpoint
CREATE INDEX "idx_course_weeks_content_generation_status" ON "course_weeks" USING btree ("content_generation_status");