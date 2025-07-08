-- Updated AI-Generated Content RLS Policies
-- Apply these policies to secure AI content tables with new course_id/week_id structure
-- Tables: multiple_choice_questions, open_questions, summaries, golden_notes, cuecards

-- Enable RLS (if not already enabled)
ALTER TABLE "multiple_choice_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "open_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "summaries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "golden_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cuecards" ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (cleanup from old material_id structure)
DROP POLICY IF EXISTS "Users can view MCQs from their materials" ON "multiple_choice_questions";
DROP POLICY IF EXISTS "Users can manage MCQs from their materials" ON "multiple_choice_questions";
DROP POLICY IF EXISTS "Users can view open questions from their materials" ON "open_questions";
DROP POLICY IF EXISTS "Users can manage open questions from their materials" ON "open_questions";
DROP POLICY IF EXISTS "Users can view summaries from their materials" ON "summaries";
DROP POLICY IF EXISTS "Users can manage summaries from their materials" ON "summaries";
DROP POLICY IF EXISTS "Users can view golden notes from their materials" ON "golden_notes";
DROP POLICY IF EXISTS "Users can manage golden notes from their materials" ON "golden_notes";
DROP POLICY IF EXISTS "Users can view cuecards from their materials" ON "cuecards";
DROP POLICY IF EXISTS "Users can manage cuecards from their materials" ON "cuecards";

-- MCQ Policies - restrict to user's courses
CREATE POLICY "Users can view MCQs from their courses"
  ON "multiple_choice_questions" FOR SELECT 
  TO authenticated 
  USING (
    course_id IN (
      SELECT id FROM courses 
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can manage MCQs from their courses"
  ON "multiple_choice_questions" FOR ALL 
  TO authenticated 
  USING (
    course_id IN (
      SELECT id FROM courses 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Open Questions Policies - restrict to user's courses  
CREATE POLICY "Users can view open questions from their courses"
  ON "open_questions" FOR SELECT 
  TO authenticated 
  USING (
    course_id IN (
      SELECT id FROM courses 
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can manage open questions from their courses"
  ON "open_questions" FOR ALL 
  TO authenticated 
  USING (
    course_id IN (
      SELECT id FROM courses 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Summaries Policies - restrict to user's courses
CREATE POLICY "Users can view summaries from their courses"
  ON "summaries" FOR SELECT 
  TO authenticated 
  USING (
    course_id IN (
      SELECT id FROM courses 
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can manage summaries from their courses"
  ON "summaries" FOR ALL 
  TO authenticated 
  USING (
    course_id IN (
      SELECT id FROM courses 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Golden Notes Policies - restrict to user's courses
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

-- Cuecards Policies - restrict to user's courses
CREATE POLICY "Users can view cuecards from their courses"
  ON "cuecards" FOR SELECT 
  TO authenticated 
  USING (
    course_id IN (
      SELECT id FROM courses 
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can manage cuecards from their courses"
  ON "cuecards" FOR ALL 
  TO authenticated 
  USING (
    course_id IN (
      SELECT id FROM courses 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Performance indexes for RLS filtering (course_id already indexed by migration)
CREATE INDEX IF NOT EXISTS "idx_courses_user_id" ON "courses" USING btree ("user_id");