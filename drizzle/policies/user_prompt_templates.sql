-- Enable RLS for user_prompt_templates table
ALTER TABLE user_prompt_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create their own prompt templates
CREATE POLICY "Users can create own templates" ON user_prompt_templates
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can view their own prompt templates
CREATE POLICY "Users can view own templates" ON user_prompt_templates
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Policy: Users can update their own prompt templates
CREATE POLICY "Users can update own templates" ON user_prompt_templates
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Users can delete their own prompt templates
CREATE POLICY "Users can delete own templates" ON user_prompt_templates
    FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = user_id);