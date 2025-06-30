/**
 * File Upload Configuration Constants
 * Centralized configuration for file upload limits and settings
 */

// Content types supported by the platform
export const CONTENT_TYPES = {
  PDF: 'pdf',
  VIDEO: 'video',
  AUDIO: 'audio', 
  IMAGE: 'image',
  WEBLINK: 'weblink',
  TRANSCRIPT: 'transcript'
} as const;

export type ContentType = typeof CONTENT_TYPES[keyof typeof CONTENT_TYPES];

// File size limits (in bytes) - should match backend PDF processing limits
export const FILE_UPLOAD_LIMITS = {
  // Maximum file size for uploads
  MAX_FILE_SIZE: 2 * 1024 * 1024, // 2MB
  
  // V1: PDF only
  ACCEPTED_FILE_TYPES: {
    "application/pdf": [".pdf"]
  } as Record<string, string[]>,
  
  // Future: All supported types
  ACCEPTED_FILE_TYPES_FUTURE: {
    "application/pdf": [".pdf"],
    "video/mp4": [".mp4"],
    "video/avi": [".avi"], 
    "video/mov": [".mov"],
    "audio/mp3": [".mp3"],
    "audio/wav": [".wav"],
    "audio/m4a": [".m4a"],
    "image/png": [".png"],
    "image/jpg": [".jpg"],
    "image/jpeg": [".jpeg"],
    "text/plain": [".txt"],
    "text/html": [".html"]
  } as Record<string, string[]>,
} as const;

// Content type detection helpers
export const getContentTypeFromMime = (mimeType: string): ContentType => {
  if (mimeType.includes('pdf')) return CONTENT_TYPES.PDF;
  if (mimeType.includes('video')) return CONTENT_TYPES.VIDEO;
  if (mimeType.includes('audio')) return CONTENT_TYPES.AUDIO;
  if (mimeType.includes('image')) return CONTENT_TYPES.IMAGE;
  return CONTENT_TYPES.PDF; // Default fallback
};

export const getContentTypeFromFilename = (filename: string): ContentType => {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'pdf': return CONTENT_TYPES.PDF;
    case 'mp4':
    case 'avi':
    case 'mov': return CONTENT_TYPES.VIDEO;
    case 'mp3':
    case 'wav':
    case 'm4a': return CONTENT_TYPES.AUDIO;
    case 'png':
    case 'jpg':
    case 'jpeg': return CONTENT_TYPES.IMAGE;
    default: return CONTENT_TYPES.PDF;
  }
};

// Display constants
export const FILE_UPLOAD_DISPLAY = {
  // User-facing size limit text
  MAX_SIZE_TEXT: `${FILE_UPLOAD_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB`,
  
  // Dropzone text
  DROPZONE_TEXT: "PDF (max. 2MB)",
  
  // Error messages
  FILE_TOO_LARGE: `File is too large. Max size is ${FILE_UPLOAD_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB.`,
} as const;

// Content type display helpers
export const CONTENT_TYPE_LABELS = {
  [CONTENT_TYPES.PDF]: 'PDF Document',
  [CONTENT_TYPES.VIDEO]: 'Video',
  [CONTENT_TYPES.AUDIO]: 'Audio',
  [CONTENT_TYPES.IMAGE]: 'Image',
  [CONTENT_TYPES.WEBLINK]: 'Web Link',
  [CONTENT_TYPES.TRANSCRIPT]: 'Transcript'
} as const;

export const CONTENT_TYPE_ICONS = {
  [CONTENT_TYPES.PDF]: 'FileText',
  [CONTENT_TYPES.VIDEO]: 'Video',
  [CONTENT_TYPES.AUDIO]: 'AudioLines',
  [CONTENT_TYPES.IMAGE]: 'Image',
  [CONTENT_TYPES.WEBLINK]: 'Link',
  [CONTENT_TYPES.TRANSCRIPT]: 'FileText'
} as const;