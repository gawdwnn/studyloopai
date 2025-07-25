"use client";

import type { ContentAvailabilityStatus } from "@/lib/services/content-availability-service";
import { getGenerationStatus } from "@/lib/services/generation-service";
import type { FeatureType } from "@/types/generation-types";
import { useCallback, useEffect, useState } from "react";

interface UseContentAvailabilityOptions {
	courseId: string;
	weekId: string;
	enabled?: boolean;
}

interface UseContentAvailabilityReturn {
	data: ContentAvailabilityStatus | null;
	isLoading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
	getContentTypeStatus: (contentType: FeatureType) => {
		isAvailable: boolean;
		isGenerating: boolean;
		count: number;
		canStartSession: boolean;
	};
	hasAnyContent: boolean;
	isAnyGenerating: boolean;
	canStartSession: (contentType: FeatureType) => boolean;
}

export function useContentAvailability({
	courseId,
	weekId,
	enabled = true,
}: UseContentAvailabilityOptions): UseContentAvailabilityReturn {
	const [data, setData] = useState<ContentAvailabilityStatus | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchAvailability = useCallback(async () => {
		if (!enabled || !courseId || !weekId) return;

		try {
			setIsLoading(true);
			setError(null);

			const result = await getGenerationStatus({
				courseId,
				weekId,
			});
			setData(result);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Unknown error occurred";
			setError(errorMessage);
			console.error("Content availability fetch failed:", err);
		} finally {
			setIsLoading(false);
		}
	}, [courseId, weekId, enabled]);

	// Fetch on page load and when courseId or weekId changes
	useEffect(() => {
		fetchAvailability();
	}, [fetchAvailability]);

	// Helper function to get content type status
	const getContentTypeStatus = useCallback(
		(contentType: FeatureType) => {
			const availability = data?.contentAvailability[contentType];

			if (!availability) {
				return {
					isAvailable: false,
					isGenerating: false,
					count: 0,
					canStartSession: false,
				};
			}

			const isAvailable =
				availability.status === "available" && availability.count > 0;
			const isGenerating = availability.isGenerating; // Simplified: no "generating" status
			const canStartSession = isAvailable && !isGenerating;

			return {
				isAvailable,
				isGenerating,
				count: availability.count,
				canStartSession,
			};
		},
		[data]
	);

	// Helper to check if any content is available
	const hasAnyContent = Boolean(
		data &&
			Object.values(data.contentAvailability).some(
				(availability) =>
					availability.status === "available" && availability.count > 0
			)
	);

	// Helper to check if any content is generating
	const isAnyGenerating = Boolean(
		data &&
			Object.values(data.contentAvailability).some(
				(availability) => availability.isGenerating
			)
	);

	// Helper to check if can start session for specific content type
	const canStartSession = useCallback(
		(contentType: FeatureType) => {
			const status = getContentTypeStatus(contentType);
			return status.canStartSession;
		},
		[getContentTypeStatus]
	);

	return {
		data,
		isLoading,
		error,
		refetch: fetchAvailability,
		getContentTypeStatus,
		hasAnyContent,
		isAnyGenerating,
		canStartSession,
	};
}
