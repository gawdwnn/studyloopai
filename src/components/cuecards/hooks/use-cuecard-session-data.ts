"use client";

import {
	type CuecardAvailability,
	type UserCuecard,
	getUserCuecardsWithAvailability,
} from "@/lib/actions/cuecard";
import { useCuecardSession } from "@/stores/cuecard-session/use-cuecard-session";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import type { CuecardConfig } from "../types";

interface UseCuecardSessionDataOptions {
	courseId?: string;
	weekIds?: string[];
	enabled?: boolean;
	initialData?: {
		cuecards?: UserCuecard[];
		availability?: CuecardAvailability;
	};
}

interface CuecardSessionData {
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

export function useCuecardSessionData({
	courseId,
	weekIds = [],
	enabled = true,
	initialData,
}: UseCuecardSessionDataOptions): CuecardSessionData {
	const queryKey = ["cuecards", "session-data", courseId, weekIds];
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

			// Single query that gets both cards and availability
			const result = await getUserCuecardsWithAvailability(courseId, weekIds);

			return {
				cards: result.cards,
				availability: result.availability,
			};
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

	// Simplified prefetching - only prefetch when user is likely to need other weeks
	useEffect(() => {
		if (
			courseId &&
			result?.availability?.availableWeeks &&
			weekIds.length === 0
		) {
			// Only prefetch when viewing "all-weeks" - user likely to switch to specific weeks
			for (const week of result.availability.availableWeeks.slice(0, 3)) {
				// Limit to first 3 weeks
				queryClient.prefetchQuery({
					queryKey: ["cuecards", "session-data", courseId, [week.id]],
					queryFn: () => getUserCuecardsWithAvailability(courseId, [week.id]),
					staleTime: 5 * 60 * 1000, // 5 minutes
				});
			}
		}
	}, [courseId, result?.availability?.availableWeeks, weekIds, queryClient]);

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

		// Enhanced data from query
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
		[...cuecardKeys.all, "session-data", courseId, weekIds] as const,
	availability: (courseId: string, weekIds?: string[]) =>
		[...cuecardKeys.all, "availability", courseId, weekIds || []] as const,
	course: (courseId: string) =>
		[...cuecardKeys.all, "course", courseId] as const,
};
