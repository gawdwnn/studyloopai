CREATE TYPE "public"."configuration_source" AS ENUM('user_preference', 'course_default', 'course_week_override', 'adaptive_algorithm', 'system_default', 'institution_default');--> statement-breakpoint
CREATE TABLE "institutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"default_generation_config" jsonb,
	"logo_url" varchar(500),
	"primary_color" varchar(7),
	"custom_domain" varchar(255),
	"max_courses" integer DEFAULT 100,
	"max_students_per_course" integer DEFAULT 1000,
	"max_instructors" integer DEFAULT 50,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"contact_email" varchar(255),
	"billing_email" varchar(255),
	"metadata" jsonb,
	CONSTRAINT "institutions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "generation_configs" DROP CONSTRAINT "generation_configs_material_id_fkey";
--> statement-breakpoint
DROP INDEX "idx_generation_configs_material_id";--> statement-breakpoint
DROP INDEX "idx_generation_configs_user_id";--> statement-breakpoint
DROP INDEX "idx_generation_configs_source";--> statement-breakpoint
DROP INDEX "idx_generation_configs_difficulty";--> statement-breakpoint
DROP INDEX "idx_generation_configs_performance";--> statement-breakpoint
DROP INDEX "idx_generation_configs_active";--> statement-breakpoint
ALTER TABLE "generation_configs" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_configs" ALTER COLUMN "config_source" SET DATA TYPE "public"."configuration_source" USING "config_source"::"public"."configuration_source";--> statement-breakpoint
ALTER TABLE "generation_configs" ALTER COLUMN "learning_gaps" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "generation_configs" ADD COLUMN "course_id" uuid;--> statement-breakpoint
ALTER TABLE "generation_configs" ADD COLUMN "week_id" uuid;--> statement-breakpoint
ALTER TABLE "generation_configs" ADD COLUMN "institution_id" uuid;--> statement-breakpoint
ALTER TABLE "generation_configs" ADD COLUMN "config_data" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_configs" ADD COLUMN "adaptive_factors" jsonb;--> statement-breakpoint
ALTER TABLE "generation_configs" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_configs" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "generation_configs" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "institution_id" uuid;--> statement-breakpoint
CREATE INDEX "idx_institutions_slug" ON "institutions" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_institutions_active" ON "institutions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_institutions_created_at" ON "institutions" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "generation_configs" ADD CONSTRAINT "generation_configs_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_configs" ADD CONSTRAINT "generation_configs_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "public"."course_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_configs" ADD CONSTRAINT "generation_configs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_configs" ADD CONSTRAINT "generation_configs_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_generation_configs_user_scope" ON "generation_configs" USING btree ("user_id","config_source");--> statement-breakpoint
CREATE INDEX "idx_generation_configs_course_scope" ON "generation_configs" USING btree ("course_id","config_source");--> statement-breakpoint
CREATE INDEX "idx_generation_configs_week_scope" ON "generation_configs" USING btree ("week_id","config_source");--> statement-breakpoint
CREATE INDEX "idx_generation_configs_source_active" ON "generation_configs" USING btree ("config_source","is_active");--> statement-breakpoint
CREATE INDEX "idx_generation_configs_applied_at" ON "generation_configs" USING btree ("applied_at");--> statement-breakpoint
ALTER TABLE "generation_configs" DROP COLUMN "material_id";--> statement-breakpoint
ALTER TABLE "generation_configs" DROP COLUMN "golden_notes_count";--> statement-breakpoint
ALTER TABLE "generation_configs" DROP COLUMN "cuecards_count";--> statement-breakpoint
ALTER TABLE "generation_configs" DROP COLUMN "summary_length";--> statement-breakpoint
ALTER TABLE "generation_configs" DROP COLUMN "exam_exercises_count";--> statement-breakpoint
ALTER TABLE "generation_configs" DROP COLUMN "mcq_exercises_count";--> statement-breakpoint
ALTER TABLE "generation_configs" DROP COLUMN "difficulty";--> statement-breakpoint
ALTER TABLE "generation_configs" DROP COLUMN "focus";--> statement-breakpoint
ALTER TABLE "generation_configs" ADD CONSTRAINT "unique_user_preference" UNIQUE("user_id","config_source");--> statement-breakpoint
ALTER TABLE "generation_configs" ADD CONSTRAINT "unique_course_default" UNIQUE("course_id","config_source");--> statement-breakpoint
ALTER TABLE "generation_configs" ADD CONSTRAINT "unique_week_override" UNIQUE("week_id","config_source");