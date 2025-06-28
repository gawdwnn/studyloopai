ALTER TABLE "course_materials" DROP CONSTRAINT "course_materials_course_id_courses_id_fk";
--> statement-breakpoint
ALTER TABLE "course_materials" DROP CONSTRAINT "course_materials_uploaded_by_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "course_materials" DROP CONSTRAINT "course_materials_week_id_course_weeks_id_fk";
--> statement-breakpoint
ALTER TABLE "course_weeks" DROP CONSTRAINT "course_weeks_course_id_courses_id_fk";
--> statement-breakpoint
ALTER TABLE "courses" DROP CONSTRAINT "courses_user_id_users_user_id_fk";
--> statement-breakpoint
ALTER TABLE "document_chunks" DROP CONSTRAINT "document_chunks_material_id_course_materials_id_fk";
--> statement-breakpoint
ALTER TABLE "user_plans" DROP CONSTRAINT "user_plans_user_id_users_user_id_fk";
