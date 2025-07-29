-- RLS Policies for cuecard_scheduling table
-- Spaced repetition scheduling for cuecards only
-- Direct user ownership pattern

-- Enable RLS
ALTER TABLE "cuecard_scheduling" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select their own cuecard scheduling data
CREATE POLICY "cuecard_scheduling_select_own"
  ON "cuecard_scheduling" FOR SELECT 
  TO authenticated 
  USING ((SELECT auth.uid()) = user_id);

-- Policy: Users can insert their own cuecard scheduling data
CREATE POLICY "cuecard_scheduling_insert_own"
  ON "cuecard_scheduling" FOR INSERT 
  TO authenticated 
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can update their own cuecard scheduling data
CREATE POLICY "cuecard_scheduling_update_own"
  ON "cuecard_scheduling" FOR UPDATE 
  TO authenticated 
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can delete their own cuecard scheduling data
CREATE POLICY "cuecard_scheduling_delete_own"
  ON "cuecard_scheduling" FOR DELETE 
  TO authenticated 
  USING ((SELECT auth.uid()) = user_id);

-- Performance index for RLS filtering (already exists in migration)
-- CREATE INDEX "idx_cuecard_scheduling_user_id" ON "cuecard_scheduling" USING btree ("user_id");