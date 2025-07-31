import { hasFeatureAccess, isPlanActive } from "@/lib/actions/plans";
import type { FeatureId } from "@/lib/database/types";
import { logger } from "@/lib/utils/logger";
import { useCallback, useEffect, useState } from "react";

export function usePlanAccess() {
	const [isActive, setIsActive] = useState<boolean | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function checkPlanStatus() {
			try {
				const active = await isPlanActive();
				setIsActive(active);
			} catch (error) {
				logger.error("Failed to check plan status", {
					message: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
				});
				setIsActive(false);
			} finally {
				setLoading(false);
			}
		}

		checkPlanStatus();
	}, []);

	const checkFeatureAccess = useCallback(async (featureId: FeatureId) => {
		try {
			return await hasFeatureAccess(featureId);
		} catch (error) {
			logger.error("Failed to check feature access", {
				featureId,
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
			return false;
		}
	}, []);

	return {
		isActive,
		loading,
		checkFeatureAccess,
	};
}
