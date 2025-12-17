-- RLS Policies for user_usage table
-- Direct Ownership: Users manage their own usage records
-- Used for tracking quota consumption per billing cycle

-- Enable RLS
ALTER TABLE "user_usage" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own usage records
CREATE POLICY "user_usage_select_own"
  ON "user_usage" FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Policy: Users can insert their own usage records
CREATE POLICY "user_usage_insert_own"
  ON "user_usage" FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can update their own usage records
CREATE POLICY "user_usage_update_own"
  ON "user_usage" FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can delete their own usage records
CREATE POLICY "user_usage_delete_own"
  ON "user_usage" FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
