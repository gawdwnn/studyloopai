"use client";

import {
	type MCQAvailability,
	type UserMCQ,
	getUserMCQsWithAvailability,
} from "@/lib/actions/mcq";
import type { McqConfig } from "@/stores/mcq-session/types";
import { useMcqSession } from "@/stores/mcq-session/use-mcq-session";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

interface UseMCQSessionDataOptions {
	courseId?: string;
	weekIds?: string[];
	enabled?: boolean;
	initialData?: {
		mcqs?: UserMCQ[];
		availability?: MCQAvailability;
	};
}

interface MCQSessionData {
	// Availability info
	isLoading: boolean;
	isAvailable: boolean;
	count: number;
	canStartSession: boolean;
	hasWeeksWithContent: boolean;

	// Enhanced data
	availableWeeks: Array<{ id: string; weekNumber: number }>;
	mcqsByWeek: Record<string, number>;
	difficultyBreakdown: Record<string, number>;

	// Session data (pre-loaded for instant start)
	mcqs: UserMCQ[];

	// Actions
	startSessionInstantly: (config: McqConfig) => Promise<void>;
	refetch: () => void;
	error: string | null;
}

interface QueryResult {
	mcqs: UserMCQ[];
	availability: MCQAvailability | null;
}

export function useMCQSessionData({
	courseId,
	weekIds = [],
	enabled = true,
	initialData,
}: UseMCQSessionDataOptions): MCQSessionData {
	const queryKey = ["mcq", "session-data", courseId, weekIds];
	const queryClient = useQueryClient();

	const {
		data: result,
		isLoading,
		error: queryError,
		refetch,
	} = useQuery<QueryResult>({
		queryKey,
		queryFn: async () => {
			if (!courseId) return { mcqs: [], availability: null };

			// Single query that gets both MCQs and availability
			const result = await getUserMCQsWithAvailability(courseId, weekIds);

			return {
				mcqs: result.mcqs,
				availability: result.availability,
			};
		},
		enabled: enabled && Boolean(courseId),
		initialData: initialData
			? {
					mcqs: initialData.mcqs || [],
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
					queryKey: ["mcq", "session-data", courseId, [week.id]],
					queryFn: () => getUserMCQsWithAvailability(courseId, [week.id]),
					staleTime: 5 * 60 * 1000, // 5 minutes
				});
			}
		}
	}, [courseId, result?.availability?.availableWeeks, weekIds, queryClient]);

	// Store actions
	const mcqActions = useMcqSession((state) => state.actions);

	const startSessionInstantly = useCallback(
		async (config: McqConfig) => {
			if (!result?.mcqs || result.mcqs.length === 0) {
				throw new Error("No MCQs available to start session");
			}

			// Use pre-loaded data for instant session start
			await mcqActions.startSessionWithData(config, result.mcqs);
		},
		[result?.mcqs, mcqActions]
	);

	const availability = result?.availability;
	const mcqs = result?.mcqs || [];

	return {
		// Loading and availability states
		isLoading,
		isAvailable: availability?.available || false,
		count: availability?.count || 0,
		canStartSession: mcqs.length > 0,
		hasWeeksWithContent: availability?.hasWeeksWithContent || false,

		// Enhanced data from query
		availableWeeks: availability?.availableWeeks || [],
		mcqsByWeek: availability?.mcqsByWeek || {},
		difficultyBreakdown: availability?.difficultyBreakdown || {},

		// Pre-loaded session data
		mcqs,

		// Actions
		startSessionInstantly,
		refetch: () => refetch(),
		error: queryError ? String(queryError) : null,
	};
}

// Query key factory for consistent caching
export const mcqKeys = {
	all: ["mcq"] as const,
	sessionData: (courseId: string, weekIds: string[]) =>
		[...mcqKeys.all, "session-data", courseId, weekIds] as const,
	sessionDataOptimized: (courseId: string, weekIds: string[]) =>
		[...mcqKeys.all, "session-data-optimized", courseId, weekIds] as const,
	availability: (courseId: string, weekIds?: string[]) =>
		[...mcqKeys.all, "availability", courseId, weekIds || []] as const,
	difficulty: (courseId: string, weekIds: string[], difficulty: string) =>
		[...mcqKeys.all, "difficulty", courseId, weekIds, difficulty] as const,
	course: (courseId: string) => [...mcqKeys.all, "course", courseId] as const,
};
