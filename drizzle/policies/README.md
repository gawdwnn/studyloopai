# RLS Policies Documentation

This directory contains all Row Level Security (RLS) policies for the StudyLoop AI application. Each file corresponds to a table and contains the complete RLS configuration for that table.

## Policy Files Overview

### Core User Tables
- **`users_rls.sql`** - User profile management policies
- **`user_plans_rls.sql`** - Subscription plan management policies
- **`user_progress_rls.sql`** - User progress tracking policies

### Course Management Tables
- **`courses_rls.sql`** - Course ownership and management policies
- **`course_weeks_rls.sql`** - Course week access based on course ownership
- **`course_materials_rls.sql`** - Course material access with uploader verification
- **`document_chunks_rls.sql`** - Document chunk access through course hierarchy

### AI-Generated Content Tables
- **`ai_generated_content_rls.sql`** - Policies for MCQs, open questions, summaries, golden notes, and cuecards
- **`golden_notes_rls_fix.sql`** - Fix for golden notes policy conflicts
- **`generation_configs_rls.sql`** - User-specific generation configuration policies

### User-Created Content Tables
- **`own_notes_rls.sql`** - User-created notes with direct ownership

## Policy Patterns

### Direct User Ownership
Tables with direct `user_id` foreign keys:
- `users`, `user_plans`, `user_progress`, `own_notes`, `generation_configs`, `courses`

Pattern: `auth.uid() = user_id`

### Course-Based Access
Tables accessed through course ownership:
- `course_weeks`, `course_materials`, `multiple_choice_questions`, `open_questions`, `summaries`, `golden_notes`, `cuecards`

Pattern: Course ID exists in user's courses

### Material-Based Access
Tables accessed through course material ownership:
- `document_chunks`

Pattern: Material ID exists in user's course materials

## Security Verification

### Remote Policy Status (Last Checked)
All policies have been verified against the remote Supabase database:

#### Tables with Complete RLS Coverage:
- ✅ `users` - 3 policies (SELECT, INSERT, UPDATE)
- ✅ `user_plans` - 4 policies (SELECT, INSERT, UPDATE, DELETE)
- ✅ `user_progress` - 1 policy (ALL operations)
- ✅ `courses` - 4 policies (SELECT, INSERT, UPDATE, DELETE)
- ✅ `course_weeks` - 4 policies (SELECT, INSERT, UPDATE, DELETE)
- ✅ `course_materials` - 4 policies (SELECT, INSERT, UPDATE, DELETE)
- ✅ `document_chunks` - 4 policies (SELECT, INSERT, UPDATE, DELETE)
- ✅ `generation_configs` - 1 policy (ALL operations)
- ✅ `own_notes` - 1 policy (ALL operations)
- ✅ `multiple_choice_questions` - 2 policies (SELECT, ALL)
- ✅ `open_questions` - 2 policies (SELECT, ALL)
- ✅ `summaries` - 2 policies (SELECT, ALL)
- ✅ `golden_notes` - 2 policies (SELECT, ALL)
- ✅ `cuecards` - 2 policies (SELECT, ALL)

### Performance Optimization
All RLS policies include corresponding performance indexes:
- User ID indexes for direct ownership tables
- Course ID indexes for course-based access
- Material ID indexes for material-based access

## Usage Instructions

### Applying Policies
Use the policy manager script to apply policies:

```bash
# Check current policy status
bun scripts/policy-manager.ts check

# Apply a specific policy file (dry-run)
bun scripts/policy-manager.ts apply course_materials_rls.sql

# Apply a specific policy file (execute)
bun scripts/policy-manager.ts apply course_materials_rls.sql --exec

# Apply all policies (dry-run)
bun scripts/policy-manager.ts apply-all

# Apply all policies (execute)
bun scripts/policy-manager.ts apply-all --exec

# Show schema differences (Supabase CLI)
bun scripts/policy-manager.ts diff
```

### Testing Policies
Always test policies in development before applying to production:

```sql
-- Test as authenticated user
SET ROLE authenticated;
SELECT * FROM courses; -- Should return only user's courses

-- Test as anonymous user
SET ROLE anon;
SELECT * FROM courses; -- Should return no results
```

### Maintenance
- Update this README when adding new tables or policies
- Run policy checks after schema migrations
- Review policy efficiency during performance optimization cycles
- Keep policy files synchronized with database state

## Security Notes

1. **Defense in Depth**: RLS is the primary security layer, but application-level checks provide additional protection
2. **Performance Impact**: All RLS policies include optimized indexes to minimize query performance impact
3. **Policy Conflicts**: Avoid creating conflicting policies for the same table/operation
4. **Testing**: Always test policy changes in development environment first
5. **Documentation**: Keep this documentation updated with any policy changes