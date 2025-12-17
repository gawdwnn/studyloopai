-- RLS Policies for concept_mappings table
-- Course-Based Access: Users manage concept mappings via course ownership
-- Cross-content concept relationships for intelligent learning gap detection

-- Enable RLS
ALTER TABLE "concept_mappings" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select concept mappings for their own courses
CREATE POLICY "concept_mappings_select_via_course"
  ON "concept_mappings" FOR SELECT
  TO authenticated
  USING (
    course_id IN (
      SELECT id FROM courses
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Users can insert concept mappings for their own courses
CREATE POLICY "concept_mappings_insert_via_course"
  ON "concept_mappings" FOR INSERT
  TO authenticated
  WITH CHECK (
    course_id IN (
      SELECT id FROM courses
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Users can update concept mappings for their own courses
CREATE POLICY "concept_mappings_update_via_course"
  ON "concept_mappings" FOR UPDATE
  TO authenticated
  USING (
    course_id IN (
      SELECT id FROM courses
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    course_id IN (
      SELECT id FROM courses
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Users can delete concept mappings for their own courses
CREATE POLICY "concept_mappings_delete_via_course"
  ON "concept_mappings" FOR DELETE
  TO authenticated
  USING (
    course_id IN (
      SELECT id FROM courses
      WHERE user_id = (SELECT auth.uid())
    )
  );
