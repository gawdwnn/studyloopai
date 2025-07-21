import { hasFeatureAccess, isPlanActive } from "@/lib/actions/plans";
import type { FeatureId } from "@/lib/database/types";
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
				console.error("Failed to check plan status:", error);
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
			console.error("Failed to check feature access:", error);
			return false;
		}
	}, []);

	return {
		isActive,
		loading,
		checkFeatureAccess,
	};
}
