"use client";

import { getUserCuecards } from "@/lib/actions/cuecard";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

interface UseCuecardAvailabilityOptions {
	courseId: string;
	weekIds?: string[]; // Empty array means all weeks
	enabled?: boolean;
}

interface CuecardAvailabilityStatus {
	isLoading: boolean;
	isAvailable: boolean;
	count: number;
	canStartSession: boolean;
	error: string | null;
	refetch: () => void;
}

/**
 * Clean, dedicated hook for cuecard availability checking
 * Uses server actions directly with react-query for caching
 * Handles both specific weeks and all weeks scenarios
 */
export function useCuecardAvailability({
	courseId,
	weekIds = [], // Default to empty array (all weeks)
	enabled = true,
}: UseCuecardAvailabilityOptions): CuecardAvailabilityStatus {
	// Generate cache key based on course and weeks
	const queryKey = ["cuecards", "availability", courseId, weekIds];

	const {
		data: cuecards = [],
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey,
		queryFn: async () => {
			if (!courseId) return [];
			return await getUserCuecards(courseId, weekIds);
		},
		enabled: enabled && Boolean(courseId),
		staleTime: 30 * 1000, // Consider data fresh for 30 seconds
		gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
	});

	// Derive availability status from cuecards data
	const isAvailable = cuecards.length > 0;
	const count = cuecards.length;
	const canStartSession = isAvailable && !isLoading;
	const errorMessage = error ? (error as Error).message : null;

	const handleRefetch = useCallback(() => {
		refetch();
	}, [refetch]);

	return {
		isLoading,
		isAvailable,
		count,
		canStartSession,
		error: errorMessage,
		refetch: handleRefetch,
	};
}

// Type exports for convenience
export type { UseCuecardAvailabilityOptions, CuecardAvailabilityStatus };
