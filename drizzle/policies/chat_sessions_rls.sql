-- RLS Policies for chat_sessions table
-- Direct user ownership for chat session management

-- Enable RLS
ALTER TABLE "chat_sessions" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select their own chat sessions
CREATE POLICY "chat_sessions_select_own"
  ON "chat_sessions" FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Policy: Users can insert their own chat sessions
CREATE POLICY "chat_sessions_insert_own"
  ON "chat_sessions" FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can update their own chat sessions
CREATE POLICY "chat_sessions_update_own"
  ON "chat_sessions" FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can delete their own chat sessions
CREATE POLICY "chat_sessions_delete_own"
  ON "chat_sessions" FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);