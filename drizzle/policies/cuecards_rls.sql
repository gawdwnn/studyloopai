-- RLS Policies for cuecards table
-- Course-Based Access: Users manage cuecards via course ownership

-- Enable RLS
ALTER TABLE "cuecards" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select cuecards for their own courses
CREATE POLICY "cuecards_select_via_course"
  ON "cuecards" FOR SELECT
  TO authenticated
  USING (
    course_id IN (
      SELECT id FROM courses WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Users can insert cuecards for their own courses
CREATE POLICY "cuecards_insert_via_course"
  ON "cuecards" FOR INSERT
  TO authenticated
  WITH CHECK (
    course_id IN (
      SELECT id FROM courses WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Users can update cuecards for their own courses
CREATE POLICY "cuecards_update_via_course"
  ON "cuecards" FOR UPDATE
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

-- Policy: Users can delete cuecards for their own courses
CREATE POLICY "cuecards_delete_via_course"
  ON "cuecards" FOR DELETE
  TO authenticated
  USING (
    course_id IN (
      SELECT id FROM courses WHERE user_id = (SELECT auth.uid())
    )
  );
