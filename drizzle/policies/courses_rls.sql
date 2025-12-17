-- RLS Policies for courses table
-- Direct user ownership for course management

-- Enable RLS
ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select their own courses
CREATE POLICY "courses_select_own"
  ON "courses" FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Policy: Users can insert their own courses
CREATE POLICY "courses_insert_own"
  ON "courses" FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can update their own courses
CREATE POLICY "courses_update_own"
  ON "courses" FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can delete their own courses
CREATE POLICY "courses_delete_own"
  ON "courses" FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);