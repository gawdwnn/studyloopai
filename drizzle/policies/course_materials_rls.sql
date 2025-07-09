-- RLS Policies for course_materials table
-- Course material access based on course ownership and uploader verification

-- Enable RLS
ALTER TABLE "course_materials" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select course materials from their own courses
CREATE POLICY "course_materials_select_own_courses"
  ON "course_materials" FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_materials.course_id 
      AND courses.user_id = auth.uid()
    )
  );

-- Policy: Users can insert course materials for their own courses
-- Also ensures the uploader is the authenticated user
CREATE POLICY "course_materials_insert_own_courses"
  ON "course_materials" FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_materials.course_id 
      AND courses.user_id = auth.uid()
    )
    AND auth.uid() = uploaded_by
  );

-- Policy: Users can update course materials from their own courses
CREATE POLICY "course_materials_update_own_courses"
  ON "course_materials" FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_materials.course_id 
      AND courses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_materials.course_id 
      AND courses.user_id = auth.uid()
    )
  );

-- Policy: Users can delete course materials from their own courses
CREATE POLICY "course_materials_delete_own_courses"
  ON "course_materials" FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_materials.course_id 
      AND courses.user_id = auth.uid()
    )
  );

-- Performance indexes for RLS filtering
CREATE INDEX IF NOT EXISTS "idx_course_materials_course_id_rls" ON "course_materials" USING btree ("course_id");
CREATE INDEX IF NOT EXISTS "idx_course_materials_uploaded_by_rls" ON "course_materials" USING btree ("uploaded_by");
CREATE INDEX IF NOT EXISTS "idx_courses_user_id_rls" ON "courses" USING btree ("user_id");