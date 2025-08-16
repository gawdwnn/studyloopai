ALTER TABLE "course_materials" ALTER COLUMN "week_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "course_week_features" ALTER COLUMN "config_data" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "course_week_features" ALTER COLUMN "config_data" DROP NOT NULL;