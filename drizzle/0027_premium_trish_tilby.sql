CREATE TABLE "user_usage" (
	"user_usage_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"cycle_start" timestamp DEFAULT now() NOT NULL,
	"ai_generations_count" integer DEFAULT 0 NOT NULL,
	"ai_tokens_consumed" integer DEFAULT 0 NOT NULL,
	"materials_uploaded_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_usage_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "user_usage" ADD CONSTRAINT "user_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_usage_user_id" ON "user_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_usage_cycle_start" ON "user_usage" USING btree ("cycle_start");