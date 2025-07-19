CREATE TABLE "user_prompt_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"feature_type" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"config" jsonb NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_user_template_name" UNIQUE("user_id","name","feature_type")
);
--> statement-breakpoint
ALTER TABLE "course_materials" ADD COLUMN "generation_metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "user_prompt_templates" ADD CONSTRAINT "user_prompt_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_prompt_templates_user_id" ON "user_prompt_templates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_prompt_templates_feature_type" ON "user_prompt_templates" USING btree ("feature_type");--> statement-breakpoint
CREATE INDEX "idx_user_prompt_templates_is_default" ON "user_prompt_templates" USING btree ("is_default");