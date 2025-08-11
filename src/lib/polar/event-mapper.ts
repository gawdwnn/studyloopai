/**
 * Event mapping utilities for converting analytics events to Polar format
 * Maps existing content generation events to Polar usage events
 */

export interface PolarEventData {
	name: string;
	metadata: Record<string, any>;
}

/**
 * Map file upload event to Polar format
 */
export function mapUploadEventToPolar(properties: {
	fileSize?: number;
	fileSizeMB?: number;
	mimeType?: string;
	fileName?: string;
	processingTime?: number;
	success?: boolean;
	materialId?: string;
	courseId?: string;
	[key: string]: any;
}): PolarEventData {
	return {
		name: "file_upload",
		metadata: {
			file_size_mb:
				properties.fileSizeMB ||
				(properties.fileSize ? properties.fileSize / (1024 * 1024) : 0),
			file_size_bytes: properties.fileSize || 0,
			mime_type: properties.mimeType || "application/pdf",
			file_name: properties.fileName,
			processing_time_ms: properties.processingTime || 0,
			success: properties.success !== false,
			material_id: properties.materialId,
			course_id: properties.courseId,
		},
	};
}
