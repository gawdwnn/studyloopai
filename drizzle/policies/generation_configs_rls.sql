-- Enable RLS
ALTER TABLE "generation_configs" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "generation_configs_select_accessible" ON "generation_configs";
DROP POLICY IF EXISTS "generation_configs_insert_own_scope" ON "generation_configs";
DROP POLICY IF EXISTS "generation_configs_update_own_scope" ON "generation_configs";
DROP POLICY IF EXISTS "generation_configs_delete_own_scope" ON "generation_configs";

-- Create a function to check if user owns a course (for performance)
CREATE OR REPLACE FUNCTION user_owns_course(course_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM courses 
    WHERE id = course_uuid AND user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create a function to check if user owns a week through course ownership
CREATE OR REPLACE FUNCTION user_owns_week(week_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM course_weeks cw
    JOIN courses c ON c.id = cw.course_id
    WHERE cw.id = week_uuid AND c.user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create a function to check if user is in an institution
CREATE OR REPLACE FUNCTION user_in_institution(institution_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE user_id = auth.uid() AND institution_id = institution_uuid
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create a function to check if user is institution admin
CREATE OR REPLACE FUNCTION user_is_institution_admin(institution_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE user_id = auth.uid() 
    AND institution_id = institution_uuid 
    AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Simplified SELECT policy - Users can view configs they have access to
CREATE POLICY "configs_select"
  ON "generation_configs" FOR SELECT 
  TO authenticated 
  USING (
    CASE config_source
      WHEN 'user_preference' THEN user_id = auth.uid()
      WHEN 'course_default' THEN user_owns_course(course_id)
      WHEN 'course_week_override' THEN user_owns_week(week_id)
      WHEN 'adaptive_algorithm' THEN user_id = auth.uid()
      WHEN 'system_default' THEN true  -- Everyone can see system defaults
      WHEN 'institution_default' THEN user_in_institution(institution_id)
      ELSE false
    END
  );

-- Simplified INSERT policy - Users can create configs in their scope
CREATE POLICY "configs_insert"
  ON "generation_configs" FOR INSERT 
  TO authenticated 
  WITH CHECK (
    -- Ensure created_by is set to current user
    created_by = auth.uid() AND
    -- Check permissions based on config source
    CASE config_source
      WHEN 'user_preference' THEN user_id = auth.uid()
      WHEN 'course_default' THEN user_owns_course(course_id)
      WHEN 'course_week_override' THEN 
        user_owns_course(course_id) AND user_owns_week(week_id)
      WHEN 'adaptive_algorithm' THEN user_id = auth.uid()
      WHEN 'system_default' THEN false  -- Only service role can create
      WHEN 'institution_default' THEN user_is_institution_admin(institution_id)
      ELSE false
    END
  );

-- Simplified UPDATE policy - Users can update configs they own
CREATE POLICY "configs_update"
  ON "generation_configs" FOR UPDATE 
  TO authenticated 
  USING (
    CASE config_source
      WHEN 'user_preference' THEN user_id = auth.uid()
      WHEN 'course_default' THEN user_owns_course(course_id)
      WHEN 'course_week_override' THEN user_owns_week(week_id)
      WHEN 'adaptive_algorithm' THEN user_id = auth.uid()
      WHEN 'system_default' THEN false  -- Only service role can update
      WHEN 'institution_default' THEN user_is_institution_admin(institution_id)
      ELSE false
    END
  )
  WITH CHECK (
    -- Same permission check as USING clause
    CASE config_source
      WHEN 'user_preference' THEN user_id = auth.uid()
      WHEN 'course_default' THEN user_owns_course(course_id)
      WHEN 'course_week_override' THEN user_owns_week(week_id)
      WHEN 'adaptive_algorithm' THEN user_id = auth.uid()
      WHEN 'system_default' THEN false
      WHEN 'institution_default' THEN user_is_institution_admin(institution_id)
      ELSE false
    END
  );

-- Simplified DELETE policy - Users can delete configs they own
CREATE POLICY "configs_delete"
  ON "generation_configs" FOR DELETE 
  TO authenticated 
  USING (
    CASE config_source
      WHEN 'user_preference' THEN user_id = auth.uid()
      WHEN 'course_default' THEN user_owns_course(course_id)
      WHEN 'course_week_override' THEN user_owns_week(week_id)
      WHEN 'adaptive_algorithm' THEN user_id = auth.uid()
      WHEN 'system_default' THEN false  -- Only service role can delete
      WHEN 'institution_default' THEN user_is_institution_admin(institution_id)
      ELSE false
    END
  );

-- Create indexes for performance (if not already exist)
CREATE INDEX IF NOT EXISTS "idx_generation_configs_user_id" ON "generation_configs" (user_id);
CREATE INDEX IF NOT EXISTS "idx_generation_configs_course_id" ON "generation_configs" (course_id);
CREATE INDEX IF NOT EXISTS "idx_generation_configs_week_id" ON "generation_configs" (week_id);
CREATE INDEX IF NOT EXISTS "idx_generation_configs_institution_id" ON "generation_configs" (institution_id);
CREATE INDEX IF NOT EXISTS "idx_generation_configs_config_source" ON "generation_configs" (config_source);
CREATE INDEX IF NOT EXISTS "idx_generation_configs_created_by" ON "generation_configs" (created_by);

-- Add CHECK constraint to ensure proper field population based on config_source
ALTER TABLE generation_configs ADD CONSTRAINT check_config_scope_fields CHECK (
  CASE config_source
    WHEN 'user_preference' THEN 
      user_id IS NOT NULL AND course_id IS NULL AND week_id IS NULL AND institution_id IS NULL
    WHEN 'course_default' THEN 
      course_id IS NOT NULL AND user_id IS NULL AND week_id IS NULL AND institution_id IS NULL
    WHEN 'course_week_override' THEN 
      course_id IS NOT NULL AND week_id IS NOT NULL AND user_id IS NULL AND institution_id IS NULL
    WHEN 'adaptive_algorithm' THEN 
      user_id IS NOT NULL  -- Can have other fields populated
    WHEN 'system_default' THEN 
      user_id IS NULL AND course_id IS NULL AND week_id IS NULL AND institution_id IS NULL
    WHEN 'institution_default' THEN 
      institution_id IS NOT NULL AND user_id IS NULL AND course_id IS NULL AND week_id IS NULL
    ELSE false
  END
);