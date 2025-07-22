import type { DatabaseClient } from "@/db";
import type {
	ConceptMapsConfig,
	CuecardsConfig,
	GoldenNotesConfig,
	McqsConfig,
	OpenQuestionsConfig,
	SummariesConfig,
} from "@/types/generation-types";
import { generateText } from "ai";
import type { z } from "zod";
import { getTextGenerationModel } from "../config";
import type { SupportedContentType } from "../prompts";
import { getPromptByType } from "../prompts";
import type { ContentGenerationResult } from "./types";
import {
	combineChunksForGeneration,
	getCombinedChunks,
	parseJsonArrayResponse,
	parseJsonObjectResponse,
} from "./utils";

type GenerationConfig =
	| GoldenNotesConfig
	| CuecardsConfig
	| McqsConfig
	| OpenQuestionsConfig
	| SummariesConfig
	| ConceptMapsConfig;

interface GenericGeneratorOptions<T> {
	courseId: string;
	weekId: string;
	materialIds: string[];
	config: GenerationConfig;
	contentType: SupportedContentType;
	schema: z.ZodTypeAny;
	insertFunction: (
		data: T[],
		courseId: string,
		weekId: string
	) => Promise<void>;
	maxTokens?: number;
	temperature?: number;
	responseType: "array" | "object";
	database: DatabaseClient;
}

export async function generateContent<T>(
	options: GenericGeneratorOptions<T>
): Promise<ContentGenerationResult> {
	const {
		courseId,
		weekId,
		materialIds,
		config,
		contentType,
		schema,
		insertFunction,
		maxTokens = 3500,
		temperature = 0.7,
		responseType,
		database,
	} = options;

	try {
		const chunks = await getCombinedChunks(materialIds, database);
		if (chunks.length === 0) {
			return {
				success: false,
				contentType,
				generatedCount: 0,
				error: `No content chunks found for ${contentType}`,
			};
		}

		const content = combineChunksForGeneration(chunks);
		const prompt = getPromptByType(contentType);
		if (!prompt) {
			return {
				success: false,
				contentType,
				generatedCount: 0,
				error: `Prompt not found for ${contentType}`,
			};
		}

		const context =
			contentType === "conceptMaps"
				? {
						content,
						difficulty: config.difficulty,
						focus: "focus" in config ? config.focus : undefined,
						style: "style" in config ? config.style : undefined,
					}
				: {
						content,
						difficulty: config.difficulty,
						count: "count" in config ? config.count : 1,
						focus: "focus" in config ? config.focus : undefined,
					};

		const result = await generateText({
			model: getTextGenerationModel(),
			system: prompt.systemPrompt,
			prompt: prompt.userPrompt(context),
			maxTokens,
			temperature,
		});

		let parsedData: T[] | T;
		if (responseType === "array") {
			parsedData = parseJsonArrayResponse(
				result.text,
				schema as z.ZodArray<z.ZodTypeAny>,
				[]
			);
		} else {
			parsedData = parseJsonObjectResponse(
				result.text,
				schema as z.ZodObject<z.ZodRawShape>,
				{} as T
			);
		}

		const dataToInsert = Array.isArray(parsedData) ? parsedData : [parsedData];
		if (
			dataToInsert.length > 0 &&
			Object.keys(dataToInsert[0] as object).length > 0
		) {
			await insertFunction(dataToInsert, courseId, weekId);
		} else {
			console.warn(`AI generated empty content for ${contentType}`);
		}

		return {
			success: true,
			contentType,
			generatedCount: dataToInsert.length,
		};
	} catch (error) {
		console.error(`${contentType} generation for week failed:`, error);
		return {
			success: false,
			contentType,
			generatedCount: 0,
			error: (error as Error).message,
		};
	}
}
