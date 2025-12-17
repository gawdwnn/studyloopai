-- RLS Policies for user_plans table
-- Direct user ownership for subscription plan management

-- Enable RLS
ALTER TABLE "user_plans" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select their own plan
CREATE POLICY "user_plans_select_own"
  ON "user_plans" FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Policy: Users can insert their own plan
CREATE POLICY "user_plans_insert_own"
  ON "user_plans" FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can update their own plan
CREATE POLICY "user_plans_update_own"
  ON "user_plans" FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can delete their own plan
CREATE POLICY "user_plans_delete_own"
  ON "user_plans" FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);