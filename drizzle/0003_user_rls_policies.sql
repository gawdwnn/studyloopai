-- Enable RLS for users and user_plans tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

-- Policies for 'users' table
-- Users can see their own user data
CREATE POLICY "Allow authenticated users to see their own user data"
ON public.users FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own user data
CREATE POLICY "Allow authenticated users to update their own user data"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- Policies for 'user_plans' table
-- Users can see their own plan
CREATE POLICY "Allow authenticated users to see their own plan"
ON public.user_plans FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create their own plan (e.g., during signup)
CREATE POLICY "Allow authenticated users to create their own plan"
ON public.user_plans FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own plan (e.g., cancel or change plan)
CREATE POLICY "Allow authenticated users to update their own plan"
ON public.user_plans FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Note: Deleting user plans is restricted to service_role or admin actions. 