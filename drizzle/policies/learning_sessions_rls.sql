-- RLS Policies for learning_sessions table
-- Universal session tracking across all content types (cuecards, MCQs, open questions)
-- Direct user ownership pattern

-- Enable RLS
ALTER TABLE "learning_sessions" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select their own learning sessions
CREATE POLICY "learning_sessions_select_own"
  ON "learning_sessions" FOR SELECT 
  TO authenticated 
  USING ((SELECT auth.uid()) = user_id);

-- Policy: Users can insert their own learning sessions
CREATE POLICY "learning_sessions_insert_own"
  ON "learning_sessions" FOR INSERT 
  TO authenticated 
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can update their own learning sessions
CREATE POLICY "learning_sessions_update_own"
  ON "learning_sessions" FOR UPDATE 
  TO authenticated 
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can delete their own learning sessions
CREATE POLICY "learning_sessions_delete_own"
  ON "learning_sessions" FOR DELETE 
  TO authenticated 
  USING ((SELECT auth.uid()) = user_id);
