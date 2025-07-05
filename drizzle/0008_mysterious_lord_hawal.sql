CREATE TABLE "cuecards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"week_id" uuid NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"difficulty" varchar(20) DEFAULT 'intermediate',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "golden_notes" DROP CONSTRAINT IF EXISTS "golden_notes_material_id_fkey";
--> statement-breakpoint
ALTER TABLE "multiple_choice_questions" DROP CONSTRAINT IF EXISTS "multiple_choice_questions_material_id_fkey";
--> statement-breakpoint
ALTER TABLE "open_questions" DROP CONSTRAINT IF EXISTS "open_questions_material_id_fkey";
--> statement-breakpoint
ALTER TABLE "summaries" DROP CONSTRAINT IF EXISTS "summaries_material_id_fkey";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_golden_notes_material_id";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_mcq_material_id";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_open_questions_material_id";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_summaries_material_id";--> statement-breakpoint
ALTER TABLE "golden_notes" ALTER COLUMN "week_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "multiple_choice_questions" ALTER COLUMN "week_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "open_questions" ALTER COLUMN "week_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "summaries" ALTER COLUMN "week_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_configs" ADD COLUMN "cuecards_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "golden_notes" ADD COLUMN "course_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "multiple_choice_questions" ADD COLUMN "course_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "open_questions" ADD COLUMN "course_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "summaries" ADD COLUMN "course_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "cuecards" ADD CONSTRAINT "cuecards_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuecards" ADD CONSTRAINT "cuecards_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "public"."course_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_cuecards_course_id" ON "cuecards" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_cuecards_week_id" ON "cuecards" USING btree ("week_id");--> statement-breakpoint
CREATE INDEX "idx_cuecards_difficulty" ON "cuecards" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "idx_cuecards_course_week" ON "cuecards" USING btree ("course_id","week_id");--> statement-breakpoint
ALTER TABLE "golden_notes" ADD CONSTRAINT "golden_notes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "golden_notes" ADD CONSTRAINT "golden_notes_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "public"."course_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multiple_choice_questions" ADD CONSTRAINT "multiple_choice_questions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multiple_choice_questions" ADD CONSTRAINT "multiple_choice_questions_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "public"."course_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_questions" ADD CONSTRAINT "open_questions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_questions" ADD CONSTRAINT "open_questions_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "public"."course_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "public"."course_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_golden_notes_course_id" ON "golden_notes" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_golden_notes_course_week" ON "golden_notes" USING btree ("course_id","week_id");--> statement-breakpoint
CREATE INDEX "idx_mcq_course_id" ON "multiple_choice_questions" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_mcq_course_week" ON "multiple_choice_questions" USING btree ("course_id","week_id");--> statement-breakpoint
CREATE INDEX "idx_open_questions_course_id" ON "open_questions" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_open_questions_course_week" ON "open_questions" USING btree ("course_id","week_id");--> statement-breakpoint
CREATE INDEX "idx_summaries_course_id" ON "summaries" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_summaries_course_week" ON "summaries" USING btree ("course_id","week_id");--> statement-breakpoint
ALTER TABLE "golden_notes" DROP COLUMN "material_id";--> statement-breakpoint
ALTER TABLE "multiple_choice_questions" DROP COLUMN "material_id";--> statement-breakpoint
ALTER TABLE "open_questions" DROP COLUMN "material_id";--> statement-breakpoint
ALTER TABLE "summaries" DROP COLUMN "material_id";