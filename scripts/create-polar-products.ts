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
		// Create products with proper names
		logger.info("Creating new products");
		const { monthlyProduct, yearlyProduct } = await createProducts();

		logger.info("Products created successfully", {
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

		logger.info("Products now have proper names and descriptions");
	} catch (error) {
		logger.error("Failed to create products", {
			error: error instanceof Error ? error.message : error,
		});
		process.exit(1);
	}
}

main().catch(console.error);
