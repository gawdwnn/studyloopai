/**
 * PDF Processing Configuration Constants
 * Centralized configuration for PDF processing limits and settings
 */

// File size limits (in bytes)
export const PDF_PROCESSING_LIMITS = {
	// Maximum file size for PDF processing - should match frontend upload limit
	MAX_FILE_SIZE: 2 * 1024 * 1024, // 2MB - matches file-upload-dropzone.tsx

	// Minimum file size to be considered a valid PDF
	MIN_FILE_SIZE: 100, // 100 bytes

	// Maximum processing timeout
	MAX_PROCESSING_TIMEOUT: 30 * 1000, // 30 seconds

	// Text processing limits
	MAX_TEXT_LENGTH: 500 * 1000, // 500KB of text content

	// Chunking configuration
	CHUNK_SIZE: 1000, // characters per chunk
	CHUNK_OVERLAP: 200, // character overlap between chunks
} as const;

// PDF validation constants
export const PDF_VALIDATION = {
	// PDF file header
	PDF_HEADER: "%PDF-",

	// PDF file footer
	PDF_FOOTER: "%%EOF",
} as const;

// Processing options defaults
export const PDF_PROCESSING_DEFAULTS = {
	// Enable text cleaning by default
	CLEAN_TEXT: true,

	// Preserve page breaks in extracted text
	PRESERVE_PAGE_BREAKS: false,

	// Extract text page by page
	EXTRACT_PAGEWISE: false,

	// Default timeout for processing
	TIMEOUT: PDF_PROCESSING_LIMITS.MAX_PROCESSING_TIMEOUT,
} as const;

// Error messages
export const PDF_ERROR_MESSAGES = {
	FILE_TOO_SMALL: `PDF file is too small (minimum ${PDF_PROCESSING_LIMITS.MIN_FILE_SIZE} bytes)`,
	FILE_TOO_LARGE: `PDF file is too large (maximum ${PDF_PROCESSING_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB)`,
	INVALID_HEADER: "File does not appear to be a valid PDF",
	CORRUPTED_FILE: "PDF file appears to be corrupted or incomplete",
	NO_TEXT_CONTENT: "No text content could be extracted from the PDF",
	PROCESSING_TIMEOUT: "PDF processing timed out",
	PROCESSING_FAILED: "PDF processing failed",
} as const;
