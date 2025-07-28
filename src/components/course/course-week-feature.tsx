"use client";

import type {
	FeatureAvailability,
	FeatureType,
} from "@/types/generation-types";

interface CourseWeekFeatureProps {
	weekFeatures: FeatureAvailability | null;
	featureType: FeatureType;
	isLoading: boolean;
}

export function CourseWeekFeature({
	weekFeatures,
	featureType,
	isLoading,
}: CourseWeekFeatureProps) {
	if (isLoading) {
		return <span className="text-xs text-muted-foreground">-</span>;
	}

	if (!weekFeatures || !weekFeatures[featureType]) {
		return <span className="text-xs text-muted-foreground">-</span>;
	}

	const feature = weekFeatures[featureType];

	if (!feature.generated || feature.count === 0) {
		return <span className="text-xs text-muted-foreground">-</span>;
	}

	return (
		<span className="text-xs font-medium text-center">{feature.count}</span>
	);
}
