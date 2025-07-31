-- RLS Policies for session_responses table
-- Detailed per-item responses within learning sessions
-- Indirect ownership via learning_sessions table

-- Enable RLS
ALTER TABLE "session_responses" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select responses from their own learning sessions
CREATE POLICY "session_responses_select_own"
  ON "session_responses" FOR SELECT 
  TO authenticated 
  USING (
    session_id IN (
      SELECT id FROM learning_sessions 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Users can insert responses into their own learning sessions
CREATE POLICY "session_responses_insert_own"
  ON "session_responses" FOR INSERT 
  TO authenticated 
  WITH CHECK (
    session_id IN (
      SELECT id FROM learning_sessions 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Users can update responses in their own learning sessions
CREATE POLICY "session_responses_update_own"
  ON "session_responses" FOR UPDATE 
  TO authenticated 
  USING (
    session_id IN (
      SELECT id FROM learning_sessions 
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM learning_sessions 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Policy: Users can delete responses from their own learning sessions
CREATE POLICY "session_responses_delete_own"
  ON "session_responses" FOR DELETE 
  TO authenticated 
  USING (
    session_id IN (
      SELECT id FROM learning_sessions 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Performance index for RLS filtering (already exists in migration)
-- CREATE INDEX "idx_session_responses_session_id" ON "session_responses" USING btree ("session_id");