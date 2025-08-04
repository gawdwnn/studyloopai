ALTER TABLE "users" ADD COLUMN "current_onboarding_step" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_data" jsonb;