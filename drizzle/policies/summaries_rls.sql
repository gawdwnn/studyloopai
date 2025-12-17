-- RLS Policies for summaries table
-- Course-Based Access: Users manage summaries via course ownership

-- Enable RLS
ALTER TABLE "summaries" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select summaries for their own courses
CREATE POLICY "summaries_select_via_course"
  ON "summaries" FOR SELECT
  TO authenticated
  USING (
    course_id IN (
      SELECT id FROM courses WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Users can insert summaries for their own courses
CREATE POLICY "summaries_insert_via_course"
  ON "summaries" FOR INSERT
  TO authenticated
  WITH CHECK (
    course_id IN (
      SELECT id FROM courses WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Users can update summaries for their own courses
CREATE POLICY "summaries_update_via_course"
  ON "summaries" FOR UPDATE
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

-- Policy: Users can delete summaries for their own courses
CREATE POLICY "summaries_delete_via_course"
  ON "summaries" FOR DELETE
  TO authenticated
  USING (
    course_id IN (
      SELECT id FROM courses WHERE user_id = (SELECT auth.uid())
    )
  );
