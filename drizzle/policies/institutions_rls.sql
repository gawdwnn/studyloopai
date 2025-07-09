-- RLS Policies for institutions table
-- Institution access control for multi-tenancy support

-- Enable RLS
ALTER TABLE "institutions" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select institutions they belong to
CREATE POLICY "institutions_select_member"
  ON "institutions" FOR SELECT 
  TO authenticated 
  USING (
    -- Users can see their own institution
    id IN (
      SELECT institution_id FROM users 
      WHERE user_id = auth.uid() 
      AND institution_id IS NOT NULL
    )
  );

-- Policy: Only institution admins can insert new institutions
CREATE POLICY "institutions_insert_admin"
  ON "institutions" FOR INSERT 
  TO authenticated 
  WITH CHECK (
    -- Only allow if user is already an admin of an institution
    -- (This would typically be handled by a super admin system)
    EXISTS (
      SELECT 1 FROM users 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND institution_id IS NOT NULL
    )
  );

-- Policy: Only institution admins can update their institution
CREATE POLICY "institutions_update_admin"
  ON "institutions" FOR UPDATE 
  TO authenticated 
  USING (
    -- User must be an admin of this institution
    id IN (
      SELECT institution_id FROM users 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND institution_id IS NOT NULL
    )
  )
  WITH CHECK (
    -- Same condition for update
    id IN (
      SELECT institution_id FROM users 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND institution_id IS NOT NULL
    )
  );

-- Policy: Only institution admins can delete their institution
CREATE POLICY "institutions_delete_admin"
  ON "institutions" FOR DELETE 
  TO authenticated 
  USING (
    -- User must be an admin of this institution
    id IN (
      SELECT institution_id FROM users 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND institution_id IS NOT NULL
    )
  );

-- Performance indexes for RLS filtering
CREATE INDEX IF NOT EXISTS "idx_institutions_id_rls" ON "institutions" USING btree ("id");
CREATE INDEX IF NOT EXISTS "idx_institutions_active_rls" ON "institutions" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "idx_institutions_slug_rls" ON "institutions" USING btree ("slug");

-- Indexes for related tables (if they don't already exist)
CREATE INDEX IF NOT EXISTS "idx_users_institution_id_rls" ON "users" USING btree ("institution_id");
CREATE INDEX IF NOT EXISTS "idx_users_role_rls" ON "users" USING btree ("role");