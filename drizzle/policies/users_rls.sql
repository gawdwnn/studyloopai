-- RLS Policies for users table
-- Direct user ownership for user profile management

-- Enable RLS
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select their own profile
CREATE POLICY "users_select_own"
  ON "users" FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own profile
-- This allows users to create their profile record during signup
CREATE POLICY "users_insert_own"
  ON "users" FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "users_update_own"
  ON "users" FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Note: DELETE policy intentionally omitted for users table
-- User deletion should be handled through Supabase Auth, not direct database deletion

-- Performance index for RLS filtering
CREATE INDEX IF NOT EXISTS "idx_users_user_id_rls" ON "users" USING btree ("user_id");