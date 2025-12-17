-- RLS Policies for storage.objects (course-materials bucket)
-- File path structure: {userId}/{materialId}/{fileName}
-- Users can only access files in their own folder

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own course materials
CREATE POLICY "storage_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'course-materials'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- Policy: Users can upload their own course materials
CREATE POLICY "storage_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'course-materials'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- Policy: Users can update their own course materials
CREATE POLICY "storage_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'course-materials'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  )
  WITH CHECK (
    bucket_id = 'course-materials'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- Policy: Users can delete their own course materials
CREATE POLICY "storage_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'course-materials'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );
