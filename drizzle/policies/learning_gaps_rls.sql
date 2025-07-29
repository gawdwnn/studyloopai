-- RLS Policies for learning_gaps table  
-- Universal learning gap detection across all content types
-- Direct user ownership pattern

-- Enable RLS
ALTER TABLE "learning_gaps" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select their own learning gaps
CREATE POLICY "learning_gaps_select_own"
  ON "learning_gaps" FOR SELECT 
  TO authenticated 
  USING ((SELECT auth.uid()) = user_id);

-- Policy: Users can insert their own learning gaps
CREATE POLICY "learning_gaps_insert_own"
  ON "learning_gaps" FOR INSERT 
  TO authenticated 
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can update their own learning gaps
CREATE POLICY "learning_gaps_update_own"
  ON "learning_gaps" FOR UPDATE 
  TO authenticated 
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can delete their own learning gaps
CREATE POLICY "learning_gaps_delete_own"
  ON "learning_gaps" FOR DELETE 
  TO authenticated 
  USING ((SELECT auth.uid()) = user_id);

-- Performance index for RLS filtering (already exists in migration)
-- CREATE INDEX "idx_learning_gaps_user_id" ON "learning_gaps" USING btree ("user_id");