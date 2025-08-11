import { getMistralModel } from "@/lib/ai/config";
import { logger } from "@/lib/utils/logger";
import { generateText } from "ai";
import type { OCROptions, OCRResult } from "../types";

export async function processDocumentWithVision(
	buffer: Buffer,
	mimeType: string,
	options: OCROptions = {}
): Promise<OCRResult> {
	try {
		// Use Mistral model for OCR document processing with hierarchy fallback
		// Default to cost-effective model but allow override
		const { model, modelName, provider } = getMistralModel(
			options.preferredModel || "mistral-small-latest"
		);
		const base64Data = buffer.toString("base64");
		const dataUrl = `data:${mimeType};base64,${base64Data}`;

		// Use AI SDK generateText with retry handling and timeout
		// Note: includeImageBase64 is always false for OCR - we only need extracted text
		const result = await generateText({
			model,
			system:
				"You are a document text extraction assistant. Extract all text content from documents accurately, preserving structure and formatting. Return only the extracted text without any additional explanations or formatting.",
			messages: [
				{
					role: "user",
					content: [
						{
							type: "text",
							text: "Extract all text content from this document. Return only the extracted text without any additional formatting or explanations.",
						},
						{
							type: "image",
							image: dataUrl,
						},
					],
				},
			],
			maxOutputTokens: options.maxOutputTokens || 8000,
			temperature: 0, // Deterministic for OCR
			maxRetries: options.maxRetries || 3, // AI SDK handles retries with exponential backoff
			abortSignal: AbortSignal.timeout(120000), // 2 minute timeout for OCR processing
		});

		const extractedText = result.text.trim();

		if (!extractedText || extractedText.length < 10) {
			throw new Error(
				"No meaningful text content returned from OCR processing"
			);
		}

		return {
			text: extractedText,
			metadata: {
				provider,
				model: modelName,
				usage: result.usage,
				finishReason: result.finishReason,
			},
		};
	} catch (error) {
		logger.error("Mistral OCR processing failed", {
			error: error instanceof Error ? error.message : String(error),
			mimeType,
			bufferSize: buffer.length,
		});

		throw new Error(
			`OCR processing failed: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}
