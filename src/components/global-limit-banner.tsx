"use client";

import { useLimitBannerStore } from "@/stores/quota-banner-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LimitBanner } from "./quota-exhausted-banner";

export function GlobalLimitBanner() {
	const router = useRouter();
	const {
		isVisible,
		bannerData,
		dismissBanner,
		showQuotaBanner,
		showRateLimitBanner,
	} = useLimitBannerStore();

	// Listen for quota and rate limit events
	useEffect(() => {
		const handleQuotaExhausted = (event: CustomEvent) => {
			showQuotaBanner(event.detail);
		};

		const handleRateLimitExceeded = (event: CustomEvent) => {
			showRateLimitBanner(event.detail);
		};

		window.addEventListener(
			"quota-exhausted",
			handleQuotaExhausted as EventListener
		);
		window.addEventListener(
			"rate-limit-exceeded",
			handleRateLimitExceeded as EventListener
		);

		return () => {
			window.removeEventListener(
				"quota-exhausted",
				handleQuotaExhausted as EventListener
			);
			window.removeEventListener(
				"rate-limit-exceeded",
				handleRateLimitExceeded as EventListener
			);
		};
	}, [showQuotaBanner, showRateLimitBanner]);

	const handleUpgrade = () => {
		dismissBanner();
		router.push("/dashboard/account");
	};

	if (!isVisible || !bannerData) {
		return null;
	}

	return (
		<LimitBanner
			data={bannerData}
			onDismiss={dismissBanner}
			onUpgrade={bannerData.type === "quota" ? handleUpgrade : undefined}
		/>
	);
}
