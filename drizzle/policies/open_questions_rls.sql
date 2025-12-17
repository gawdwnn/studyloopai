-- RLS Policies for open_questions table
-- Course-Based Access: Users manage open questions via course ownership

-- Enable RLS
ALTER TABLE "open_questions" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select open questions for their own courses
CREATE POLICY "open_questions_select_via_course"
  ON "open_questions" FOR SELECT
  TO authenticated
  USING (
    course_id IN (
      SELECT id FROM courses WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Users can insert open questions for their own courses
CREATE POLICY "open_questions_insert_via_course"
  ON "open_questions" FOR INSERT
  TO authenticated
  WITH CHECK (
    course_id IN (
      SELECT id FROM courses WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Users can update open questions for their own courses
CREATE POLICY "open_questions_update_via_course"
  ON "open_questions" FOR UPDATE
  TO authenticated
  USING (
    course_id IN (
      SELECT id FROM courses WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    course_id IN (
      SELECT id FROM courses WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Users can delete open questions for their own courses
CREATE POLICY "open_questions_delete_via_course"
  ON "open_questions" FOR DELETE
  TO authenticated
  USING (
    course_id IN (
      SELECT id FROM courses WHERE user_id = (SELECT auth.uid())
    )
  );
