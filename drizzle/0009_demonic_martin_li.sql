DROP INDEX "idx_own_notes_material_id";--> statement-breakpoint
ALTER TABLE "own_notes" ALTER COLUMN "course_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "golden_notes" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "own_notes" ADD COLUMN "week_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "own_notes" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "own_notes" ADD CONSTRAINT "own_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "own_notes" ADD CONSTRAINT "own_notes_week_id_fkey" FOREIGN KEY ("week_id") REFERENCES "public"."course_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "own_notes" ADD CONSTRAINT "own_notes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_own_notes_week_id" ON "own_notes" USING btree ("week_id");--> statement-breakpoint
CREATE INDEX "idx_own_notes_course_week" ON "own_notes" USING btree ("course_id","week_id");--> statement-breakpoint
CREATE INDEX "idx_own_notes_user_course" ON "own_notes" USING btree ("user_id","course_id");--> statement-breakpoint
ALTER TABLE "own_notes" DROP COLUMN "material_id";--> statement-breakpoint
ALTER TABLE "own_notes" DROP COLUMN "position";