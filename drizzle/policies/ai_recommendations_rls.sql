-- RLS Policies for ai_recommendations table
-- AI-generated adaptive suggestions and recommendations
-- Direct user ownership pattern

-- Enable RLS
ALTER TABLE "ai_recommendations" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select their own AI recommendations
CREATE POLICY "ai_recommendations_select_own"
  ON "ai_recommendations" FOR SELECT 
  TO authenticated 
  USING ((SELECT auth.uid()) = user_id);

-- Policy: Users can insert their own AI recommendations
-- Note: Typically AI recommendations are system-generated, but users might create custom ones
CREATE POLICY "ai_recommendations_insert_own"
  ON "ai_recommendations" FOR INSERT 
  TO authenticated 
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can update their own AI recommendations
-- Allows users to accept/dismiss recommendations, update acceptance status
CREATE POLICY "ai_recommendations_update_own"
  ON "ai_recommendations" FOR UPDATE 
  TO authenticated 
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can delete their own AI recommendations
CREATE POLICY "ai_recommendations_delete_own"
  ON "ai_recommendations" FOR DELETE 
  TO authenticated 
  USING ((SELECT auth.uid()) = user_id);

-- Performance index for RLS filtering (already exists in migration)
-- CREATE INDEX "idx_ai_recommendations_user_id" ON "ai_recommendations" USING btree ("user_id");