import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	serverExternalPackages: ["pdf-parse", "pino", "pino-pretty", "posthog-node"],
	transpilePackages: ["@mdxeditor/editor"],

	// Production optimizations
	compress: true,
	poweredByHeader: false,

	// Security headers for production
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{
						key: "X-Content-Type-Options",
						value: "nosniff",
					},
					{
						key: "Referrer-Policy",
						value: "strict-origin-when-cross-origin",
					},
					{
						key: "X-XSS-Protection",
						value: "1; mode=block",
					},
					{
						key: "Content-Security-Policy",
						value: "frame-ancestors *",
					},
				],
			},
		];
	},

	// Image optimization configuration
	images: {
		formats: ["image/webp", "image/avif"],
		minimumCacheTTL: 60,
	},

	// Experimental features for performance
	experimental: {
		optimizePackageImports: [
			"@radix-ui/react-icons",
			"lucide-react",
			"framer-motion",
		],
	},
};

export default nextConfig;
