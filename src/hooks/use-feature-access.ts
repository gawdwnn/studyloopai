import { PLANS } from "@/lib/plans/config";
import { FEATURE_IDS, type FeatureId, type PlanId } from "@/lib/plans/types";

export function useFeatureAccess(userPlan: PlanId) {
	const plan = PLANS.find((p) => p.id === userPlan);

	if (!plan) {
		throw new Error(`Invalid plan: ${userPlan}`);
	}

	const hasFeature = (featureId: FeatureId): boolean => {
		const feature = plan.features.find((f) => f.id === FEATURE_IDS[featureId]);
		return feature?.included ?? false;
	};

	const getFeatureLimit = (featureId: FeatureId): number | null => {
		const feature = plan.features.find((f) => f.id === FEATURE_IDS[featureId]);
		if (!feature?.included) return null;

		// Extract numeric limits from feature names
		const match = feature.name.match(/(\d+)/);
		return match ? Number.parseInt(match[1], 10) : null;
	};

	return {
		hasFeature,
		getFeatureLimit,
		plan,
	};
}
