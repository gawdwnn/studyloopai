import type { PlanId } from "@/lib/database/types";
import { motion } from "framer-motion";
import { Check, Crown, Gift, Sparkles, Star, Zap } from "lucide-react";
import type { ReactElement } from "react";

const planFeatures: Record<
	PlanId,
	Array<{ id: string; text: string; icon: ReactElement }>
> = {
	free: [
		{
			id: "free-docs",
			text: "Upload up to 3 documents",
			icon: <Check className="h-4 w-4" />,
		},
		{
			id: "free-summaries",
			text: "Basic AI summaries",
			icon: <Check className="h-4 w-4" />,
		},
		{
			id: "free-cuecards",
			text: "Limited cuecards",
			icon: <Check className="h-4 w-4" />,
		},
		{
			id: "free-support",
			text: "Community support",
			icon: <Check className="h-4 w-4" />,
		},
	],
	monthly: [
		{
			id: "monthly-uploads",
			text: "Unlimited document uploads",
			icon: <Zap className="h-4 w-4 text-blue-500" />,
		},
		{
			id: "monthly-ai",
			text: "Advanced AI features",
			icon: <Sparkles className="h-4 w-4 text-purple-500" />,
		},
		{
			id: "monthly-quizzes",
			text: "Interactive quizzes & tests",
			icon: <Star className="h-4 w-4 text-yellow-500" />,
		},
		{
			id: "monthly-support",
			text: "Priority support",
			icon: <Check className="h-4 w-4 text-green-500" />,
		},
		{
			id: "monthly-export",
			text: "Export to multiple formats",
			icon: <Crown className="h-4 w-4 text-orange-500" />,
		},
	],
	yearly: [
		{
			id: "yearly-features",
			text: "All monthly features",
			icon: <Crown className="h-4 w-4 text-purple-500" />,
		},
		{
			id: "yearly-savings",
			text: "2 months free (40% savings)",
			icon: <Gift className="h-4 w-4 text-green-500" />,
		},
		{
			id: "yearly-analytics",
			text: "Advanced analytics",
			icon: <Star className="h-4 w-4 text-blue-500" />,
		},
		{
			id: "yearly-early-access",
			text: "Early access to new features",
			icon: <Sparkles className="h-4 w-4 text-purple-500" />,
		},
	],
};

interface PlanFeaturesProps {
	planId: PlanId;
	animated?: boolean;
}

export function PlanFeatures({ planId, animated = false }: PlanFeaturesProps) {
	const features = planFeatures[planId] || [];

	if (features.length === 0) {
		return null;
	}

	return (
		<div className="grid grid-cols-1 gap-2">
			{features.map((feature, index) => {
				const FeatureItem = (
					<div key={feature.id} className="flex items-center gap-3">
						<div className="text-green-500">{feature.icon}</div>
						<span className="text-sm">{feature.text}</span>
					</div>
				);

				if (animated) {
					return (
						<motion.div
							key={feature.id}
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: index * 0.1 }}
						>
							{FeatureItem}
						</motion.div>
					);
				}

				return FeatureItem;
			})}
		</div>
	);
}
