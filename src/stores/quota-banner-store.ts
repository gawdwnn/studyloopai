import { create } from "zustand";

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

interface LimitBannerStore {
	isVisible: boolean;
	bannerData: BannerData | null;
	showQuotaBanner: (details: Omit<QuotaBannerData, "type">) => void;
	showRateLimitBanner: (details: Omit<RateLimitBannerData, "type">) => void;
	dismissBanner: () => void;
}

export const useLimitBannerStore = create<LimitBannerStore>((set) => ({
	isVisible: false,
	bannerData: null,
	showQuotaBanner: (details) =>
		set({
			isVisible: true,
			bannerData: { type: "quota", ...details },
		}),
	showRateLimitBanner: (details) =>
		set({
			isVisible: true,
			bannerData: { type: "rate-limit", ...details },
		}),
	dismissBanner: () =>
		set({
			isVisible: false,
			bannerData: null,
		}),
}));

// Legacy export for backward compatibility
export const useQuotaBannerStore = useLimitBannerStore;
