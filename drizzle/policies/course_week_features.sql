-- RLS Policies for course_week_features table
-- Enable RLS
ALTER TABLE course_week_features ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own course week features
CREATE POLICY "Users manage own course week features" ON course_week_features FOR ALL TO authenticated 
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