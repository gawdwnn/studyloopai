import { createHash } from "node:crypto";
import {
	cacheOCRResult,
	generateOCRCacheKey,
	getCachedOCRResult,
} from "@/lib/cache";
import { DOCUMENT_PROCESSING_CONFIG } from "@/lib/config/document-processing";
import { logger } from "@/lib/utils/logger";
import { processDocumentWithVision } from "../ocr/mistral-client";
import type { ProcessingOptions, ProcessingResult } from "../types";
import {
	type ProcessorStrategy,
	createMimeTypeCanProcess,
	createProcessingResult,
} from "./base-strategy";

const process = async (
	buffer: Buffer,
	options: ProcessingOptions
): Promise<ProcessingResult> => {
	const strategyName = "pdf-ocr";
	// Generate cache key based on file content
	const fileHash = createHash("sha256").update(buffer).digest("hex");
	const cacheKey = generateOCRCacheKey(fileHash, "mistral");

	// Check cache first
	const cachedResult = await getCachedOCRResult(cacheKey);
	if (cachedResult) {
		logger.info("OCR result found in cache", {
			textLength: cachedResult.length,
			materialId: options.materialId,
		});

		return createProcessingResult(
			strategyName,
			true,
			cachedResult,
			"cache",
			undefined,
			["OCR result retrieved from cache"]
		);
	}

	try {
		// Perform OCR using Mistral (defaults to small model for cost efficiency)
		const ocrResult = await processDocumentWithVision(
			buffer,
			"application/pdf"
		);

		// Cache successful OCR result
		await cacheOCRResult(ocrResult.text, cacheKey);

		logger.info("OCR processing completed successfully", {
			textLength: ocrResult.text.length,
			materialId: options.materialId,
		});

		return createProcessingResult(
			strategyName,
			true,
			ocrResult.text,
			"ocr",
			undefined,
			["OCR processing completed successfully"]
		);
	} catch (ocrError) {
		const errorMessage =
			ocrError instanceof Error ? ocrError.message : String(ocrError);

		logger.error("OCR processing failed", {
			error: errorMessage,
			materialId: options.materialId,
		});

		return createProcessingResult(
			strategyName,
			false,
			"",
			"ocr",
			`OCR error: ${errorMessage}`
		);
	}
};

// Export the OCR PDF strategy
export const OCRPDFStrategy: ProcessorStrategy = {
	name: "pdf-ocr",
	canProcess: createMimeTypeCanProcess(
		DOCUMENT_PROCESSING_CONFIG.SUPPORTED_TYPES.PDF.mimeTypes
	),
	process: process,
};
