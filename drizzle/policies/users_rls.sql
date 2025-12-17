-- RLS Policies for users table
-- Direct user ownership for user profile management

-- Enable RLS
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select their own profile
CREATE POLICY "users_select_own"
  ON "users" FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Policy: Users can insert their own profile
-- This allows users to create their profile record during signup
CREATE POLICY "users_insert_own"
  ON "users" FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "users_update_own"
  ON "users" FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Note: DELETE policy intentionally omitted for users table
-- User deletion should be handled through Supabase Auth, not direct database deletion