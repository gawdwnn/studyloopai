# Standalone Course Materials Implementation Document

## Overview

This document outlines the refactoring required to transform the current batch-upload system into a standalone materials system where each uploaded file becomes an independent `courseMaterials` record with its own processing pipeline.

## Current Problem

The existing system creates a single `courseMaterials` record for multiple uploaded files, which violates the principle that each course material should be standalone and independently processable. This limits scalability for future content types (videos, audio, transcripts, weblinks).

## Solution Requirements

### Core Principle
Each uploaded file must become a standalone `courseMaterials` record with:
- Independent processing pipeline and status tracking
- Individual management capabilities (delete, reprocess, view)
- Support for future content types beyond PDFs
- Proper source attribution for RAG-based AI responses

### Version 1 Scope
- **Primary Focus**: PDF files only
- **Future-Proofing**: Design schema and architecture to accommodate videos, audio, transcripts, screenshots, weblinks
- **Retention Strategy**: Keep original materials for RAG, citations, and potential reprocessing

## Database Schema Changes

### 1. Enhanced `courseMaterials` Table

**Current Issues:**
- Single record stores multiple file paths
- Limited metadata for different content types
- No content type classification

**Required Changes:**

```sql
-- Add new columns to support standalone materials
ALTER TABLE course_materials 
ADD COLUMN content_type VARCHAR(50) DEFAULT 'pdf',
ADD COLUMN original_filename VARCHAR(255),
ADD COLUMN processing_started_at TIMESTAMP,
ADD COLUMN processing_completed_at TIMESTAMP,
ADD COLUMN content_metadata JSONB DEFAULT '{}',
ADD COLUMN source_url TEXT, -- For weblinks in future
ADD COLUMN transcript_path VARCHAR(500), -- For video/audio in future
ADD COLUMN thumbnail_path VARCHAR(500); -- For videos/images in future

-- Update existing enum-like fields
ALTER TABLE course_materials 
ALTER COLUMN upload_status TYPE VARCHAR(50),
ALTER COLUMN embedding_status TYPE VARCHAR(50);

-- Add indexes for new columns
CREATE INDEX idx_course_materials_content_type ON course_materials(content_type);
CREATE INDEX idx_course_materials_processing_status ON course_materials((processing_metadata->>'processingStatus'));
```

**New Content Types (Future Versions):**
- `pdf` (v1)
- `video` (v2)
- `audio` (v2) 
- `image` (v2)
- `weblink` (v2)
- `transcript` (v2)

### 2. Enhanced ProcessingMetadata Type

```typescript
export type ProcessingMetadata = {
  processingStatus?: "pending" | "processing" | "completed" | "failed";
  
  // Content generation tracking
  flashcards?: {
    total: number;
    completed: number;
    generatedAt?: string;
  };
  multipleChoice?: {
    total: number;
    completed: number;
    generatedAt?: string;
  };
  openQuestions?: {
    total: number;
    completed: number;
    generatedAt?: string;
  };
  summaries?: {
    total: number;
    completed: number;
    generatedAt?: string;
  };
  
  // Processing details
  error?: string;
  processingTimeMs?: number;
  extractedText?: boolean;
  chunkingCompleted?: boolean;
  embeddingCompleted?: boolean;
  
  // Future content type metadata
  videoDurationMs?: number; // For videos
  audioTranscribed?: boolean; // For audio
  thumbnailGenerated?: boolean; // For videos/images
  contentExtracted?: boolean; // For weblinks
};
```

### 3. Content Metadata Schema

```typescript
export type ContentMetadata = {
  // PDF-specific
  pageCount?: number;
  pdfVersion?: string;
  hasImages?: boolean;
  
  // Video-specific (future)
  duration?: number;
  resolution?: string;
  format?: string;
  frameRate?: number;
  
  // Audio-specific (future)
  duration?: number;
  sampleRate?: number;
  bitrate?: number;
  format?: string;
  
  // Image-specific (future)
  width?: number;
  height?: number;
  format?: string;
  
  // Weblink-specific (future)
  url?: string;
  title?: string;
  domain?: string;
  scrapedAt?: string;
  
  // Common
  language?: string;
  encoding?: string;
};
```

## File System Changes

### 1. Upload Components

#### A. **Course Material Upload Wizard** - `src/components/course/course-material-upload-wizard.tsx`

**Changes Required:**
- Remove multi-file batch processing logic
- Process each file individually in sequence
- Update progress tracking to show per-file progress
- Modify success/error handling for individual files

**Key Modifications:**
```typescript
// Change from batch processing to individual file processing
const processFiles = async () => {
  const results = [];
  for (const file of files) {
    const result = await uploadAndGenerateContent({
      courseId,
      weekId,
      file, // Single file instead of files array
      generationConfig
    });
    results.push(result);
    // Update progress per file
  }
};
```

#### B. **File Upload Dropzone** - `src/components/course/file-upload-dropzone.tsx`

**Changes Required:**
- Update validation to support future content types
- Add content type detection
- Maintain PDF-only validation for v1

**Future-Proofing:**
```typescript
const SUPPORTED_TYPES = {
  v1: ['application/pdf'],
  future: [
    'application/pdf',
    'video/mp4', 'video/avi', 'video/mov',
    'audio/mp3', 'audio/wav', 'audio/m4a',
    'image/png', 'image/jpg', 'image/jpeg',
    'text/plain', 'text/html'
  ]
};
```

### 2. Material Management

#### A. **Course Materials Table** - `src/components/course/course-materials-table.tsx`

**Changes Required:**
- Update to display individual materials instead of batched ones
- Add content type icons/indicators
- Enhance search to include content type filtering
- Update processing status display

**New Features:**
```typescript
// Add content type display
const getContentTypeIcon = (contentType: string) => {
  switch (contentType) {
    case 'pdf': return <FileText className="h-4 w-4" />;
    case 'video': return <Video className="h-4 w-4" />;
    case 'audio': return <AudioLines className="h-4 w-4" />;
    case 'image': return <Image className="h-4 w-4" />;
    case 'weblink': return <Link className="h-4 w-4" />;
    default: return <File className="h-4 w-4" />;
  }
};
```

#### B. **Material Status Indicator** - `src/components/course/material-status-indicator.tsx`

**Current State:** ✅ Already properly designed for individual materials
**Changes Required:** Minor enhancements for new status types

### 3. Server Actions

#### A. **Content Generation** - `src/lib/actions/content-generation.ts`

**Major Refactor Required:**

**Current Function:**
```typescript
uploadAndGenerateContent(uploadData: UploadData): Promise<Result>
```

**New Function:**
```typescript
uploadAndGenerateContent(materialData: MaterialUploadData): Promise<Result>

interface MaterialUploadData {
  courseId: string;
  weekId?: string;
  file: File; // Single file instead of files array
  generationConfig: GenerationConfig;
  contentType?: string; // Auto-detected or specified
}
```

**Implementation Changes:**
1. Remove Promise.all for multiple files
2. Create single courseMaterial record per call
3. Upload single file to storage
4. Trigger single background job
5. Enhanced error handling per file

#### B. **Course Materials Actions** - `src/lib/actions/course-materials.ts`

**Changes Required:**
- Update `addCourseMaterial` to handle individual materials
- Enhance `deleteCourseMaterial` to clean up associated content
- Add new actions for content type management

### 4. Background Processing

#### A. **Course Material Workflow** - `src/trigger/course-material-workflow.ts`

**Changes Required:**
- Simplify workflow to process single material
- Remove file path array handling
- Add content type-specific processing logic
- Enhanced progress tracking

**Current Workflow:**
```typescript
// Processes multiple files in single job
filePaths: string[] // Multiple files
```

**New Workflow:**
```typescript
// Processes single material
materialId: string;
filePath: string; // Single file
contentType: string;
```

#### B. **PDF Parser** - `src/lib/processing/pdf-parser.ts`

**Current State:** ✅ Already handles single file processing
**Changes Required:** Minor enhancements for metadata extraction

### 5. Future Content Type Processors

**Create New Processors (Future Versions):**

```
src/lib/processing/
├── pdf-parser.ts (existing)
├── video-processor.ts (future)
├── audio-processor.ts (future)
├── image-processor.ts (future)
├── weblink-scraper.ts (future)
└── content-processor-factory.ts (future)
```

## Implementation Strategy

### Phase 1: Database Schema Enhancement

```sql
-- Create migration file: YYYY_MM_DD_standalone_materials.sql

-- 1. Add new columns to support standalone materials
ALTER TABLE course_materials 
ADD COLUMN content_type VARCHAR(50) DEFAULT 'pdf',
ADD COLUMN original_filename VARCHAR(255),
ADD COLUMN processing_started_at TIMESTAMP,
ADD COLUMN processing_completed_at TIMESTAMP,
ADD COLUMN content_metadata JSONB DEFAULT '{}',
ADD COLUMN source_url TEXT,
ADD COLUMN transcript_path VARCHAR(500),
ADD COLUMN thumbnail_path VARCHAR(500);

-- 2. Add indexes for performance
CREATE INDEX idx_course_materials_content_type ON course_materials(content_type);
CREATE INDEX idx_course_materials_processing_status ON course_materials((processing_metadata->>'processingStatus'));

-- Note: No existing data migration needed - database is currently empty
```

### Phase 2: Backend Implementation

**Step 1: Update Schema Types**
- Update TypeScript types in `drizzle/schema.ts`
- Add new content type enums and metadata types

**Step 2: Refactor Server Actions**
- Refactor `uploadAndGenerateContent` for individual file processing
- Create separate material records per file
- Update database operations for single-file workflow

**Step 3: Modify Background Jobs**
- Update Trigger.dev workflow for single file processing
- Remove file concatenation logic
- Implement per-file status tracking

### Phase 3: Frontend Implementation

**Step 4: Refactor Upload Components**
- Modify upload wizard for individual file processing
- Update file validation and progress tracking
- Add per-file progress indicators

**Step 5: Update UI Components**
- Enhance materials table with content type support
- Update status indicators for individual files
- Add content type icons and filtering

## Benefits of This Refactor

### Immediate Benefits (v1)
1. **Individual File Management**: Each PDF becomes independently manageable
2. **Better Error Isolation**: Single file failure doesn't affect others
3. **Granular Progress Tracking**: Per-file status and progress
4. **Improved User Experience**: Clearer feedback and control

### Future Benefits (v2+)
1. **Content Type Scalability**: Easy addition of videos, audio, etc.
2. **RAG Enhancement**: Proper source attribution for AI responses
3. **Content Analytics**: Individual material performance tracking
4. **Flexible Processing**: Different pipelines for different content types

## Risks & Mitigation

### Risk 1: Performance Impact
**Mitigation**: Implement parallel processing for multiple file uploads and optimize background job concurrency

### Risk 2: User Experience Disruption
**Mitigation**: Enhance user feedback with better progress tracking and error handling per file

### Risk 3: Background Job Scaling
**Mitigation**: Configure Trigger.dev concurrency limits and implement proper queue management

**Note**: Data migration risks eliminated since database is currently empty

## Success Metrics

1. **Individual file processing** working correctly
2. **Performance maintained** or improved (< 20% processing time increase per file)
3. **User experience** enhanced with better progress tracking
4. **Architecture ready** for future content types
5. **Error isolation** working (failed file doesn't affect others)

## Conclusion

This refactor transforms the upload system from a batch-processing model to a truly scalable, individual-material model that supports the adaptive learning vision outlined in the product documentation. Each material becomes a standalone entity that can be independently managed, processed, and utilized for RAG-based AI interactions.

The design accommodates future content types while maintaining focus on PDF processing for version 1, ensuring a solid foundation for the adaptive learning platform's growth.

#TODO: fix userplan creation on every login
#TODO: generation config end to end

Summary of Proposed Solution

  The key improvements using tasks.batchTrigger:

  1. Single Server Action: uploadAndProcessMaterialsBatch() handles entire
  batch in one call
  2. Efficient Triggering: Uses tasks.batchTrigger() to process all
  materials in parallel
  3. Better Progress Tracking: Real-time batch status with completion
  counts
  4. Graceful Error Handling: Individual failures don't break entire batch
  5. Resource Optimization: Leverages Trigger.dev's batch processing
  capabilities

  Key Benefits:
  - UI makes 1 server action call instead of N calls
  - Background processing runs in parallel instead of sequential
  - Better user experience with batch progress tracking
  - Proper error isolation and reporting
  - Scales efficiently for larger batches (up to 500 materials per batch)