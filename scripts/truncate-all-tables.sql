-- Truncate all tables in development database
-- This script removes all data while preserving table structure
-- Tables are truncated in order to respect foreign key constraints

-- Disable foreign key checks temporarily
-- Note: In PostgreSQL, we need to truncate with CASCADE to handle FK constraints

BEGIN;

-- Tables with no dependencies or leaf tables first
TRUNCATE TABLE document_chunks CASCADE;
TRUNCATE TABLE user_prompt_templates CASCADE;
TRUNCATE TABLE user_progress CASCADE;
TRUNCATE TABLE own_notes CASCADE;
TRUNCATE TABLE golden_notes CASCADE;
TRUNCATE TABLE summaries CASCADE;
TRUNCATE TABLE open_questions CASCADE;
TRUNCATE TABLE multiple_choice_questions CASCADE;
TRUNCATE TABLE cuecards CASCADE;
TRUNCATE TABLE concept_maps CASCADE;
TRUNCATE TABLE generation_configs CASCADE;
TRUNCATE TABLE course_week_features CASCADE;
TRUNCATE TABLE course_materials CASCADE;
TRUNCATE TABLE course_weeks CASCADE;
TRUNCATE TABLE courses CASCADE;
TRUNCATE TABLE user_plans CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE institutions CASCADE;

-- Reset sequences if needed (optional)
-- This ensures auto-increment counters start fresh
-- PostgreSQL handles this automatically with TRUNCATE ... RESTART IDENTITY

COMMIT;

-- Alternative: Single command to truncate all tables at once
-- This lets PostgreSQL figure out the correct order
/*
TRUNCATE TABLE 
    institutions,
    users,
    user_plans,
    courses,
    course_weeks,
    course_materials,
    course_week_features,
    generation_configs,
    concept_maps,
    cuecards,
    multiple_choice_questions,
    open_questions,
    summaries,
    golden_notes,
    own_notes,
    user_progress,
    user_prompt_templates,
    document_chunks
CASCADE;
*/