import { DOCUMENT_PROCESSING_CONFIG, detectDocumentType } from "@/lib/config/document-processing";
import { logger } from "@/lib/utils/logger";
import type { ProcessorStrategy } from "./strategies/base-strategy";
import { OCRPDFStrategy } from "./strategies/ocr-pdf-strategy";
import { OfficeStrategy } from "./strategies/office-strategy";
import { PDFStrategy } from "./strategies/pdf-strategy";
import { TextStrategy } from "./strategies/text-strategy";
import type { DocumentProcessor, Environment } from "./types";

// Strategy adapter to make ProcessorStrategy compatible with DocumentProcessor
const createDocumentProcessorFromStrategy = (
	strategy: ProcessorStrategy
): DocumentProcessor => {
	return {
		canProcess: strategy.canProcess,
		process: strategy.process,
	};
};

// Main factory function for selecting document processors
export async function getDocumentProcessor(
    mimeType: string,
    environment: Environment,
    userId: string,
    _fileSize: number
): Promise<DocumentProcessor> {
	try {
		// Log processor selection for debugging
        logger.info("Selecting document processor", {
			mimeType,
			environment,
			userId,
		});

		// Determine document type
		const documentType = detectDocumentType({ mimeType });

		// Route based on document type
		switch (documentType) {
            case "pdf": {
                // Requirement: 3.1 PDF is used in development for now
                if (DOCUMENT_PROCESSING_CONFIG.ENVIRONMENT.isDevelopment) {
                    logger.info("Using basic PDF strategy (development mode)", { userId });
                    return createDocumentProcessorFromStrategy(PDFStrategy);
                }
                // In production we use OCR by default. OCR access is governed by quota, not plan gating here.
                logger.info("Using OCR PDF strategy (production mode)", { userId });
                return createDocumentProcessorFromStrategy(OCRPDFStrategy);
            }

			case "office": {
                logger.info("Using office document processing strategy", { mimeType, userId });
				return createDocumentProcessorFromStrategy(OfficeStrategy);
			}

			case "text": {
                logger.info("Using text document processing strategy", { mimeType, userId });
				return createDocumentProcessorFromStrategy(TextStrategy);
			}

			default: {
				logger.error(
					"Unsupported document type - this should not happen if upload validation is working correctly",
					{
						documentType,
						mimeType,
						userId,
					}
				);
				throw new Error(
					`Unsupported document type '${documentType}' for file with MIME type '${mimeType}'. This indicates a validation bypass.`
				);
			}
		}
	} catch (error) {
		logger.error("Failed to select document processor", {
			error: error instanceof Error ? error.message : String(error),
			userId,
			mimeType,
		});

		throw error;
	}
}
