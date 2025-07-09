-- RLS Policies for generation_configs table
-- Direct user ownership for generation configurations

-- Enable RLS
ALTER TABLE "generation_configs" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their generation configs
CREATE POLICY "Users can manage their generation configs"
  ON "generation_configs" FOR ALL 
  TO authenticated 
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Performance index for RLS filtering
CREATE INDEX IF NOT EXISTS "idx_generation_configs_user_id_rls" ON "generation_configs" USING btree ("user_id");