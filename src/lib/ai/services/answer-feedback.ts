import type { AnswerFeedbackData } from "@/components/open-questions/answer-feedback-analysis";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const FeedbackSchema = z.object({
	factualCorrectness: z.object({
		score: z.number().min(0).max(100),
		feedback: z.string(),
		strengths: z.array(z.string()),
		improvements: z.array(z.string()),
	}),
	logicalStructure: z.object({
		score: z.number().min(0).max(100),
		feedback: z.string(),
		strengths: z.array(z.string()),
		improvements: z.array(z.string()),
	}),
	depthOfInsight: z.object({
		score: z.number().min(0).max(100),
		feedback: z.string(),
		strengths: z.array(z.string()),
		improvements: z.array(z.string()),
	}),
	supportingEvidence: z.object({
		score: z.number().min(0).max(100),
		feedback: z.string(),
		strengths: z.array(z.string()),
		improvements: z.array(z.string()),
	}),
	overallScore: z.number().min(0).max(100),
	overallFeedback: z.string(),
});

export async function generateAnswerFeedback(
	question: string,
	userAnswer: string,
	sampleAnswer: string,
	context?: string
): Promise<AnswerFeedbackData> {
	try {
		// this should use getTextGenerationModel() at /config.ts
		const { object } = await generateObject({
			model: openai("gpt-4o-mini"),
			schema: FeedbackSchema,
			prompt: `
        You are an expert educational AI assistant tasked with providing comprehensive feedback on student answers to open-ended questions. 

        Question: "${question}"
        
        Student Answer: "${userAnswer}"
        
        Sample Answer: "${sampleAnswer}"
        
        ${context ? `Additional Context: "${context}"` : ""}

        Please evaluate the student's answer across four key criteria and provide detailed feedback:

        1. **Factual Correctness** (0-100%):
           - Accuracy of information and facts presented
           - Correctness of concepts, definitions, and statements
           - Absence of factual errors or misconceptions

        2. **Logical Structure** (0-100%):
           - Organization and flow of arguments
           - Clarity of reasoning and argumentation
           - Coherence and logical progression of ideas

        3. **Depth of Insight** (0-100%):
           - Level of analysis and critical thinking demonstrated
           - Understanding of underlying concepts and principles
           - Ability to make connections and draw meaningful conclusions

        4. **Supporting Evidence** (0-100%):
           - Quality and relevance of examples, evidence, and citations
           - Use of specific details to support arguments
           - Integration of course materials or external knowledge

        For each criterion, provide:
        - A score from 0-100%
        - Specific feedback explaining the score
        - Strengths identified in the answer (if any)
        - Areas for improvement (if any)

        Also provide:
        - An overall score (weighted average of all criteria)
        - Overall feedback summarizing the assessment

        Be constructive, encouraging, and specific in your feedback. Focus on helping the student improve their analytical and writing skills.
      `,
		});

		return object;
	} catch (error) {
		console.error("Error generating answer feedback:", error);

		// Return fallback feedback if AI generation fails
		return {
			factualCorrectness: {
				score: 50,
				feedback: "Unable to analyze factual correctness at this time.",
				strengths: [],
				improvements: ["Please try again later for detailed feedback."],
			},
			logicalStructure: {
				score: 50,
				feedback: "Unable to analyze logical structure at this time.",
				strengths: [],
				improvements: ["Please try again later for detailed feedback."],
			},
			depthOfInsight: {
				score: 50,
				feedback: "Unable to analyze depth of insight at this time.",
				strengths: [],
				improvements: ["Please try again later for detailed feedback."],
			},
			supportingEvidence: {
				score: 50,
				feedback: "Unable to analyze supporting evidence at this time.",
				strengths: [],
				improvements: ["Please try again later for detailed feedback."],
			},
			overallScore: 50,
			overallFeedback:
				"Feedback generation temporarily unavailable. Please try again later.",
		};
	}
}
