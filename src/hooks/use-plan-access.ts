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
				logger.error({ err: error }, "Failed to check plan status");
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
			logger.error(
				{
					err: error,
					featureId,
				},
				"Failed to check feature access"
			);
			return false;
		}
	}, []);

	return {
		isActive,
		loading,
		checkFeatureAccess,
	};
}
