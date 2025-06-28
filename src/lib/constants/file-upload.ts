/**
 * File Upload Configuration Constants
 * Centralized configuration for file upload limits and settings
 */

// File size limits (in bytes) - should match backend PDF processing limits
export const FILE_UPLOAD_LIMITS = {
  // Maximum file size for uploads
  MAX_FILE_SIZE: 2 * 1024 * 1024, // 2MB
  
  // Accepted file types
  ACCEPTED_FILE_TYPES: {
    "application/pdf": [".pdf"]
  } as Record<string, string[]>,
} as const;

// Display constants
export const FILE_UPLOAD_DISPLAY = {
  // User-facing size limit text
  MAX_SIZE_TEXT: `${FILE_UPLOAD_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB`,
  
  // Dropzone text
  DROPZONE_TEXT: "PDF (max. 2MB)",
  
  // Error messages
  FILE_TOO_LARGE: `File is too large. Max size is ${FILE_UPLOAD_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB.`,
} as const;