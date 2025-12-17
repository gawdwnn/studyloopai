-- RLS Policies for golden_notes table
-- Course-Based Access: Users manage golden notes via course ownership

-- Enable RLS
ALTER TABLE "golden_notes" ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can view golden notes from their materials" ON "golden_notes";
DROP POLICY IF EXISTS "Users can manage golden notes from their materials" ON "golden_notes";
DROP POLICY IF EXISTS "Users can view golden notes from their courses" ON "golden_notes";
DROP POLICY IF EXISTS "Users can manage golden notes from their courses" ON "golden_notes";
DROP POLICY IF EXISTS "golden_notes_select_via_course" ON "golden_notes";
DROP POLICY IF EXISTS "golden_notes_insert_via_course" ON "golden_notes";
DROP POLICY IF EXISTS "golden_notes_update_via_course" ON "golden_notes";
DROP POLICY IF EXISTS "golden_notes_delete_via_course" ON "golden_notes";

-- Policy: Users can select golden notes for their own courses
CREATE POLICY "golden_notes_select_via_course"
  ON "golden_notes" FOR SELECT
  TO authenticated
  USING (
    course_id IN (
      SELECT id FROM courses WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Users can insert golden notes for their own courses
CREATE POLICY "golden_notes_insert_via_course"
  ON "golden_notes" FOR INSERT
  TO authenticated
  WITH CHECK (
    course_id IN (
      SELECT id FROM courses WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Users can update golden notes for their own courses
CREATE POLICY "golden_notes_update_via_course"
  ON "golden_notes" FOR UPDATE
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

-- Policy: Users can delete golden notes for their own courses
CREATE POLICY "golden_notes_delete_via_course"
  ON "golden_notes" FOR DELETE
  TO authenticated
  USING (
    course_id IN (
      SELECT id FROM courses WHERE user_id = (SELECT auth.uid())
    )
  );