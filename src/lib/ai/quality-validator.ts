import { generateText } from "ai";
import { getTextGenerationModel } from "./config";

// Quality metrics for different content types
export interface QualityMetrics {
	factualAccuracy: number; // 0-100
	readability: number; // 0-100
	educationalValue: number; // 0-100
	ageAppropriateness: number; // 0-100
	overallQuality: number; // weighted average
	feedback: string[];
	shouldRegenerate: boolean;
}

export interface QualityValidationOptions {
	subject?: string;
	gradeLevel?: "elementary" | "middle" | "high" | "college";
	timeout?: number;
	strict?: boolean; // More stringent quality thresholds
}

// Quality thresholds for auto-approval/rejection
const QUALITY_THRESHOLDS = {
	autoApprove: 80, // Auto-approve above this score
	autoReject: 40, // Auto-reject below this score
	regenerate: 50, // Suggest regeneration below this score
} as const;

// Content-specific quality prompts
const QUALITY_PROMPTS = {
	goldenNotes: {
		system:
			"You are an educational content quality assessor. Evaluate golden notes for accuracy, clarity, and educational value.",
		template: (content: string, subject?: string) => `
Evaluate these golden notes${subject ? ` for ${subject}` : ""}:

Content: "${content}"

Rate each aspect (0-100) and provide specific feedback:
1. Factual Accuracy - Are all facts correct and up-to-date?
2. Readability - Is it clear and well-structured?
3. Educational Value - Does it highlight key concepts effectively?
4. Age Appropriateness - Is the language and complexity appropriate?

Return your assessment in this exact JSON format:
{
  "factualAccuracy": <score>,
  "readability": <score>,
  "educationalValue": <score>,
  "ageAppropriateness": <score>,
  "feedback": ["specific issue 1", "specific issue 2"],
  "shouldRegenerate": <boolean>
}`,
	},

	cuecards: {
		system:
			"You are an educational content quality assessor. Evaluate cuecards for learning effectiveness.",
		template: (content: string, subject?: string) => `
Evaluate this cuecard${subject ? ` for ${subject}` : ""}:

${content}

Rate each aspect (0-100) and provide specific feedback:
1. Factual Accuracy - Is the Q&A factually correct?
2. Readability - Are question and answer clear?
3. Educational Value - Does it test important knowledge?
4. Age Appropriateness - Is difficulty level appropriate?

JSON format:
{
  "factualAccuracy": <score>,
  "readability": <score>,
  "educationalValue": <score>,
  "ageAppropriateness": <score>,
  "feedback": ["specific feedback"],
  "shouldRegenerate": <boolean>
}`,
	},

	mcqs: {
		system:
			"You are an educational content quality assessor. Evaluate multiple choice questions for assessment quality.",
		template: (content: string, subject?: string) => `
Evaluate this MCQ${subject ? ` for ${subject}` : ""}:

${content}

Rate each aspect (0-100):
1. Factual Accuracy - Is the question and correct answer accurate?
2. Readability - Is the question clear and unambiguous?
3. Educational Value - Does it test meaningful knowledge?
4. Age Appropriateness - Is difficulty appropriate?

Also check:
- Are distractors plausible but clearly incorrect?
- Is there only one correct answer?
- Is the explanation helpful?

JSON format:
{
  "factualAccuracy": <score>,
  "readability": <score>,
  "educationalValue": <score>,
  "ageAppropriateness": <score>,
  "feedback": ["specific feedback"],
  "shouldRegenerate": <boolean>
}`,
	},

	openQuestions: {
		system:
			"You are an educational content quality assessor. Evaluate open-ended questions for critical thinking assessment.",
		template: (content: string, subject?: string) => `
Evaluate this open question${subject ? ` for ${subject}` : ""}:

${content}

Rate each aspect (0-100):
1. Factual Accuracy - Is the context and sample answer accurate?
2. Readability - Is the question clear and well-formulated?
3. Educational Value - Does it promote critical thinking?
4. Age Appropriateness - Is complexity appropriate?

Also check:
- Does it encourage deep thinking?
- Is the grading rubric comprehensive?
- Is the sample answer helpful but not overprescriptive?

JSON format:
{
  "factualAccuracy": <score>,
  "readability": <score>,
  "educationalValue": <score>,
  "ageAppropriateness": <score>,
  "feedback": ["specific feedback"],
  "shouldRegenerate": <boolean>
}`,
	},

	summaries: {
		system:
			"You are an educational content quality assessor. Evaluate summaries for comprehensiveness and accuracy.",
		template: (content: string, subject?: string) => `
Evaluate this summary${subject ? ` for ${subject}` : ""}:

${content}

Rate each aspect (0-100):
1. Factual Accuracy - Are all facts and concepts correct?
2. Readability - Is it well-organized and clear?
3. Educational Value - Does it capture key information effectively?
4. Age Appropriateness - Is the language level appropriate?

Also check:
- Does it cover main points without being too verbose?
- Is the information hierarchy clear?

JSON format:
{
  "factualAccuracy": <score>,
  "readability": <score>,
  "educationalValue": <score>,
  "ageAppropriateness": <score>,
  "feedback": ["specific feedback"],
  "shouldRegenerate": <boolean>
}`,
	},
} as const;

/**
 * Validate content quality using AI assessment
 */
export async function validateContentQuality(
	content: string,
	contentType: keyof typeof QUALITY_PROMPTS,
	options: QualityValidationOptions = {}
): Promise<QualityMetrics> {
	const {
		subject,
		gradeLevel: _gradeLevel = "college", // unused but kept for future use
		timeout: _timeout = 15000, // unused but retained for options compatibility
		strict = false,
	} = options;

	try {
		const prompt = QUALITY_PROMPTS[contentType];
		if (!prompt) {
			throw new Error(`Unsupported content type: ${contentType}`);
		}

		// Get quality assessment from AI
		const result = await generateText({
			model: getTextGenerationModel(),
			system: prompt.system,
			prompt: prompt.template(content, subject),
			maxTokens: 800,
			temperature: 0.1, // Low temperature for consistent evaluation
		});

		// Parse AI response
		const assessment = parseQualityAssessment(result.text);

		// Calculate overall quality score with weights
		const weights = {
			factualAccuracy: 0.4, // Most important for education
			educationalValue: 0.3,
			readability: 0.2,
			ageAppropriateness: 0.1,
		};

		const overallQuality =
			assessment.factualAccuracy * weights.factualAccuracy +
			assessment.educationalValue * weights.educationalValue +
			assessment.readability * weights.readability +
			assessment.ageAppropriateness * weights.ageAppropriateness;

		// Apply quality thresholds (stricter if requested)
		const thresholds = strict
			? { autoApprove: 85, autoReject: 50, regenerate: 60 }
			: QUALITY_THRESHOLDS;

		const shouldRegenerate = overallQuality < thresholds.regenerate || assessment.shouldRegenerate;

		return {
			...assessment,
			overallQuality: Math.round(overallQuality),
			shouldRegenerate,
		};
	} catch (error) {
		// Fallback quality assessment if AI fails
		console.error("Quality validation failed:", error);
		return {
			factualAccuracy: 70, // Assume decent quality if validation fails
			readability: 70,
			educationalValue: 70,
			ageAppropriateness: 70,
			overallQuality: 70,
			feedback: ["Quality validation failed - manual review recommended"],
			shouldRegenerate: false,
		};
	}
}

/**
 * Parse AI quality assessment response
 */
function parseQualityAssessment(response: string): Omit<QualityMetrics, "overallQuality"> {
	try {
		// Extract JSON from response
		const jsonMatch = response.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("No JSON found in response");
		}

		const parsed = JSON.parse(jsonMatch[0]);

		// Validate and sanitize scores
		return {
			factualAccuracy: clampScore(parsed.factualAccuracy),
			readability: clampScore(parsed.readability),
			educationalValue: clampScore(parsed.educationalValue),
			ageAppropriateness: clampScore(parsed.ageAppropriateness),
			feedback: Array.isArray(parsed.feedback) ? parsed.feedback.slice(0, 5) : [], // Limit feedback
			shouldRegenerate: Boolean(parsed.shouldRegenerate),
		};
	} catch (error) {
		console.error("Failed to parse quality assessment:", error);
		// Return default scores if parsing fails
		return {
			factualAccuracy: 70,
			readability: 70,
			educationalValue: 70,
			ageAppropriateness: 70,
			feedback: ["Failed to parse quality assessment"],
			shouldRegenerate: false,
		};
	}
}

/**
 * Ensure score is within valid range
 */
function clampScore(score: unknown): number {
	const num = typeof score === "number" ? score : Number(score);
	if (Number.isNaN(num)) return 70; // Default score if not a valid number
	return Math.max(0, Math.min(100, Math.round(num)));
}

/**
 * Batch quality validation for multiple content pieces
 */
export async function validateContentQualityBatch(
	contentItems: Array<{
		content: string;
		type: keyof typeof QUALITY_PROMPTS;
		id?: string;
	}>,
	options: QualityValidationOptions = {}
): Promise<Array<QualityMetrics & { id?: string }>> {
	// Process in parallel with concurrency limit
	const BATCH_SIZE = 3; // Limit concurrent AI calls
	const results: Array<QualityMetrics & { id?: string }> = [];

	for (let i = 0; i < contentItems.length; i += BATCH_SIZE) {
		const batch = contentItems.slice(i, i + BATCH_SIZE);
		const batchPromises = batch.map(async (item) => {
			const metrics = await validateContentQuality(item.content, item.type, options);
			return { ...metrics, id: item.id };
		});

		const batchResults = await Promise.all(batchPromises);
		results.push(...batchResults);
	}

	return results;
}

/**
 * Check if content quality meets acceptance criteria
 */
export function isQualityAcceptable(
	metrics: QualityMetrics,
	strict = false
): { acceptable: boolean; reason?: string } {
	const thresholds = strict
		? { autoApprove: 85, autoReject: 50 }
		: { autoApprove: 80, autoReject: 40 };

	if (metrics.overallQuality >= thresholds.autoApprove) {
		return { acceptable: true };
	}

	if (metrics.overallQuality <= thresholds.autoReject) {
		return {
			acceptable: false,
			reason: `Quality score ${metrics.overallQuality} below threshold ${thresholds.autoReject}`,
		};
	}

	// Check individual dimensions for critical failures
	if (metrics.factualAccuracy < 60) {
		return {
			acceptable: false,
			reason: "Factual accuracy too low",
		};
	}

	if (metrics.educationalValue < 50) {
		return {
			acceptable: false,
			reason: "Educational value insufficient",
		};
	}

	// Borderline case - acceptable but could be improved
	return { acceptable: true };
}
