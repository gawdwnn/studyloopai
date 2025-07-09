-- RLS Policies for document_chunks table
-- Document chunk access based on course material ownership through course hierarchy

-- Enable RLS
ALTER TABLE "document_chunks" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can select document chunks from their own course materials
CREATE POLICY "document_chunks_select_own_materials"
  ON "document_chunks" FOR SELECT 
  TO authenticated 
  USING (
    material_id IN (
      SELECT cm.id 
      FROM course_materials cm
      JOIN courses c ON c.id = cm.course_id
      WHERE c.user_id = auth.uid()
    )
  );

-- Policy: Users can insert document chunks for their own course materials
CREATE POLICY "document_chunks_insert_own_materials"
  ON "document_chunks" FOR INSERT 
  TO authenticated 
  WITH CHECK (
    material_id IN (
      SELECT cm.id 
      FROM course_materials cm
      JOIN courses c ON c.id = cm.course_id
      WHERE c.user_id = auth.uid()
    )
  );

-- Policy: Users can update document chunks from their own course materials
CREATE POLICY "document_chunks_update_own_materials"
  ON "document_chunks" FOR UPDATE 
  TO authenticated 
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

-- Policy: Users can delete document chunks from their own course materials
CREATE POLICY "document_chunks_delete_own_materials"
  ON "document_chunks" FOR DELETE 
  TO authenticated 
  USING (
    material_id IN (
      SELECT cm.id 
      FROM course_materials cm
      JOIN courses c ON c.id = cm.course_id
      WHERE c.user_id = auth.uid()
    )
  );

-- Performance indexes for RLS filtering
CREATE INDEX IF NOT EXISTS "idx_document_chunks_material_id_rls" ON "document_chunks" USING btree ("material_id");
CREATE INDEX IF NOT EXISTS "idx_course_materials_course_id_rls" ON "course_materials" USING btree ("course_id");
CREATE INDEX IF NOT EXISTS "idx_courses_user_id_rls" ON "courses" USING btree ("user_id");