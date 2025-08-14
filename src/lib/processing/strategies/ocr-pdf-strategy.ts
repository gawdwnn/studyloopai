import { createHash } from "node:crypto";
import { env } from "@/env";
import {
	cacheOCRResult,
	generateOCRCacheKey,
	getCachedOCRResult,
} from "@/lib/cache";
import { DOCUMENT_PROCESSING_CONFIG } from "@/lib/config/document-processing";
import { logger } from "@/lib/utils/logger";
import { Mistral } from "@mistralai/mistralai";
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
		const apiKey = env.MISTRAL_API_KEY;
		if (!apiKey) {
			throw new Error(
				"MISTRAL_API_KEY environment variable is required for OCR processing"
			);
		}

		const client = new Mistral({ apiKey });
		const base64Data = buffer.toString("base64");

		const ocrResponse = await client.ocr.process({
			model: "mistral-ocr-latest",
			document: {
				type: "document_url",
				documentUrl: `data:application/pdf;base64,${base64Data}`,
			},
			includeImageBase64: true,
		});

		// console.log("OCR Response:", JSON.stringify(ocrResponse, null, 2));

		// Extract text from pages
		let text = "";
		if (ocrResponse?.pages && Array.isArray(ocrResponse.pages)) {
			text = ocrResponse.pages
				.map((page: { markdown?: string }) => page.markdown || "")
				.filter((pageText: string) => pageText.trim())
				.join("\n\n");
		}

		text = text.trim();
		if (!text || text.length < 10) {
			throw new Error(
				`OCR extracted insufficient text content (${text.length} characters). Document may be empty, corrupted, or contain only images without text.`
			);
		}

		// Cache successful OCR result
		await cacheOCRResult(text, cacheKey);

		return createProcessingResult(strategyName, true, text, "ocr", undefined, [
			"OCR processing completed successfully",
		]);
	} catch (ocrError) {
		const errorMessage =
			ocrError instanceof Error ? ocrError.message : String(ocrError);

		console.error("OCR processing failed:", errorMessage);

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
