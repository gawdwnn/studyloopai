DROP INDEX "idx_course_week_features_state";--> statement-breakpoint
ALTER TABLE "course_week_features" DROP COLUMN "generation_state";--> statement-breakpoint
ALTER TABLE "course_week_features" DROP COLUMN "generation_state_history";--> statement-breakpoint
ALTER TABLE "course_week_features" DROP COLUMN "retry_count";--> statement-breakpoint
ALTER TABLE "course_week_features" DROP COLUMN "last_error";--> statement-breakpoint
DROP TYPE "public"."generation_state";