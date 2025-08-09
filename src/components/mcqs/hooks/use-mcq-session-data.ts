"use client";

import {
	type MCQAvailability,
	type UserMCQ,
	getUserMCQsWithAvailability,
} from "@/lib/actions/mcq";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import type { McqConfig } from "../stores/types";
import { useMcqSession } from "../stores/use-mcq-session";

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
	hasCourseWeeksWithContent: boolean;

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

	// Store actions
	const mcqActions = useMcqSession((state) => state.actions);

	const startSessionInstantly = useCallback(
		async (config: McqConfig) => {
			if (!result?.mcqs || result.mcqs.length === 0) {
				throw new Error("No MCQs available to start session");
			}

			// Use pre-loaded data for instant session start
			await mcqActions.startSession(config, result.mcqs);
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
		hasCourseWeeksWithContent: availability?.hasCourseWeeksWithContent || false,

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
