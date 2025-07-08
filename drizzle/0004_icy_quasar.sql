CREATE TABLE "flashcards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"difficulty" varchar(20) DEFAULT 'intermediate',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"week_id" uuid
);
--> statement-breakpoint
CREATE TABLE "generation_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"config_source" varchar(50) NOT NULL,
	"golden_notes_count" integer NOT NULL,
	"flashcards_count" integer NOT NULL,
	"summary_length" integer NOT NULL,
	"exam_exercises_count" integer NOT NULL,
	"mcq_exercises_count" integer NOT NULL,
	"difficulty" varchar(20) NOT NULL,
	"focus" varchar(20) NOT NULL,
	"adaptation_reason" text,
	"user_performance_level" varchar(20),
	"learning_gaps" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "golden_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"priority" integer DEFAULT 1,
	"category" varchar(100),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"week_id" uuid
);
--> statement-breakpoint
CREATE TABLE "multiple_choice_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_answer" varchar(5) NOT NULL,
	"explanation" text,
	"difficulty" varchar(20) DEFAULT 'intermediate',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"week_id" uuid
);
--> statement-breakpoint
CREATE TABLE "open_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid,
	"question" text NOT NULL,
	"sample_answer" text,
	"grading_rubric" jsonb,
	"difficulty" varchar(20) DEFAULT 'intermediate',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"week_id" uuid
);
--> statement-breakpoint
CREATE TABLE "own_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"material_id" uuid,
	"course_id" uuid,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"note_type" varchar(50) DEFAULT 'general',
	"tags" jsonb DEFAULT '[]'::jsonb,
	"is_private" boolean DEFAULT true,
	"color" varchar(20) DEFAULT '#ffffff',
	"position" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"material_id" uuid,
	"title" varchar(255),
	"content" text NOT NULL,
	"summary_type" varchar(50) DEFAULT 'general',
	"word_count" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"week_id" uuid
);
--> statement-breakpoint
CREATE TABLE "user_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"content_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'not_started',
	"score" integer,
	"attempts" integer DEFAULT 0,
	"last_attempt_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_progress_unique" UNIQUE("user_id","content_type","content_id")
);
--> statement-breakpoint
CREATE INDEX "idx_flashcards_material_id" ON "flashcards" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "idx_flashcards_difficulty" ON "flashcards" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "idx_flashcards_week_id" ON "flashcards" USING btree ("week_id");--> statement-breakpoint
CREATE INDEX "idx_generation_configs_material_id" ON "generation_configs" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "idx_generation_configs_user_id" ON "generation_configs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_generation_configs_source" ON "generation_configs" USING btree ("config_source");--> statement-breakpoint
CREATE INDEX "idx_generation_configs_difficulty" ON "generation_configs" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "idx_generation_configs_performance" ON "generation_configs" USING btree ("user_performance_level");--> statement-breakpoint
CREATE INDEX "idx_generation_configs_active" ON "generation_configs" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_golden_notes_material_id" ON "golden_notes" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "idx_golden_notes_priority" ON "golden_notes" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_golden_notes_category" ON "golden_notes" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_golden_notes_week_id" ON "golden_notes" USING btree ("week_id");--> statement-breakpoint
CREATE INDEX "idx_mcq_material_id" ON "multiple_choice_questions" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "idx_mcq_difficulty" ON "multiple_choice_questions" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "idx_mcq_week_id" ON "multiple_choice_questions" USING btree ("week_id");--> statement-breakpoint
CREATE INDEX "idx_open_questions_material_id" ON "open_questions" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "idx_open_questions_difficulty" ON "open_questions" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "idx_open_questions_week_id" ON "open_questions" USING btree ("week_id");--> statement-breakpoint
CREATE INDEX "idx_own_notes_user_id" ON "own_notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_own_notes_material_id" ON "own_notes" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "idx_own_notes_course_id" ON "own_notes" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_own_notes_note_type" ON "own_notes" USING btree ("note_type");--> statement-breakpoint
CREATE INDEX "idx_own_notes_created_at" ON "own_notes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_summaries_material_id" ON "summaries" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "idx_summaries_type" ON "summaries" USING btree ("summary_type");--> statement-breakpoint
CREATE INDEX "idx_summaries_week_id" ON "summaries" USING btree ("week_id");--> statement-breakpoint
CREATE INDEX "idx_user_progress_user_id" ON "user_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_progress_content" ON "user_progress" USING btree ("content_type","content_id");--> statement-breakpoint
CREATE INDEX "idx_user_progress_status" ON "user_progress" USING btree ("status");

-- Note: RLS policies and ENABLE statements have been moved to drizzle/policies/ folder
-- This keeps schema migrations focused on table structure only
-- Use: node scripts/policy-manager.js to manage RLS policies