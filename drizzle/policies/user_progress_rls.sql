-- RLS Policies for user_progress table
-- Direct user ownership for progress tracking

-- Enable RLS
ALTER TABLE "user_progress" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their progress
CREATE POLICY "Users can manage their progress"
  ON "user_progress" FOR ALL 
  TO authenticated 
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Performance index for RLS filtering
CREATE INDEX IF NOT EXISTS "idx_user_progress_user_id_rls" ON "user_progress" USING btree ("user_id");