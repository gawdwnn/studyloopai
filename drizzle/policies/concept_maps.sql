-- RLS policies for concept_maps table
-- Following the established pattern: User owns course → access course content

-- Enable RLS
ALTER TABLE concept_maps ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage concept maps from their own courses
CREATE POLICY "Users manage concept maps from own courses" ON concept_maps FOR ALL TO authenticated 
USING (course_id IN (SELECT id FROM courses WHERE user_id = (SELECT auth.uid()))) 
WITH CHECK (course_id IN (SELECT id FROM courses WHERE user_id = (SELECT auth.uid())));

-- Performance index for RLS filtering
CREATE INDEX IF NOT EXISTS idx_concept_maps_user_id_via_course ON concept_maps (course_id);