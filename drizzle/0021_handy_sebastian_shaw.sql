CREATE TABLE "course_week_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"week_id" uuid NOT NULL,
	"cuecards_generated" boolean DEFAULT false,
	"cuecards_count" integer DEFAULT 0,
	"cuecards_generated_at" timestamp,
	"mcqs_generated" boolean DEFAULT false,
	"mcqs_count" integer DEFAULT 0,
	"mcqs_generated_at" timestamp,
	"open_questions_generated" boolean DEFAULT false,
	"open_questions_count" integer DEFAULT 0,
	"open_questions_generated_at" timestamp,
	"summaries_generated" boolean DEFAULT false,
	"summaries_count" integer DEFAULT 0,
	"summaries_generated_at" timestamp,
	"golden_notes_generated" boolean DEFAULT false,
	"golden_notes_count" integer DEFAULT 0,
	"golden_notes_generated_at" timestamp,
	"concept_maps_generated" boolean DEFAULT false,
	"concept_maps_count" integer DEFAULT 0,
	"concept_maps_generated_at" timestamp,
	"last_generation_config_id" uuid,
	"generation_state" varchar(20) DEFAULT 'not_started',
	"generation_state_history" jsonb DEFAULT '[]',
	"retry_count" integer DEFAULT 0,
	"last_error" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_course_week" UNIQUE("course_id","week_id")
);
--> statement-breakpoint
ALTER TABLE "course_week_features" ADD CONSTRAINT "course_week_features_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_week_features" ADD CONSTRAINT "course_week_features_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "public"."course_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_week_features" ADD CONSTRAINT "course_week_features_config_id_fkey" FOREIGN KEY ("last_generation_config_id") REFERENCES "public"."generation_configs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_course_week_features_course_id" ON "course_week_features" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_course_week_features_week_id" ON "course_week_features" USING btree ("week_id");--> statement-breakpoint
CREATE INDEX "idx_course_week_features_state" ON "course_week_features" USING btree ("generation_state");--> statement-breakpoint
CREATE INDEX "idx_course_week_features_updated" ON "course_week_features" USING btree ("updated_at");--> statement-breakpoint

-- Data migration: Initialize tracking for existing content
-- Cuecards
INSERT INTO "course_week_features" (
  "course_id", 
  "week_id", 
  "cuecards_generated", 
  "cuecards_count",
  "cuecards_generated_at",
  "generation_state",
  "generation_state_history"
)
SELECT DISTINCT 
  c.course_id, 
  c.week_id, 
  true, 
  COUNT(*),
  MIN(c.created_at),
  'completed',
  jsonb_build_array(
    jsonb_build_object(
      'state', 'completed',
      'timestamp', MIN(c.created_at),
      'feature', 'cuecards',
      'migrated', true
    )
  )
FROM cuecards c
GROUP BY c.course_id, c.week_id
ON CONFLICT (course_id, week_id) DO UPDATE SET
  cuecards_generated = true,
  cuecards_count = EXCLUDED.cuecards_count,
  cuecards_generated_at = EXCLUDED.cuecards_generated_at,
  generation_state = 'completed';--> statement-breakpoint

-- MCQs
INSERT INTO "course_week_features" (
  "course_id", 
  "week_id", 
  "mcqs_generated", 
  "mcqs_count",
  "mcqs_generated_at",
  "generation_state",
  "generation_state_history"
)
SELECT DISTINCT 
  m.course_id, 
  m.week_id, 
  true, 
  COUNT(*),
  MIN(m.created_at),
  'completed',
  jsonb_build_array(
    jsonb_build_object(
      'state', 'completed',
      'timestamp', MIN(m.created_at),
      'feature', 'mcqs',
      'migrated', true
    )
  )
FROM multiple_choice_questions m
GROUP BY m.course_id, m.week_id
ON CONFLICT (course_id, week_id) DO UPDATE SET
  mcqs_generated = true,
  mcqs_count = EXCLUDED.mcqs_count,
  mcqs_generated_at = EXCLUDED.mcqs_generated_at,
  generation_state = 'completed';--> statement-breakpoint

-- Open Questions
INSERT INTO "course_week_features" (
  "course_id", 
  "week_id", 
  "open_questions_generated", 
  "open_questions_count",
  "open_questions_generated_at",
  "generation_state",
  "generation_state_history"
)
SELECT DISTINCT 
  o.course_id, 
  o.week_id, 
  true, 
  COUNT(*),
  MIN(o.created_at),
  'completed',
  jsonb_build_array(
    jsonb_build_object(
      'state', 'completed',
      'timestamp', MIN(o.created_at),
      'feature', 'open_questions',
      'migrated', true
    )
  )
FROM open_questions o
GROUP BY o.course_id, o.week_id
ON CONFLICT (course_id, week_id) DO UPDATE SET
  open_questions_generated = true,
  open_questions_count = EXCLUDED.open_questions_count,
  open_questions_generated_at = EXCLUDED.open_questions_generated_at,
  generation_state = 'completed';--> statement-breakpoint

-- Summaries
INSERT INTO "course_week_features" (
  "course_id", 
  "week_id", 
  "summaries_generated", 
  "summaries_count",
  "summaries_generated_at",
  "generation_state",
  "generation_state_history"
)
SELECT DISTINCT 
  s.course_id, 
  s.week_id, 
  true, 
  COUNT(*),
  MIN(s.created_at),
  'completed',
  jsonb_build_array(
    jsonb_build_object(
      'state', 'completed',
      'timestamp', MIN(s.created_at),
      'feature', 'summaries',
      'migrated', true
    )
  )
FROM summaries s
GROUP BY s.course_id, s.week_id
ON CONFLICT (course_id, week_id) DO UPDATE SET
  summaries_generated = true,
  summaries_count = EXCLUDED.summaries_count,
  summaries_generated_at = EXCLUDED.summaries_generated_at,
  generation_state = 'completed';--> statement-breakpoint

-- Golden Notes
INSERT INTO "course_week_features" (
  "course_id", 
  "week_id", 
  "golden_notes_generated", 
  "golden_notes_count",
  "golden_notes_generated_at",
  "generation_state",
  "generation_state_history"
)
SELECT DISTINCT 
  g.course_id, 
  g.week_id, 
  true, 
  COUNT(*),
  MIN(g.created_at),
  'completed',
  jsonb_build_array(
    jsonb_build_object(
      'state', 'completed',
      'timestamp', MIN(g.created_at),
      'feature', 'golden_notes',
      'migrated', true
    )
  )
FROM golden_notes g
GROUP BY g.course_id, g.week_id
ON CONFLICT (course_id, week_id) DO UPDATE SET
  golden_notes_generated = true,
  golden_notes_count = EXCLUDED.golden_notes_count,
  golden_notes_generated_at = EXCLUDED.golden_notes_generated_at,
  generation_state = 'completed';--> statement-breakpoint

-- Concept Maps
INSERT INTO "course_week_features" (
  "course_id", 
  "week_id", 
  "concept_maps_generated", 
  "concept_maps_count",
  "concept_maps_generated_at",
  "generation_state",
  "generation_state_history"
)
SELECT DISTINCT 
  cm.course_id, 
  cm.week_id, 
  true, 
  COUNT(*),
  MIN(cm.created_at),
  'completed',
  jsonb_build_array(
    jsonb_build_object(
      'state', 'completed',
      'timestamp', MIN(cm.created_at),
      'feature', 'concept_maps',
      'migrated', true
    )
  )
FROM concept_maps cm
GROUP BY cm.course_id, cm.week_id
ON CONFLICT (course_id, week_id) DO UPDATE SET
  concept_maps_generated = true,
  concept_maps_count = EXCLUDED.concept_maps_count,
  concept_maps_generated_at = EXCLUDED.concept_maps_generated_at,
  generation_state = 'completed';