"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, X } from "lucide-react";

interface QuotaBannerData {
	type: "quota";
	quotaType: "ai_generations" | "material_uploads";
	currentUsage: number;
	quotaLimit: number;
	planId: string;
}

interface RateLimitBannerData {
	type: "rate-limit";
	limitType: string;
	retryAfterSeconds: number;
	limit: number;
	remaining: number;
}

type BannerData = QuotaBannerData | RateLimitBannerData;

interface LimitBannerProps {
	data: BannerData;
	onDismiss: () => void;
	onUpgrade?: () => void;
}

export function LimitBanner({ data, onDismiss, onUpgrade }: LimitBannerProps) {
	const isQuota = data.type === "quota";
	const isRateLimit = data.type === "rate-limit";

	// Quota banner content
	const quotaContent = isQuota
		? (() => {
				const quotaData = data as QuotaBannerData;
				const quotaTypeDisplay =
					quotaData.quotaType === "ai_generations"
						? "AI Generation"
						: "Material Upload";

				return {
					icon: (
						<AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-3 flex-shrink-0" />
					),
					title: `${quotaTypeDisplay} Quota Exceeded: ${quotaData.currentUsage}/${quotaData.quotaLimit} used`,
					description: `Upgrade your ${quotaData.planId} plan to continue using StudyLoop AI`,
					bgColor: "bg-amber-50 dark:bg-amber-900/10",
					borderColor: "border-amber-200 dark:border-amber-800",
					actionButton: onUpgrade ? (
						<Button
							size="sm"
							onClick={onUpgrade}
							className="bg-amber-600 hover:bg-amber-700 text-white"
						>
							Upgrade Plan
						</Button>
					) : null,
				};
			})()
		: null;

	// Rate limit banner content
	const rateLimitContent = isRateLimit
		? (() => {
				const rateLimitData = data as RateLimitBannerData;
				const retryMinutes = Math.ceil(rateLimitData.retryAfterSeconds / 60);
				const retryTimeText =
					retryMinutes > 1 ? `${retryMinutes} minutes` : "1 minute";

				return {
					icon: (
						<Clock className="h-5 w-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0" />
					),
					title: `Rate Limit Exceeded: ${rateLimitData.remaining}/${rateLimitData.limit} requests remaining`,
					description: `Too many requests. Please wait ${retryTimeText} before trying again.`,
					bgColor: "bg-red-50 dark:bg-red-900/10",
					borderColor: "border-red-200 dark:border-red-800",
					actionButton: null,
				};
			})()
		: null;

	const content = quotaContent || rateLimitContent;
	if (!content) return null;

	const closeButtonClass = isQuota
		? "text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-900/20"
		: "text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20";

	return (
		<div
			className={`border-b ${content.bgColor} ${content.borderColor} z-[9999] relative`}
		>
			<div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between flex-wrap gap-3">
					<div className="flex-1"></div>
					<div className="flex items-center justify-center">
						{content.icon}
						<div className="text-center">
							<p
								className={`text-sm font-medium ${isQuota ? "text-amber-800 dark:text-amber-200" : "text-red-800 dark:text-red-200"}`}
							>
								{content.title}
							</p>
							<p
								className={`text-xs mt-1 ${isQuota ? "text-amber-600 dark:text-amber-300" : "text-red-600 dark:text-red-300"}`}
							>
								{content.description}
							</p>
						</div>
					</div>
					<div className="flex-1 flex justify-end">
						<div className="flex items-center space-x-2">
							{content.actionButton}
							<Button
								variant="ghost"
								size="sm"
								onClick={onDismiss}
								className={closeButtonClass}
							>
								<X className="h-4 w-4" />
								<span className="sr-only">Dismiss</span>
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

// Legacy export for backward compatibility
export const QuotaExhaustedBanner = LimitBanner;
