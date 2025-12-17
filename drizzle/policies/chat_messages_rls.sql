-- RLS Policies for chat_messages table
-- Session-based ownership via chat_sessions

-- Enable RLS
ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select messages from their own chat sessions
CREATE POLICY "chat_messages_select_own"
  ON "chat_messages" FOR SELECT 
  TO authenticated 
  USING (session_id IN (
    SELECT id FROM chat_sessions 
    WHERE user_id = (SELECT auth.uid())
  ));

-- Policy: Users can insert messages into their own chat sessions
CREATE POLICY "chat_messages_insert_own"
  ON "chat_messages" FOR INSERT 
  TO authenticated 
  WITH CHECK (session_id IN (
    SELECT id FROM chat_sessions 
    WHERE user_id = (SELECT auth.uid())
  ));

-- Policy: Users can update messages in their own chat sessions
CREATE POLICY "chat_messages_update_own"
  ON "chat_messages" FOR UPDATE 
  TO authenticated 
  USING (session_id IN (
    SELECT id FROM chat_sessions 
    WHERE user_id = (SELECT auth.uid())
  ))
  WITH CHECK (session_id IN (
    SELECT id FROM chat_sessions 
    WHERE user_id = (SELECT auth.uid())
  ));

-- Policy: Users can delete messages from their own chat sessions
CREATE POLICY "chat_messages_delete_own"
  ON "chat_messages" FOR DELETE 
  TO authenticated 
  USING (session_id IN (
    SELECT id FROM chat_sessions 
    WHERE user_id = (SELECT auth.uid())
  ));