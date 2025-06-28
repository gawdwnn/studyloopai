-- RLS POLICIES --

-- Enable RLS for all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_admin_all_access" ON public.users;

-- Policies for 'users' table
CREATE POLICY "users_select_own" ON public.users 
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "users_update_own" ON public.users 
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_admin_all_access" ON public.users 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "user_plans_select_own" ON public.user_plans;
DROP POLICY IF EXISTS "user_plans_insert_own" ON public.user_plans;
DROP POLICY IF EXISTS "user_plans_update_own" ON public.user_plans;
DROP POLICY IF EXISTS "user_plans_delete_own" ON public.user_plans;

-- Policies for 'user_plans' table
CREATE POLICY "user_plans_select_own" ON public.user_plans 
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "user_plans_insert_own" ON public.user_plans 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_plans_update_own" ON public.user_plans 
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_plans_delete_own" ON public.user_plans 
  FOR DELETE TO authenticated 
  USING (auth.uid() = user_id);

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "courses_select_own" ON public.courses;
DROP POLICY IF EXISTS "courses_insert_own" ON public.courses;
DROP POLICY IF EXISTS "courses_update_own" ON public.courses;
DROP POLICY IF EXISTS "courses_delete_own" ON public.courses;

-- Policies for 'courses' table
CREATE POLICY "courses_select_own" ON public.courses 
  FOR SELECT TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "courses_insert_own" ON public.courses 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "courses_update_own" ON public.courses 
  FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "courses_delete_own" ON public.courses 
  FOR DELETE TO authenticated 
  USING (auth.uid() = user_id);

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "course_weeks_select_own_courses" ON public.course_weeks;
DROP POLICY IF EXISTS "course_weeks_insert_own_courses" ON public.course_weeks;
DROP POLICY IF EXISTS "course_weeks_update_own_courses" ON public.course_weeks;
DROP POLICY IF EXISTS "course_weeks_delete_own_courses" ON public.course_weeks;

-- Policies for 'course_weeks' table
CREATE POLICY "course_weeks_select_own_courses" ON public.course_weeks 
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_weeks.course_id 
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "course_weeks_insert_own_courses" ON public.course_weeks 
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_weeks.course_id 
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "course_weeks_update_own_courses" ON public.course_weeks 
  FOR UPDATE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_weeks.course_id 
      AND courses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_weeks.course_id 
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "course_weeks_delete_own_courses" ON public.course_weeks 
  FOR DELETE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_weeks.course_id 
      AND courses.user_id = auth.uid()
    )
  );

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "course_materials_select_own_courses" ON public.course_materials;
DROP POLICY IF EXISTS "course_materials_insert_own_courses" ON public.course_materials;
DROP POLICY IF EXISTS "course_materials_update_own_courses" ON public.course_materials;
DROP POLICY IF EXISTS "course_materials_delete_own_courses" ON public.course_materials;

-- Policies for 'course_materials' table
CREATE POLICY "course_materials_select_own_courses" ON public.course_materials 
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_materials.course_id 
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "course_materials_insert_own_courses" ON public.course_materials 
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_materials.course_id 
      AND courses.user_id = auth.uid()
    ) 
    AND auth.uid() = uploaded_by
  );

CREATE POLICY "course_materials_update_own_courses" ON public.course_materials 
  FOR UPDATE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_materials.course_id 
      AND courses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_materials.course_id 
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "course_materials_delete_own_courses" ON public.course_materials 
  FOR DELETE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_materials.course_id 
      AND courses.user_id = auth.uid()
    )
  );

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "document_chunks_select_own_materials" ON public.document_chunks;
DROP POLICY IF EXISTS "document_chunks_insert_own_materials" ON public.document_chunks;
DROP POLICY IF EXISTS "document_chunks_update_own_materials" ON public.document_chunks;
DROP POLICY IF EXISTS "document_chunks_delete_own_materials" ON public.document_chunks;

-- Policies for 'document_chunks' table
CREATE POLICY "document_chunks_select_own_materials" ON public.document_chunks 
  FOR SELECT TO authenticated 
  USING (
    material_id IN (
      SELECT cm.id 
      FROM course_materials cm
      JOIN courses c ON c.id = cm.course_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "document_chunks_insert_own_materials" ON public.document_chunks 
  FOR INSERT TO authenticated 
  WITH CHECK (
    material_id IN (
      SELECT cm.id 
      FROM course_materials cm
      JOIN courses c ON c.id = cm.course_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "document_chunks_update_own_materials" ON public.document_chunks 
  FOR UPDATE TO authenticated 
  USING (
    material_id IN (
      SELECT cm.id 
      FROM course_materials cm
      JOIN courses c ON c.id = cm.course_id
      WHERE c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    material_id IN (
      SELECT cm.id 
      FROM course_materials cm
      JOIN courses c ON c.id = cm.course_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "document_chunks_delete_own_materials" ON public.document_chunks 
  FOR DELETE TO authenticated 
  USING (
    material_id IN (
      SELECT cm.id 
      FROM course_materials cm
      JOIN courses c ON c.id = cm.course_id
      WHERE c.user_id = auth.uid()
    )
  );