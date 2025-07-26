"use client";

import {
	type UserCuecard,
	checkCuecardsAvailability,
	getUserCuecards,
} from "@/lib/actions/cuecard";
import { useCuecardSession } from "@/stores/cuecard-session/use-cuecard-session";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import type { CuecardConfig } from "../types";

interface UseCuecardSessionDataOptions {
	courseId: string;
	weekIds?: string[];
	enabled?: boolean;
}

interface CuecardSessionData {
	// Availability info
	isLoading: boolean;
	isAvailable: boolean;
	count: number;
	canStartSession: boolean;

	// Session data (pre-loaded for instant start)
	cards: UserCuecard[];

	// Actions
	startSessionInstantly: (config: CuecardConfig) => Promise<void>;
	refetch: () => void;
	error: string | null;
}

interface QueryResult {
	cards: UserCuecard[];
	availability: {
		hasWeeksWithContent: boolean;
	} | null;
}

export function useCuecardSessionData({
	courseId,
	weekIds = [],
	enabled = true,
}: UseCuecardSessionDataOptions): CuecardSessionData {
	const queryKey = ["cuecards", "session-data", courseId, weekIds];

	const {
		data: result,
		isLoading,
		error,
		refetch,
	} = useQuery<QueryResult>({
		queryKey,
		queryFn: async () => {
			if (!courseId) return { cards: [], availability: null };

			// Single optimized query that gets both availability and cards
			const cards = await getUserCuecards(courseId, weekIds);
			const availability =
				cards.length === 0 ? await checkCuecardsAvailability(courseId) : null;

			return { cards, availability };
		},
		enabled: enabled && Boolean(courseId),
		staleTime: 30 * 1000,
		gcTime: 5 * 60 * 1000,
	});

	const cards = result?.cards || [];
	const isAvailable = cards.length > 0;
	const count = cards.length;
	const canStartSession = isAvailable && !isLoading;

	// Pre-loaded instant session start
	const startSessionInstantly = useCallback(
		async (config: CuecardConfig) => {
			if (!result?.cards.length) {
				throw new Error("No cards available");
			}

			// Use cached data directly - no additional fetch needed
			const cuecardStore = useCuecardSession.getState();
			await cuecardStore.actions.startSessionWithData(config, result.cards);
		},
		[result?.cards]
	);

	const handleRefetch = useCallback(() => {
		refetch();
	}, [refetch]);

	return {
		isLoading,
		isAvailable,
		count,
		canStartSession,
		cards,
		startSessionInstantly,
		refetch: handleRefetch,
		error: error ? (error as Error).message : null,
	};
}

export type { UseCuecardSessionDataOptions, CuecardSessionData };
