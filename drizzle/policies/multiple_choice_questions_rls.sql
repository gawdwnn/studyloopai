-- RLS Policies for multiple_choice_questions table
-- Course-Based Access: Users manage MCQs via course ownership

-- Enable RLS
ALTER TABLE "multiple_choice_questions" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select MCQs for their own courses
CREATE POLICY "mcqs_select_via_course"
  ON "multiple_choice_questions" FOR SELECT
  TO authenticated
  USING (
    course_id IN (
      SELECT id FROM courses WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Users can insert MCQs for their own courses
CREATE POLICY "mcqs_insert_via_course"
  ON "multiple_choice_questions" FOR INSERT
  TO authenticated
  WITH CHECK (
    course_id IN (
      SELECT id FROM courses WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Users can update MCQs for their own courses
CREATE POLICY "mcqs_update_via_course"
  ON "multiple_choice_questions" FOR UPDATE
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

-- Policy: Users can delete MCQs for their own courses
CREATE POLICY "mcqs_delete_via_course"
  ON "multiple_choice_questions" FOR DELETE
  TO authenticated
  USING (
    course_id IN (
      SELECT id FROM courses WHERE user_id = (SELECT auth.uid())
    )
  );
