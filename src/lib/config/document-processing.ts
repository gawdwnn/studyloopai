/**
 * Document Processing Configuration - Consolidated
 * Single source of truth for all document processing settings
 */
import type { UserPlan } from "@/lib/processing/types";
export type { UserPlan };

export interface DocumentTypeConfig {
	mimeTypes: string[];
	extensions: string[];
	enabled: boolean;
}

export interface PlanLimits {
	supportedTypes: string[];
}

export const DOCUMENT_PROCESSING_CONFIG = {
	SUPPORTED_TYPES: {
		PDF: {
			mimeTypes: ["application/pdf", "application/x-pdf"],
			extensions: [".pdf"],
			enabled: true,
		},

		OFFICE: {
			mimeTypes: [
				// Microsoft Office formats
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
				"application/msword", // .doc
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
				"application/vnd.ms-excel", // .xls
				"application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
				"application/vnd.ms-powerpoint", // .ppt
				// OpenDocument formats
				"application/vnd.oasis.opendocument.text", // .odt
				"application/vnd.oasis.opendocument.spreadsheet", // .ods
				"application/vnd.oasis.opendocument.presentation", // .odp
				// Legacy formats
				"application/rtf", // .rtf
			],
			extensions: [
				".docx",
				".doc",
				".xlsx",
				".xls",
				".pptx",
				".ppt",
				".odt",
				".ods",
				".odp",
				".rtf",
			],
			enabled: true,
		},

		TEXT: {
			mimeTypes: ["text/plain", "text/markdown", "text/csv"],
			extensions: [".txt", ".md", ".csv"],
			enabled: true,
		},
	} as const,

	// Processing configuration moved closer to usage (chunking now defined in trigger file)

	// Upload configuration
	UPLOAD: {
		maxBatchSize: 10, // Maximum files per upload batch
		// Global max file size in bytes. Validation must happen in UI and API.
		// Background jobs must not perform file size validation.
		maxFileSizeBytes: Number.parseInt(
			process.env.NEXT_PUBLIC_UPLOAD_MAX_BYTES || "10485760"
		), // default 10MB
	} as const,

	// Environment configuration
	ENVIRONMENT: {
		// Safe on both client and server (Next.js inlines NODE_ENV at build time)
		isDevelopment: process.env.NODE_ENV === "development",
		ocrDebug: false, // use this to enable testing ocr in development
	} as const,
} as const;

// Content type constants for UI display (backward compatibility)
export const CONTENT_TYPES = {
	PDF: "pdf",
	OFFICE: "office",
	TEXT: "text",
	// Legacy types (for existing data)
	VIDEO: "video",
	AUDIO: "audio",
	IMAGE: "image",
	WEBLINK: "weblink",
	TRANSCRIPT: "transcript",
} as const;

export const CONTENT_TYPE_LABELS = {
	[CONTENT_TYPES.PDF]: "PDF Document",
	[CONTENT_TYPES.OFFICE]: "Office Document",
	[CONTENT_TYPES.TEXT]: "Text File",
	// Legacy labels (for existing data)
	[CONTENT_TYPES.VIDEO]: "Video",
	[CONTENT_TYPES.AUDIO]: "Audio",
	[CONTENT_TYPES.IMAGE]: "Image",
	[CONTENT_TYPES.WEBLINK]: "Web Link",
	[CONTENT_TYPES.TRANSCRIPT]: "Transcript",
} as const;

export const CONTENT_TYPE_ICONS = {
	[CONTENT_TYPES.PDF]: "FileText",
	[CONTENT_TYPES.OFFICE]: "FileText",
	[CONTENT_TYPES.TEXT]: "FileText",
	// Legacy icons (for existing data)
	[CONTENT_TYPES.VIDEO]: "Video",
	[CONTENT_TYPES.AUDIO]: "AudioLines",
	[CONTENT_TYPES.IMAGE]: "Image",
	[CONTENT_TYPES.WEBLINK]: "Link",
	[CONTENT_TYPES.TRANSCRIPT]: "FileText",
} as const;

// Helper functions for plan-aware configuration

/**
 * Get document processing limits for a specific user plan
 */
export function getDocumentLimits(_userPlan: UserPlan): PlanLimits {
	const supportedTypes: string[] = [];

	for (const [typeName, config] of Object.entries(
		DOCUMENT_PROCESSING_CONFIG.SUPPORTED_TYPES
	)) {
		if (config.enabled) {
			supportedTypes.push(typeName);
		}
	}

	return {
		supportedTypes,
	};
}

/**
 * Get supported file types (MIME type mapping) for a user plan
 */
export function getSupportedFileTypes(
	_userPlan: UserPlan
): Record<string, string[]> {
	const supportedTypes: Record<string, string[]> = {};

	for (const [_, config] of Object.entries(
		DOCUMENT_PROCESSING_CONFIG.SUPPORTED_TYPES
	)) {
		if (config.enabled) {
			for (const mimeType of config.mimeTypes) {
				supportedTypes[mimeType] = [...config.extensions];
			}
		}
	}

	return supportedTypes;
}

/**
 * Generate dropzone description text for user plan
 */
export function getDropzoneDescription(_userPlan?: UserPlan): string {
	const typeNames: string[] = [];

	for (const [typeName, config] of Object.entries(
		DOCUMENT_PROCESSING_CONFIG.SUPPORTED_TYPES
	)) {
		if (config.enabled) {
			switch (typeName) {
				case "PDF":
					typeNames.push("PDF");
					break;
				case "OFFICE":
					typeNames.push("Word, Excel, PowerPoint");
					break;
				case "TEXT":
					typeNames.push("Text, CSV, Markdown");
					break;
			}
		}
	}

	return typeNames.join(", ");
}

/**
 * Get all supported extensions for a user plan
 */
export function getSupportedExtensions(_userPlan: UserPlan): string[] {
	const extensions: string[] = [];

	for (const config of Object.values(
		DOCUMENT_PROCESSING_CONFIG.SUPPORTED_TYPES
	)) {
		if (config.enabled) {
			extensions.push(...config.extensions);
		}
	}

	return Array.from(new Set(extensions)); // Remove duplicates
}

/**
 * Plan-agnostic helpers for API routes and server code
 */
export function getAllSupportedMimeTypes(): readonly string[] {
	return Object.values(DOCUMENT_PROCESSING_CONFIG.SUPPORTED_TYPES).flatMap(
		(c) => c.mimeTypes
	);
}

export function getAllSupportedExtensions(): readonly string[] {
	return Object.values(DOCUMENT_PROCESSING_CONFIG.SUPPORTED_TYPES).flatMap(
		(c) => c.extensions
	);
}

/**
 * Validate file against user plan limits
 */
export function validateFile(
	file: File,
	userPlan: UserPlan
): { isValid: boolean; error?: string } {
	const supportedTypes = getSupportedFileTypes(userPlan);
	const supportedExtensions = getSupportedExtensions(userPlan);
	const maxBytes = DOCUMENT_PROCESSING_CONFIG.UPLOAD.maxFileSizeBytes;

	// Prefer MIME type validation when available
	if (file.type && supportedTypes[file.type]) {
		// ok
	} else {
		// Fallback to extension-based validation when MIME is missing or unrecognized
		const fileName = file.name as string | undefined;
		if (!fileName) {
			return {
				isValid: false,
				error: `File type not supported. Supported types: ${supportedExtensions.join(", ")}`,
			};
		}

		const lower = fileName.toLowerCase();
		const hasSupportedExt = supportedExtensions.some((ext) =>
			lower.endsWith(ext)
		);
		if (!hasSupportedExt) {
			return {
				isValid: false,
				error: `File type not supported. Supported types: ${supportedExtensions.join(", ")}`,
			};
		}
	}

	// Check for zero-byte files
	if (file.size === 0) {
		return {
			isValid: false,
			error: "File is empty",
		};
	}

	// Enforce max file size (plan-agnostic for now)
	if (file.size > maxBytes) {
		const mb = (maxBytes / (1024 * 1024)).toFixed(1);
		return {
			isValid: false,
			error: `File is too large. Maximum allowed size is ${mb} MB`,
		};
	}

	return { isValid: true };
}

/**
 * Determine document content type from provided MIME type and/or filename.
 * Prioritizes exact MIME matches, falls back to extension lookup, then defaults to 'pdf'.
 */
export function detectDocumentType(params: {
	mimeType?: string;
	fileName?: string;
}): string {
	const { mimeType, fileName } = params;

	if (mimeType) {
		for (const [typeName, config] of Object.entries(
			DOCUMENT_PROCESSING_CONFIG.SUPPORTED_TYPES
		)) {
			if ((config.mimeTypes as readonly string[]).includes(mimeType)) {
				return typeName.toLowerCase();
			}
		}
	}

	if (fileName) {
		const ext = fileName.toLowerCase().split(".").pop();
		if (ext) {
			for (const [typeName, config] of Object.entries(
				DOCUMENT_PROCESSING_CONFIG.SUPPORTED_TYPES
			)) {
				if ((config.extensions as readonly string[]).includes(`.${ext}`)) {
					return typeName.toLowerCase();
				}
			}
		}
	}

	// No match found: throw explicit error with supported extensions
	const supportedExtensions = Array.from(
		new Set(
			Object.values(DOCUMENT_PROCESSING_CONFIG.SUPPORTED_TYPES).flatMap(
				(c) => c.extensions
			)
		)
	);
	throw new Error(
		PROCESSING_ERROR_MESSAGES.UNSUPPORTED_TYPE(supportedExtensions.join(", "))
	);
}

// Error messages
export const PROCESSING_ERROR_MESSAGES = {
	UNSUPPORTED_TYPE: (supportedTypes: string) =>
		`File type not supported. Supported types: ${supportedTypes}`,
	FILE_EMPTY: "File is empty and cannot be processed.",
	PROCESSING_FAILED: "Document processing failed. Please try again.",
} as const;
