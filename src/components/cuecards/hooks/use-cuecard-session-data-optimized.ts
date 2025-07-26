"use client";

import {
	type CuecardAvailability,
	type UserCuecard,
	checkCuecardsAvailabilityOptimized,
	getUserCuecards,
} from "@/lib/actions/cuecard";
import { useCuecardSession } from "@/stores/cuecard-session/use-cuecard-session";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import type { CuecardConfig } from "../types";

interface UseCuecardSessionDataOptimizedOptions {
	courseId?: string;
	weekIds?: string[];
	enabled?: boolean;
	initialData?: {
		cuecards?: UserCuecard[];
		availability?: CuecardAvailability;
	};
}

interface CuecardSessionDataOptimized {
	// Availability info
	isLoading: boolean;
	isAvailable: boolean;
	count: number;
	canStartSession: boolean;
	hasWeeksWithContent: boolean;

	// Enhanced data
	availableWeeks: Array<{ id: string; weekNumber: number }>;
	cuecardsByWeek: Record<string, number>;

	// Session data (pre-loaded for instant start)
	cards: UserCuecard[];

	// Actions
	startSessionInstantly: (config: CuecardConfig) => Promise<void>;
	refetch: () => void;
	error: string | null;
}

interface QueryResult {
	cards: UserCuecard[];
	availability: CuecardAvailability | null;
}

export function useCuecardSessionDataOptimized({
	courseId,
	weekIds = [],
	enabled = true,
	initialData,
}: UseCuecardSessionDataOptimizedOptions): CuecardSessionDataOptimized {
	const queryKey = ["cuecards", "session-data-optimized", courseId, weekIds];
	const queryClient = useQueryClient();

	const {
		data: result,
		isLoading,
		error: queryError,
		refetch,
	} = useQuery<QueryResult>({
		queryKey,
		queryFn: async () => {
			if (!courseId) return { cards: [], availability: null };

			// Use optimized availability check with hasMaterials pre-filtering
			const availability = await checkCuecardsAvailabilityOptimized(
				courseId,
				weekIds
			);

			if (!availability.available) {
				return { cards: [], availability };
			}

			// Only fetch full card data if cards are available
			const cards = await getUserCuecards(courseId, weekIds);

			return { cards, availability };
		},
		enabled: enabled && Boolean(courseId),
		initialData: initialData
			? {
					cards: initialData.cuecards || [],
					availability: initialData.availability || null,
				}
			: undefined,
		staleTime: 30 * 1000, // 30 seconds
		gcTime: 5 * 60 * 1000, // 5 minutes
	});

	// Prefetch related data for performance
	useEffect(() => {
		if (courseId && result?.availability?.availableWeeks) {
			// Prefetch data for other weeks that have materials
			for (const week of result.availability.availableWeeks) {
				const prefetchKey = [
					"cuecards",
					"session-data-optimized",
					courseId,
					[week.id],
				];

				queryClient.prefetchQuery({
					queryKey: prefetchKey,
					queryFn: () =>
						checkCuecardsAvailabilityOptimized(courseId, [week.id]),
					staleTime: 2 * 60 * 1000, // Shorter stale time for prefetch
				});
			}
		}
	}, [courseId, result?.availability?.availableWeeks, queryClient]);

	// Store actions
	const cuecardActions = useCuecardSession((state) => state.actions);

	const startSessionInstantly = useCallback(
		async (config: CuecardConfig) => {
			if (!result?.cards || result.cards.length === 0) {
				throw new Error("No cuecards available to start session");
			}

			// Use pre-loaded data for instant session start
			await cuecardActions.startSessionWithData(config, result.cards);
		},
		[result?.cards, cuecardActions]
	);

	const availability = result?.availability;
	const cards = result?.cards || [];

	return {
		// Loading and availability states
		isLoading,
		isAvailable: availability?.available || false,
		count: availability?.count || 0,
		canStartSession: cards.length > 0,
		hasWeeksWithContent: availability?.hasWeeksWithContent || false,

		// Enhanced data from optimized query
		availableWeeks: availability?.availableWeeks || [],
		cuecardsByWeek: availability?.cuecardsByWeek || {},

		// Pre-loaded session data
		cards,

		// Actions
		startSessionInstantly,
		refetch: () => refetch(),
		error: queryError ? String(queryError) : null,
	};
}

// Query key factory for consistent caching
export const cuecardKeys = {
	all: ["cuecards"] as const,
	sessionData: (courseId: string, weekIds: string[]) =>
		[...cuecardKeys.all, "session-data-optimized", courseId, weekIds] as const,
	availability: (courseId: string, weekIds?: string[]) =>
		[...cuecardKeys.all, "availability", courseId, weekIds || []] as const,
	course: (courseId: string) =>
		[...cuecardKeys.all, "course", courseId] as const,
};
