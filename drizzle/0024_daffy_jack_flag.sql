CREATE TABLE "ai_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recommendation_type" varchar(50) NOT NULL,
	"content_data" jsonb NOT NULL,
	"priority" integer NOT NULL,
	"reasoning" text,
	"is_accepted" boolean,
	"accepted_at" timestamp,
	"dismissed_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concept_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"concept_name" varchar(255) NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"content_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"week_id" uuid,
	"confidence_score" integer DEFAULT 100 NOT NULL,
	"extracted_by" varchar(50) DEFAULT 'ai' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cuecard_scheduling" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"next_review_at" timestamp NOT NULL,
	"interval_days" integer NOT NULL,
	"ease_factor" integer DEFAULT 250 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"consecutive_correct" integer DEFAULT 0 NOT NULL,
	"last_reviewed_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cuecard_scheduling_user_card_unique" UNIQUE("user_id","card_id")
);
--> statement-breakpoint
CREATE TABLE "learning_gaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"content_id" uuid NOT NULL,
	"concept_id" uuid,
	"severity" integer NOT NULL,
	"failure_count" integer DEFAULT 1 NOT NULL,
	"last_failure_at" timestamp NOT NULL,
	"identified_at" timestamp DEFAULT now() NOT NULL,
	"recovered_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"session_config" jsonb NOT NULL,
	"total_time" integer NOT NULL,
	"items_completed" integer NOT NULL,
	"accuracy" integer NOT NULL,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"content_id" uuid NOT NULL,
	"response_data" jsonb NOT NULL,
	"response_time" integer NOT NULL,
	"is_correct" boolean NOT NULL,
	"attempted_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_mappings" ADD CONSTRAINT "concept_mappings_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_mappings" ADD CONSTRAINT "concept_mappings_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "public"."course_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuecard_scheduling" ADD CONSTRAINT "cuecard_scheduling_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuecard_scheduling" ADD CONSTRAINT "cuecard_scheduling_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "public"."cuecards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_gaps" ADD CONSTRAINT "learning_gaps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_responses" ADD CONSTRAINT "session_responses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."learning_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_recommendations_user_id" ON "ai_recommendations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_recommendations_type" ON "ai_recommendations" USING btree ("recommendation_type");--> statement-breakpoint
CREATE INDEX "idx_ai_recommendations_priority" ON "ai_recommendations" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_ai_recommendations_is_accepted" ON "ai_recommendations" USING btree ("is_accepted");--> statement-breakpoint
CREATE INDEX "idx_ai_recommendations_expires_at" ON "ai_recommendations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_ai_recommendations_user_active" ON "ai_recommendations" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "idx_ai_recommendations_active" ON "ai_recommendations" USING btree ("user_id","expires_at","is_accepted","priority" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_concept_mappings_concept_name" ON "concept_mappings" USING btree ("concept_name");--> statement-breakpoint
CREATE INDEX "idx_concept_mappings_content" ON "concept_mappings" USING btree ("content_type","content_id");--> statement-breakpoint
CREATE INDEX "idx_concept_mappings_course_id" ON "concept_mappings" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_concept_mappings_week_id" ON "concept_mappings" USING btree ("week_id");--> statement-breakpoint
CREATE INDEX "idx_concept_mappings_course_concept" ON "concept_mappings" USING btree ("course_id","concept_name");--> statement-breakpoint
CREATE INDEX "idx_cuecard_scheduling_user_id" ON "cuecard_scheduling" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_cuecard_scheduling_card_id" ON "cuecard_scheduling" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "idx_cuecard_scheduling_next_review" ON "cuecard_scheduling" USING btree ("next_review_at");--> statement-breakpoint
CREATE INDEX "idx_cuecard_scheduling_is_active" ON "cuecard_scheduling" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_cuecard_scheduling_user_due" ON "cuecard_scheduling" USING btree ("user_id","next_review_at","is_active");--> statement-breakpoint
CREATE INDEX "idx_learning_gaps_user_id" ON "learning_gaps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_learning_gaps_content" ON "learning_gaps" USING btree ("content_type","content_id");--> statement-breakpoint
CREATE INDEX "idx_learning_gaps_concept_id" ON "learning_gaps" USING btree ("concept_id");--> statement-breakpoint
CREATE INDEX "idx_learning_gaps_severity" ON "learning_gaps" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_learning_gaps_is_active" ON "learning_gaps" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_learning_gaps_user_active" ON "learning_gaps" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_learning_gaps_user_priority" ON "learning_gaps" USING btree ("user_id","is_active","severity" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_learning_sessions_user_id" ON "learning_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_learning_sessions_content_type" ON "learning_sessions" USING btree ("content_type");--> statement-breakpoint
CREATE INDEX "idx_learning_sessions_completed_at" ON "learning_sessions" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "idx_learning_sessions_user_content" ON "learning_sessions" USING btree ("user_id","content_type");--> statement-breakpoint
CREATE INDEX "idx_learning_sessions_user_date" ON "learning_sessions" USING btree ("user_id","completed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_session_responses_session_id" ON "session_responses" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_session_responses_content_id" ON "session_responses" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "idx_session_responses_is_correct" ON "session_responses" USING btree ("is_correct");--> statement-breakpoint
CREATE INDEX "idx_session_responses_attempted_at" ON "session_responses" USING btree ("attempted_at");--> statement-breakpoint
CREATE INDEX "idx_session_responses_content_performance" ON "session_responses" USING btree ("content_id","attempted_at" DESC NULLS LAST,"is_correct");--> statement-breakpoint
CREATE INDEX "idx_course_weeks_course_number" ON "course_weeks" USING btree ("course_id","week_number");--> statement-breakpoint
CREATE INDEX "idx_course_weeks_course_active" ON "course_weeks" USING btree ("course_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_courses_user_active" ON "courses" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_courses_user_created" ON "courses" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_user_progress_user_content_status" ON "user_progress" USING btree ("user_id","content_type","status");--> statement-breakpoint
CREATE INDEX "idx_user_progress_user_last_attempt" ON "user_progress" USING btree ("user_id","last_attempt_at" DESC NULLS LAST);