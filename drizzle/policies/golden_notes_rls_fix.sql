-- Fix Golden Notes RLS Policy Inconsistency
-- Drop old material-based policies and ensure only course-based policies exist
-- This fixes the security vulnerability where dual policies could cause access conflicts

-- Drop the old material-based policies from 0004_icy_quasar.sql
DROP POLICY IF EXISTS "Users can view golden notes from their materials" ON "golden_notes";
DROP POLICY IF EXISTS "Users can manage golden notes from their materials" ON "golden_notes";

-- Ensure the correct course-based policies exist (idempotent)
-- These should already exist from ai-generated-content-rls.sql but we ensure they're present

-- Drop existing course-based policies first (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view golden notes from their courses" ON "golden_notes";
DROP POLICY IF EXISTS "Users can manage golden notes from their courses" ON "golden_notes";

-- Create the correct course-based policies
CREATE POLICY "Users can view golden notes from their courses"
  ON "golden_notes" FOR SELECT 
  TO authenticated 
  USING (
    course_id IN (
      SELECT id FROM courses 
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can manage golden notes from their courses"
  ON "golden_notes" FOR ALL 
  TO authenticated 
  USING (
    course_id IN (
      SELECT id FROM courses 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Verify RLS is enabled (should already be enabled)
ALTER TABLE "golden_notes" ENABLE ROW LEVEL SECURITY;

-- Add performance index for RLS filtering if not exists
CREATE INDEX IF NOT EXISTS "idx_golden_notes_course_id_rls" ON "golden_notes" USING btree ("course_id");
CREATE INDEX IF NOT EXISTS "idx_courses_user_id_rls" ON "courses" USING btree ("user_id");