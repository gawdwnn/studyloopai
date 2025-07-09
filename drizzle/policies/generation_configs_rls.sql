-- RLS Policies for generation_configs table
-- Scope-based access control for different configuration sources

-- Enable RLS
ALTER TABLE "generation_configs" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select configurations they have access to
-- This covers user_preference, course ownership, week access, and institution membership
CREATE POLICY "generation_configs_select_accessible"
  ON "generation_configs" FOR SELECT 
  TO authenticated 
  USING (
    -- User preference configs: user owns them
    (config_source = 'user_preference' AND user_id = auth.uid()) OR
    
    -- Course default configs: user owns the course
    (config_source = 'course_default' AND course_id IN (
      SELECT id FROM courses WHERE user_id = auth.uid()
    )) OR
    
    -- Course week override configs: user owns the course
    (config_source = 'course_week_override' AND course_id IN (
      SELECT id FROM courses WHERE user_id = auth.uid()
    )) OR
    
    -- Adaptive algorithm configs: user owns them
    (config_source = 'adaptive_algorithm' AND user_id = auth.uid()) OR
    
    -- System default configs: accessible to all authenticated users
    (config_source = 'system_default') OR
    
    -- Institution default configs: user belongs to the institution
    (config_source = 'institution_default' AND institution_id IN (
      SELECT institution_id FROM users WHERE user_id = auth.uid() AND institution_id IS NOT NULL
    ))
  );

-- Policy: Users can insert configurations for their own scope
CREATE POLICY "generation_configs_insert_own_scope"
  ON "generation_configs" FOR INSERT 
  TO authenticated 
  WITH CHECK (
    -- User preference configs: user must own them
    (config_source = 'user_preference' AND user_id = auth.uid()) OR
    
    -- Course default configs: user must own the course and be the creator
    (config_source = 'course_default' AND course_id IN (
      SELECT id FROM courses WHERE user_id = auth.uid()
    ) AND created_by = auth.uid()) OR
    
    -- Course week override configs: user must own the course and be the creator
    (config_source = 'course_week_override' AND course_id IN (
      SELECT id FROM courses WHERE user_id = auth.uid()
    ) AND created_by = auth.uid()) OR
    
    -- Adaptive algorithm configs: user must own them
    (config_source = 'adaptive_algorithm' AND user_id = auth.uid()) OR
    
    -- System default configs: only system can create (restricted)
    (config_source = 'system_default' AND FALSE) OR
    
    -- Institution default configs: user must be admin of the institution
    (config_source = 'institution_default' AND institution_id IN (
      SELECT institution_id FROM users 
      WHERE user_id = auth.uid() 
      AND institution_id IS NOT NULL 
      AND role = 'admin'
    ) AND created_by = auth.uid())
  );

-- Policy: Users can update configurations they have access to
CREATE POLICY "generation_configs_update_own_scope"
  ON "generation_configs" FOR UPDATE 
  TO authenticated 
  USING (
    -- User preference configs: user owns them
    (config_source = 'user_preference' AND user_id = auth.uid()) OR
    
    -- Course default configs: user owns the course
    (config_source = 'course_default' AND course_id IN (
      SELECT id FROM courses WHERE user_id = auth.uid()
    )) OR
    
    -- Course week override configs: user owns the course
    (config_source = 'course_week_override' AND course_id IN (
      SELECT id FROM courses WHERE user_id = auth.uid()
    )) OR
    
    -- Adaptive algorithm configs: user owns them
    (config_source = 'adaptive_algorithm' AND user_id = auth.uid()) OR
    
    -- System default configs: restricted
    (config_source = 'system_default' AND FALSE) OR
    
    -- Institution default configs: user is admin of the institution
    (config_source = 'institution_default' AND institution_id IN (
      SELECT institution_id FROM users 
      WHERE user_id = auth.uid() 
      AND institution_id IS NOT NULL 
      AND role = 'admin'
    ))
  )
  WITH CHECK (
    -- Same conditions as USING clause
    (config_source = 'user_preference' AND user_id = auth.uid()) OR
    (config_source = 'course_default' AND course_id IN (
      SELECT id FROM courses WHERE user_id = auth.uid()
    )) OR
    (config_source = 'course_week_override' AND course_id IN (
      SELECT id FROM courses WHERE user_id = auth.uid()
    )) OR
    (config_source = 'adaptive_algorithm' AND user_id = auth.uid()) OR
    (config_source = 'system_default' AND FALSE) OR
    (config_source = 'institution_default' AND institution_id IN (
      SELECT institution_id FROM users 
      WHERE user_id = auth.uid() 
      AND institution_id IS NOT NULL 
      AND role = 'admin'
    ))
  );

-- Policy: Users can delete configurations they have access to
CREATE POLICY "generation_configs_delete_own_scope"
  ON "generation_configs" FOR DELETE 
  TO authenticated 
  USING (
    -- User preference configs: user owns them
    (config_source = 'user_preference' AND user_id = auth.uid()) OR
    
    -- Course default configs: user owns the course
    (config_source = 'course_default' AND course_id IN (
      SELECT id FROM courses WHERE user_id = auth.uid()
    )) OR
    
    -- Course week override configs: user owns the course
    (config_source = 'course_week_override' AND course_id IN (
      SELECT id FROM courses WHERE user_id = auth.uid()
    )) OR
    
    -- Adaptive algorithm configs: user owns them
    (config_source = 'adaptive_algorithm' AND user_id = auth.uid()) OR
    
    -- System default configs: restricted
    (config_source = 'system_default' AND FALSE) OR
    
    -- Institution default configs: user is admin of the institution
    (config_source = 'institution_default' AND institution_id IN (
      SELECT institution_id FROM users 
      WHERE user_id = auth.uid() 
      AND institution_id IS NOT NULL 
      AND role = 'admin'
    ))
  );

-- Performance indexes for RLS filtering
CREATE INDEX IF NOT EXISTS "idx_generation_configs_user_id_rls" ON "generation_configs" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_generation_configs_course_id_rls" ON "generation_configs" USING btree ("course_id");
CREATE INDEX IF NOT EXISTS "idx_generation_configs_week_id_rls" ON "generation_configs" USING btree ("week_id");
CREATE INDEX IF NOT EXISTS "idx_generation_configs_institution_id_rls" ON "generation_configs" USING btree ("institution_id");
CREATE INDEX IF NOT EXISTS "idx_generation_configs_config_source_rls" ON "generation_configs" USING btree ("config_source");
CREATE INDEX IF NOT EXISTS "idx_generation_configs_created_by_rls" ON "generation_configs" USING btree ("created_by");

-- Composite indexes for efficient scope-based queries
CREATE INDEX IF NOT EXISTS "idx_generation_configs_user_source_rls" ON "generation_configs" USING btree ("user_id", "config_source");
CREATE INDEX IF NOT EXISTS "idx_generation_configs_course_source_rls" ON "generation_configs" USING btree ("course_id", "config_source");
CREATE INDEX IF NOT EXISTS "idx_generation_configs_week_source_rls" ON "generation_configs" USING btree ("week_id", "config_source");
CREATE INDEX IF NOT EXISTS "idx_generation_configs_institution_source_rls" ON "generation_configs" USING btree ("institution_id", "config_source");

-- Indexes for related tables (if they don't already exist)
CREATE INDEX IF NOT EXISTS "idx_courses_user_id_rls" ON "courses" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_users_institution_id_rls" ON "users" USING btree ("institution_id");
CREATE INDEX IF NOT EXISTS "idx_users_role_rls" ON "users" USING btree ("role");