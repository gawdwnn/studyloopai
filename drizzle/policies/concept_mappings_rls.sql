-- RLS Policies for concept_mappings table
-- Cross-content concept relationships for intelligent learning gap detection
-- Indirect ownership via course relationship

-- Enable RLS
ALTER TABLE "concept_mappings" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select concept mappings from their own courses
CREATE POLICY "concept_mappings_select_own"
  ON "concept_mappings" FOR SELECT 
  TO authenticated 
  USING (
    course_id IN (
      SELECT id FROM courses 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Users can insert concept mappings into their own courses
CREATE POLICY "concept_mappings_insert_own"
  ON "concept_mappings" FOR INSERT 
  TO authenticated 
  WITH CHECK (
    course_id IN (
      SELECT id FROM courses 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Users can update concept mappings in their own courses
CREATE POLICY "concept_mappings_update_own"
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

-- Policy: Users can delete concept mappings from their own courses
CREATE POLICY "concept_mappings_delete_own"
  ON "concept_mappings" FOR DELETE 
  TO authenticated 
  USING (
    course_id IN (
      SELECT id FROM courses 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Performance index for RLS filtering (already exists in migration)
-- CREATE INDEX "idx_concept_mappings_course_id" ON "concept_mappings" USING btree ("course_id");