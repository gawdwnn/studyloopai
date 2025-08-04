"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export function SuccessPageClient() {
	const searchParams = useSearchParams();

	useEffect(() => {
		// Show success toast when the page loads
		toast.success("Subscription activated!", {
			description: "Welcome to StudyLoop Pro! Your account has been upgraded.",
			duration: 5000,
		});

		// Optionally track success event if checkout_id is available
		const checkoutId = searchParams.get("checkout_id");
		if (checkoutId) {
			// Could verify checkout completion here with proper API call
			// For now, just log success internally without console output
		}
	}, [searchParams]);

	return null;
}
