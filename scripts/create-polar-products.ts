#!/usr/bin/env bun
/**
 * Create Polar products with proper names and descriptions
 * Usage: bun scripts/create-polar-products.ts
 */

import { env } from "@/env";
import { createProducts } from "@/lib/polar/products";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("polar:recreate");

async function main() {
	logger.info("Creating Polar products with proper names");

	const environment = env.NODE_ENV === "production" ? "production" : "sandbox";
	logger.info(`Environment: ${environment}`);

	try {
		// Create products with proper names and benefits
		logger.info("Creating new products with quotas and benefits");
		const { freeProduct, monthlyProduct, yearlyProduct } =
			await createProducts();

		logger.info("Products created successfully with quota information", {
			freeProduct: {
				name: freeProduct.name,
				description: freeProduct.description,
				id: freeProduct.id,
				price: "Free",
			},
			monthlyProduct: {
				name: monthlyProduct.name,
				description: monthlyProduct.description,
				id: monthlyProduct.id,
				price:
					monthlyProduct.prices?.[0] &&
					"priceAmount" in monthlyProduct.prices[0]
						? `$${(monthlyProduct.prices[0].priceAmount / 100).toFixed(2)}/month`
						: "N/A",
			},
			yearlyProduct: {
				name: yearlyProduct.name,
				description: yearlyProduct.description,
				id: yearlyProduct.id,
				price:
					yearlyProduct.prices?.[0] && "priceAmount" in yearlyProduct.prices[0]
						? `$${(yearlyProduct.prices[0].priceAmount / 100).toFixed(2)}/year`
						: "N/A",
			},
		});

		logger.info(
			"Products now include quota limits in descriptions and are ready for testing"
		);
	} catch (error) {
		console.error("Failed to create products:", error);
		console.error("Environment details:", {
			NODE_ENV: env.NODE_ENV,
			hasAccessToken: !!env.POLAR_ACCESS_TOKEN,
			hasOrgId: !!env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID,
			hasWebhookSecret: !!env.POLAR_WEBHOOK_SECRET,
		});
		process.exit(1);
	}
}

main().catch(console.error);
