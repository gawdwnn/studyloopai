import {
	type QualityValidationOptions,
	isQualityAcceptable,
	validateContentQuality,
} from "./quality-validator";

export interface QualityValidationResult<T = Record<string, unknown>> {
	validContent: T[];
	rejectedCount: number;
	averageQuality: number;
	issues: string[];
}

/**
 * Validate and filter content based on quality metrics
 */
export async function validateAndFilterContent<T extends Record<string, unknown>>(
	content: T[],
	contentType: "goldenNotes" | "cuecards" | "mcqs" | "openQuestions" | "summaries",
	config: { difficulty?: string; subject?: string } = {}
): Promise<QualityValidationResult<T>> {
	if (content.length === 0) {
		return {
			validContent: [],
			rejectedCount: 0,
			averageQuality: 0,
			issues: ["No content to validate"],
		};
	}

	const qualityOptions: QualityValidationOptions = {
		gradeLevel: mapDifficultyToGradeLevel(config.difficulty),
		subject: config.subject,
		timeout: 15000,
	};

	// Validate each piece of content
	const validationPromises = content.map(async (item, index) => {
		const contentText = formatContentForValidation(item, contentType);
		const quality = await validateContentQuality(contentText, contentType, qualityOptions);
		return { item, quality, index };
	});

	const results = await Promise.all(validationPromises);

	// Filter based on quality thresholds
	const validItems: T[] = [];
	const issues: string[] = [];
	let totalQuality = 0;
	let rejectedCount = 0;

	for (const { item, quality, index } of results) {
		const { acceptable, reason } = isQualityAcceptable(quality);

		if (acceptable) {
			validItems.push(item);
			totalQuality += quality.overallQuality;
		} else {
			rejectedCount++;
			issues.push(`Item ${index + 1}: ${reason} (Score: ${quality.overallQuality})`);

			// Log quality feedback for debugging
			if (quality.feedback.length > 0) {
				console.warn(`Quality issues for ${contentType} item ${index + 1}:`, quality.feedback);
			}
		}
	}

	const averageQuality = validItems.length > 0 ? totalQuality / validItems.length : 0;

	return {
		validContent: validItems,
		rejectedCount,
		averageQuality: Math.round(averageQuality),
		issues,
	};
}

/**
 * Format content for quality validation based on content type
 */
function formatContentForValidation(item: Record<string, unknown>, contentType: string): string {
	switch (contentType) {
		case "goldenNotes": {
			return `Title: ${String(item.title)}\nContent: ${String(item.content)}`;
		}
		case "cuecards": {
			return `Question: ${String(item.question)}\nAnswer: ${String(item.answer)}`;
		}
		case "mcqs": {
			interface MCQItem {
				optionA?: unknown;
				optionB?: unknown;
				optionC?: unknown;
				optionD?: unknown;
				correctAnswer?: unknown;
				explanation?: unknown;
				question?: unknown;
			}
			const mcq = item as MCQItem;
			const formattedOptions = [mcq.optionA, mcq.optionB, mcq.optionC, mcq.optionD]
				.filter(Boolean)
				.map((opt: unknown, i: number) => `${String.fromCharCode(65 + i)}) ${String(opt)}`)
				.join("\n");
			return `Question: ${String(mcq.question)}\nOptions:\n${formattedOptions}\nCorrect Answer: ${String(mcq.correctAnswer)}\nExplanation: ${String(mcq.explanation)}`;
		}
		case "openQuestions": {
			interface OpenQuestionItem {
				question?: unknown;
				sampleAnswer?: unknown;
				gradingRubric?: {
					criteria?: { criterion: string; description: string }[];
				};
			}
			const oq = item as OpenQuestionItem;
			const criteria = oq.gradingRubric?.criteria as
				| { criterion: string; description: string }[]
				| undefined;
			const rubricText = criteria
				? criteria.map((c) => `- ${c.criterion}: ${c.description}`).join("\n")
				: "";
			return `Question: ${String(oq.question)}\nSample Answer: ${String(oq.sampleAnswer)}\nRubric:\n${rubricText}`;
		}
		case "summaries": {
			return `Title: ${String(item.title)}\nContent: ${String(item.content)}`;
		}
		default: {
			return JSON.stringify(item);
		}
	}
}

/**
 * Map difficulty levels to grade levels for quality assessment
 */
function mapDifficultyToGradeLevel(difficulty?: string): QualityValidationOptions["gradeLevel"] {
	switch (difficulty) {
		case "beginner":
			return "elementary";
		case "intermediate":
			return "middle";
		case "advanced":
			return "college";
		default:
			return "college";
	}
}

/**
 * Generate quality report for content generation results
 */
export function generateQualityReport(results: QualityValidationResult[]): string {
	const totalItems = results.reduce((sum, r) => sum + r.validContent.length + r.rejectedCount, 0);
	const totalRejected = results.reduce((sum, r) => sum + r.rejectedCount, 0);
	const avgQuality = results.reduce((sum, r) => sum + r.averageQuality, 0) / results.length;

	const successRate = (((totalItems - totalRejected) / totalItems) * 100).toFixed(1);

	return `Quality Report: ${totalItems - totalRejected}/${totalItems} items passed (${successRate}%), Average Quality: ${avgQuality.toFixed(1)}`;
}

/**
 * Check if regeneration is needed based on quality results
 */
export function shouldRegenerateContent<T>(
	result: QualityValidationResult<T>,
	minSuccessRate = 0.7
): { shouldRegenerate: boolean; reason?: string } {
	const totalItems = result.validContent.length + result.rejectedCount;
	const successRate = result.validContent.length / totalItems;

	if (successRate < minSuccessRate) {
		return {
			shouldRegenerate: true,
			reason: `Success rate ${(successRate * 100).toFixed(1)}% below threshold ${
				minSuccessRate * 100
			}%`,
		};
	}

	if (result.averageQuality < 60) {
		return {
			shouldRegenerate: true,
			reason: `Average quality ${result.averageQuality} below acceptable threshold`,
		};
	}

	return { shouldRegenerate: false };
}
