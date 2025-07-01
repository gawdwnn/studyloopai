import {
	PDF_ERROR_MESSAGES,
	PDF_PROCESSING_DEFAULTS,
	PDF_PROCESSING_LIMITS,
	PDF_VALIDATION,
} from "@/lib/constants/pdf-processing";
import { extractText } from "unpdf";

// Lazy load PDF.js only when needed to avoid DOM issues
let pdfjsLib: any = null;

async function loadPDFJS() {
	if (!pdfjsLib) {
		// Use legacy build for Node.js compatibility
		pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
		// Disable worker in Node.js environment
		if (typeof window === "undefined") {
			pdfjsLib.GlobalWorkerOptions.workerSrc = "";
		}
	}
	return pdfjsLib;
}

/**
 * PDF Parser for StudyLoop AI
 * Uses unpdf for serverless-compatible PDF text extraction
 */

export interface PDFParseResult {
	success: boolean;
	text?: string;
	metadata?: {
		pageCount?: number;
		processingTime?: number;
		extractionMethod?: "unpdf" | "pdfjs";
	};
	error?: string;
}

export interface PDFParseOptions {
	cleanText?: boolean;
	preservePageBreaks?: boolean;
	timeout?: number; // milliseconds
}

/**
 * Extract text using PDF.js (fallback method with better font handling)
 */
async function extractWithPDFJS(buffer: Buffer): Promise<PDFParseResult> {
	try {
		const pdfLib = await loadPDFJS();
		const uint8Array = new Uint8Array(buffer);
		const pdf = await pdfLib.getDocument({ data: uint8Array }).promise;

		let fullText = "";
		const totalPages = pdf.numPages;

		for (let i = 1; i <= totalPages; i++) {
			const page = await pdf.getPage(i);
			const textContent = await page.getTextContent();
			const pageText = textContent.items
				.filter((item: any) => item.str) // Filter out non-text items
				.map((item: any) => item.str)
				.join(" ");
			fullText += `${pageText} `;
		}

		return {
			success: true,
			text: fullText.trim(),
			metadata: {
				pageCount: totalPages,
				processingTime: 0, // Will be set by caller
			},
		};
	} catch (error) {
		throw new Error(
			`PDF.js extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`
		);
	}
}

/**
 * Parse PDF buffer and extract text content
 */
export async function parsePDF(
	buffer: Buffer,
	options: PDFParseOptions = {}
): Promise<PDFParseResult> {
	const startTime = Date.now();

	try {
		// Validate buffer first
		const validation = validatePDFBuffer(buffer);
		if (!validation.isValid) {
			return {
				success: false,
				error: validation.error,
			};
		}

		const timeout = options.timeout ?? PDF_PROCESSING_DEFAULTS.TIMEOUT;

		// Strategy 1: Try unpdf first (fastest, serverless-friendly)
		try {
			const uint8Array = new Uint8Array(buffer);
			const extractionPromise = extractText(uint8Array);

			const result = await Promise.race([
				extractionPromise,
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error(PDF_ERROR_MESSAGES.PROCESSING_TIMEOUT)), timeout)
				),
			]);

			let text = Array.isArray(result.text) ? result.text.join(" ") : result.text;

			if (text && text.trim().length > 0) {
				// Success with unpdf
				const shouldCleanText = options.cleanText ?? PDF_PROCESSING_DEFAULTS.CLEAN_TEXT;
				const shouldPreservePageBreaks =
					options.preservePageBreaks ?? PDF_PROCESSING_DEFAULTS.PRESERVE_PAGE_BREAKS;

				if (shouldPreservePageBreaks) {
					text = text.replace(/\f/g, "\n--- PAGE BREAK ---\n");
				}

				if (shouldCleanText) {
					text = cleanPDFText(text);
				}

				const processingTime = Date.now() - startTime;

				return {
					success: true,
					text,
					metadata: {
						pageCount: result.totalPages,
						processingTime,
						extractionMethod: "unpdf",
					},
				};
			}
		} catch (unpdfError) {
			console.warn(
				"unpdf extraction failed:",
				unpdfError instanceof Error ? unpdfError.message : "Unknown error"
			);
		}

		// Strategy 2: Fallback to PDF.js (better font handling)
		try {
			const pdfJsResult = await Promise.race([
				extractWithPDFJS(buffer),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error(PDF_ERROR_MESSAGES.PROCESSING_TIMEOUT)), timeout)
				),
			]);

			if (pdfJsResult.text && pdfJsResult.text.trim().length > 0) {
				let text = pdfJsResult.text;

				// Apply text processing options
				const shouldCleanText = options.cleanText ?? PDF_PROCESSING_DEFAULTS.CLEAN_TEXT;
				const shouldPreservePageBreaks =
					options.preservePageBreaks ?? PDF_PROCESSING_DEFAULTS.PRESERVE_PAGE_BREAKS;

				if (shouldPreservePageBreaks) {
					text = text.replace(/\f/g, "\n--- PAGE BREAK ---\n");
				}

				if (shouldCleanText) {
					text = cleanPDFText(text);
				}

				const processingTime = Date.now() - startTime;

				return {
					success: true,
					text,
					metadata: {
						pageCount: pdfJsResult.metadata?.pageCount,
						processingTime,
						extractionMethod: "pdfjs",
					},
				};
			}
		} catch (pdfJsError) {
			console.warn(
				"PDF.js extraction failed:",
				pdfJsError instanceof Error ? pdfJsError.message : "Unknown error"
			);
		}

		// All extraction methods failed
		return {
			success: false,
			error: PDF_ERROR_MESSAGES.NO_TEXT_CONTENT,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown PDF parsing error",
		};
	}
}

/**
 * Enhanced text cleaning for PDF content
 */
function cleanPDFText(text: string): string {
	return text
		.replace(/(\w)-\n(\w)/g, "$1$2") // Fix hyphenated words across lines
		.replace(/\f/g, "\n") // Convert form feeds to newlines
		.replace(/•/g, "*") // Normalize bullet points
		.replace(/\s*\n\s*/g, " ") // Normalize line breaks to spaces
		.replace(/\s{2,}/g, " ") // Collapse multiple spaces
		.replace(/^\s+|\s+$/gm, "") // Trim each line
		.replace(/\n{3,}/g, "\n\n") // Limit consecutive newlines
		.trim();
}

/**
 * Validate PDF file before processing
 */
export function validatePDFBuffer(buffer: Buffer): { isValid: boolean; error?: string } {
	if (!buffer || buffer.length < PDF_PROCESSING_LIMITS.MIN_FILE_SIZE) {
		return { isValid: false, error: PDF_ERROR_MESSAGES.FILE_TOO_SMALL };
	}

	if (buffer.length > PDF_PROCESSING_LIMITS.MAX_FILE_SIZE) {
		return {
			isValid: false,
			error: PDF_ERROR_MESSAGES.FILE_TOO_LARGE,
		};
	}

	if (buffer.toString("utf8", 0, PDF_VALIDATION.PDF_HEADER.length) !== PDF_VALIDATION.PDF_HEADER) {
		return { isValid: false, error: PDF_ERROR_MESSAGES.INVALID_HEADER };
	}

	// Check for minimum PDF structure
	const bufferStr = buffer.toString("utf8");
	if (!bufferStr.includes(PDF_VALIDATION.PDF_FOOTER)) {
		return {
			isValid: false,
			error: PDF_ERROR_MESSAGES.CORRUPTED_FILE,
		};
	}

	return { isValid: true };
}
