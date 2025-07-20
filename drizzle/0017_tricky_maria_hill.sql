ALTER TABLE "course_weeks" ADD COLUMN "has_materials" boolean DEFAULT false;--> statement-breakpoint
CREATE INDEX "idx_course_weeks_has_materials" ON "course_weeks" USING btree ("has_materials");