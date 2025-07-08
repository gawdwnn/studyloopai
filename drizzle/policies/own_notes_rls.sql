-- RLS Policies for own_notes table
-- User-created notes with direct user ownership

-- Enable RLS
ALTER TABLE "own_notes" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own notes
CREATE POLICY "Users can manage their own notes"
  ON "own_notes" FOR ALL 
  TO authenticated 
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Performance index for RLS filtering
CREATE INDEX IF NOT EXISTS "idx_own_notes_user_id_rls" ON "own_notes" USING btree ("user_id");