ALTER TABLE "generation_configs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "institutions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "generation_configs" CASCADE;--> statement-breakpoint
DROP TABLE "institutions" CASCADE;--> statement-breakpoint
-- Constraints already dropped by CASCADE when institutions table was dropped
-- ALTER TABLE "course_week_features" DROP CONSTRAINT "course_week_features_config_id_fkey";
-- ALTER TABLE "users" DROP CONSTRAINT "users_institution_id_fkey";
ALTER TABLE "course_week_features" ADD COLUMN "config_data" jsonb DEFAULT '{"selectedFeatures":{"cuecards":false,"mcqs":false,"openQuestions":false,"summaries":false,"goldenNotes":false,"conceptMaps":false},"featureConfigs":{"goldenNotes":{"count":5,"focus":"conceptual","difficulty":"intermediate"},"mcqs":{"count":10,"focus":"practical","difficulty":"intermediate"}}}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "course_week_features" ADD COLUMN "generation_status" varchar(20) DEFAULT 'not_requested';--> statement-breakpoint
ALTER TABLE "course_week_features" ADD COLUMN "generation_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "course_week_features" ADD COLUMN "generation_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "course_week_features" ADD COLUMN "failed_features" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
CREATE INDEX "idx_course_week_features_config_data" ON "course_week_features" USING gin ("config_data");--> statement-breakpoint
CREATE INDEX "idx_course_week_features_generation_status" ON "course_week_features" USING btree ("generation_status");--> statement-breakpoint
CREATE INDEX "idx_course_week_features_generation_started_at" ON "course_week_features" USING btree ("generation_started_at");--> statement-breakpoint
CREATE INDEX "idx_course_week_features_generation_completed_at" ON "course_week_features" USING btree ("generation_completed_at");--> statement-breakpoint
CREATE INDEX "idx_course_week_features_failed_features" ON "course_week_features" USING gin ("failed_features");--> statement-breakpoint
CREATE INDEX "idx_course_week_features_course_week" ON "course_week_features" USING btree ("course_id","week_id");--> statement-breakpoint
CREATE INDEX "idx_course_week_features_status_timestamps" ON "course_week_features" USING btree ("generation_status","generation_started_at","generation_completed_at");--> statement-breakpoint
ALTER TABLE "course_week_features" DROP COLUMN "last_generation_config_id";--> statement-breakpoint
DROP TYPE "public"."configuration_source";