-- RLS Policies for course_weeks table
-- Course week access based on course ownership

-- Enable RLS
ALTER TABLE "course_weeks" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select course weeks from their own courses
CREATE POLICY "course_weeks_select_own_courses"
  ON "course_weeks" FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_weeks.course_id 
      AND courses.user_id = auth.uid()
    )
  );

-- Policy: Users can insert course weeks for their own courses
CREATE POLICY "course_weeks_insert_own_courses"
  ON "course_weeks" FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_weeks.course_id 
      AND courses.user_id = auth.uid()
    )
  );

-- Policy: Users can update course weeks from their own courses
CREATE POLICY "course_weeks_update_own_courses"
  ON "course_weeks" FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_weeks.course_id 
      AND courses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_weeks.course_id 
      AND courses.user_id = auth.uid()
    )
  );

-- Policy: Users can delete course weeks from their own courses
CREATE POLICY "course_weeks_delete_own_courses"
  ON "course_weeks" FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_weeks.course_id 
      AND courses.user_id = auth.uid()
    )
  );

-- Performance indexes for RLS filtering
CREATE INDEX IF NOT EXISTS "idx_course_weeks_course_id_rls" ON "course_weeks" USING btree ("course_id");
CREATE INDEX IF NOT EXISTS "idx_courses_user_id_rls" ON "courses" USING btree ("user_id");