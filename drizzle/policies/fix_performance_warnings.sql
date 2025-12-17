-- Fix Supabase Performance Advisor Warnings
-- This script addresses:
-- 1. Multiple permissive policies (consolidate duplicates)
-- 2. Duplicate indexes (drop redundant ones)
-- Generated: 2025-12-16

-- ============================================================================
-- PART 1: Drop Duplicate Permissive Policies
-- ============================================================================

-- Fix: concept_mappings table
-- Drop old "*_own" policies (replaced by "*_via_course" policies in concept_mappings_rls.sql)
DROP POLICY IF EXISTS "concept_mappings_select_own" ON "concept_mappings";
DROP POLICY IF EXISTS "concept_mappings_insert_own" ON "concept_mappings";
DROP POLICY IF EXISTS "concept_mappings_update_own" ON "concept_mappings";
DROP POLICY IF EXISTS "concept_mappings_delete_own" ON "concept_mappings";

-- Fix: golden_notes table
-- Drop redundant SELECT policy (the ALL policy includes SELECT)
DROP POLICY IF EXISTS "Users can view golden notes from their courses" ON "golden_notes";

-- Fix: users table
-- Drop admin ALL policy (redundant with specific policies)
DROP POLICY IF EXISTS "users_admin_all_access" ON "users";

-- ============================================================================
-- PART 2: Drop Duplicate Indexes
-- ============================================================================
-- Drop all *_rls suffix indexes that duplicate existing indexes
-- Keep the original indexes, remove the _rls duplicates

-- chat_messages: Keep idx_chat_messages_session_id, drop _rls duplicate
DROP INDEX IF EXISTS "idx_chat_messages_session_id_rls";

-- chat_sessions: Keep idx_chat_sessions_user_id, drop _rls duplicate
DROP INDEX IF EXISTS "idx_chat_sessions_user_id_rls";

-- concept_maps: Keep idx_concept_maps_course_id, drop _rls duplicate
DROP INDEX IF EXISTS "idx_concept_maps_user_id_via_course";

-- course_week_features: Keep idx_course_week_features_course_id, drop _rls duplicate
DROP INDEX IF EXISTS "idx_course_week_features_rls";

-- courses: Keep idx_courses_user_id, drop _rls duplicate
DROP INDEX IF EXISTS "idx_courses_user_id_rls";

-- cuecards: Keep idx_cuecards_course_id, drop _rls duplicate
DROP INDEX IF EXISTS "idx_cuecards_course_id_rls";

-- golden_notes: Keep idx_golden_notes_course_id, drop _rls duplicate
DROP INDEX IF EXISTS "idx_golden_notes_course_id_rls";

-- idempotency_keys: Keep idx_idempotency_keys_user_id, drop _rls duplicate
DROP INDEX IF EXISTS "idx_idempotency_keys_user_id_rls";

-- multiple_choice_questions: Keep idx_mcq_course_id, drop _rls duplicate
DROP INDEX IF EXISTS "idx_mcqs_course_id_rls";

-- open_questions: Keep idx_open_questions_course_id, drop _rls duplicate
DROP INDEX IF EXISTS "idx_open_questions_course_id_rls";

-- own_notes: Keep idx_own_notes_user_id, drop _rls duplicate
DROP INDEX IF EXISTS "idx_own_notes_user_id_rls";

-- summaries: Keep idx_summaries_course_id, drop _rls duplicate
DROP INDEX IF EXISTS "idx_summaries_course_id_rls";

-- user_progress: Keep idx_user_progress_user_id, drop _rls duplicate
DROP INDEX IF EXISTS "idx_user_progress_user_id_rls";

-- user_prompt_templates: Keep idx_user_prompt_templates_user_id, drop _rls duplicate
DROP INDEX IF EXISTS "idx_user_prompt_templates_user_id_rls";

-- user_usage: Keep idx_user_usage_user_id, drop _rls duplicate
DROP INDEX IF EXISTS "idx_user_usage_user_id_rls";

-- user_plans: Keep idx_user_plans_user_id, drop _rls duplicate (if exists)
DROP INDEX IF EXISTS "idx_user_plans_user_id_rls";

-- course_weeks: Keep idx_course_weeks_course_id, drop _rls duplicate (if exists)
DROP INDEX IF EXISTS "idx_course_weeks_course_id_rls";

-- course_materials: Keep idx_course_materials_course_id and idx_course_materials_uploaded_by
DROP INDEX IF EXISTS "idx_course_materials_course_id_rls";
DROP INDEX IF EXISTS "idx_course_materials_uploaded_by_rls";

-- document_chunks: Keep idx_document_chunks_material_id
DROP INDEX IF EXISTS "idx_document_chunks_material_id_rls";

-- Note: Some duplicate indexes may be referenced in multiple policy files
-- We're keeping the original indexes and only dropping the _rls suffixed versions

-- ============================================================================
-- VERIFICATION QUERIES (Run after applying this script)
-- ============================================================================

-- Check for remaining duplicate policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename IN ('users', 'concept_mappings', 'golden_notes')
-- ORDER BY tablename, cmd, policyname;

-- Check for remaining duplicate indexes
-- SELECT tablename, indexname
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- AND indexname LIKE '%_rls'
-- ORDER BY tablename;
