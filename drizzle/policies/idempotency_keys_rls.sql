-- RLS Policies for idempotency_keys table
-- Direct Ownership: Users manage their own idempotency keys
-- System-level keys (user_id IS NULL) accessible only via admin/service_role

-- Enable RLS
ALTER TABLE "idempotency_keys" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select their own idempotency keys
CREATE POLICY "idempotency_keys_select_own"
  ON "idempotency_keys" FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Policy: Users can insert their own idempotency keys
CREATE POLICY "idempotency_keys_insert_own"
  ON "idempotency_keys" FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can update their own idempotency keys
CREATE POLICY "idempotency_keys_update_own"
  ON "idempotency_keys" FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can delete their own idempotency keys
CREATE POLICY "idempotency_keys_delete_own"
  ON "idempotency_keys" FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
