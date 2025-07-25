"use client";

import type { SelectiveGenerationConfig } from "@/types/generation-types";
import { useCallback } from "react";
import { toast } from "sonner";

export interface UseCuecardGenerationOptions {
	triggerGeneration: (
		courseId: string,
		weekIds?: string[],
		generationConfig?: SelectiveGenerationConfig
	) => Promise<boolean>;
}

export interface UseCuecardGenerationReturn {
	handleTriggerGeneration: (
		courseId: string,
		weekIds?: string[],
		generationConfig?: SelectiveGenerationConfig
	) => Promise<void>;
}

export function useCuecardGeneration({
	triggerGeneration,
}: UseCuecardGenerationOptions): UseCuecardGenerationReturn {
	const handleTriggerGeneration = useCallback(
		async (
			courseId: string,
			weekIds?: string[],
			generationConfig?: SelectiveGenerationConfig
		) => {
			try {
				const success = await triggerGeneration(
					courseId,
					weekIds,
					generationConfig
				);

				if (success) {
					toast.success(
						"Cuecard generation started! This may take a few minutes."
					);
				} else {
					toast.error("Failed to start cuecard generation. Please try again.");
				}
			} catch (error) {
				console.error("Cuecard generation error:", error);
				toast.error("Failed to start cuecard generation. Please try again.");
			}
		},
		[triggerGeneration]
	);

	return {
		handleTriggerGeneration,
	};
}
