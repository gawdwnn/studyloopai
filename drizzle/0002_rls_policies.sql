-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

-- Policies for 'courses' table
-- Users can see their own courses
CREATE POLICY "Allow users to see their own courses"
ON public.courses FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create courses for themselves
CREATE POLICY "Allow users to create their own courses"
ON public.courses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own courses
CREATE POLICY "Allow users to update their own courses"
ON public.courses FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own courses
CREATE POLICY "Allow users to delete their own courses"
ON public.courses FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- Policies for 'course_weeks' table
-- Users can see course weeks for courses they have access to
CREATE POLICY "Allow users to see course weeks for their courses"
ON public.course_weeks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = course_weeks.course_id
    AND courses.user_id = auth.uid()
  )
);

-- Users can create course weeks for their own courses
CREATE POLICY "Allow users to create course weeks for their courses"
ON public.course_weeks FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = course_weeks.course_id
    AND courses.user_id = auth.uid()
  )
);

-- Users can update course weeks for their own courses
CREATE POLICY "Allow users to update course weeks for their courses"
ON public.course_weeks FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = course_weeks.course_id
    AND courses.user_id = auth.uid()
  )
);

-- Users can delete course weeks for their own courses
CREATE POLICY "Allow users to delete course weeks for their courses"
ON public.course_weeks FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = course_weeks.course_id
    AND courses.user_id = auth.uid()
  )
);


-- Policies for 'course_materials' table
-- Users can see materials for courses they have access to
CREATE POLICY "Allow users to see materials for their courses"
ON public.course_materials FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = course_materials.course_id
    AND courses.user_id = auth.uid()
  )
);

-- Users can upload materials for their own courses
CREATE POLICY "Allow users to upload materials for their courses"
ON public.course_materials FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = course_materials.course_id
    AND courses.user_id = auth.uid()
  )
  AND auth.uid() = uploaded_by
);

-- Users can update materials for their own courses
CREATE POLICY "Allow users to update materials for their courses"
ON public.course_materials FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = course_materials.course_id
    AND courses.user_id = auth.uid()
  )
);

-- Users can delete materials for their own courses
CREATE POLICY "Allow users to delete materials for their courses"
ON public.course_materials FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = course_materials.course_id
    AND courses.user_id = auth.uid()
  )
); 