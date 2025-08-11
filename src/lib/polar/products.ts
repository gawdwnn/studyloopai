import { PLANS, PLAN_QUOTAS, priceUtils } from "@/lib/config/plans";
import { createLogger } from "@/lib/utils/logger";
import { createPolarClient } from "./client";

const logger = createLogger("billing:products");

// Helper function for consistent product matching
const findPaidProductByInterval = (products: any[], interval: string) => {
	return products.find(
		(p) => p.recurringInterval === interval && p.prices?.[0]?.priceAmount > 0
	);
};

export async function createProducts() {
	const polar = createPolarClient();
	const freePlan = PLANS.find((p) => p.id === "free");
	const monthlyPlan = PLANS.find((p) => p.id === "monthly");
	const yearlyPlan = PLANS.find((p) => p.id === "yearly");

	if (!freePlan || !monthlyPlan || !yearlyPlan) {
		throw new Error("Required plans not found");
	}

	logger.info("Creating products with client", {
		freePlanFound: !!freePlan,
		monthlyPlanFound: !!monthlyPlan,
		yearlyPlanFound: !!yearlyPlan,
	});

	// Create free product
	logger.info("Creating free product...");
	let freeProduct;
	try {
		freeProduct = await polar.products.create({
			name: "StudyLoop Free",
			description: `Free tier: ${PLAN_QUOTAS.free.ai_generations} AI generations, ${PLAN_QUOTAS.free.materials_uploaded} material uploads per month`,
			recurringInterval: "month",
			prices: [
				{
					amountType: "free",
				},
			],
		});
		logger.info("Free product created successfully", { id: freeProduct.id });
	} catch (error) {
		console.error("Failed to create free product:", error);
		throw error;
	}

	// Create monthly product
	const monthlyProduct = await polar.products.create({
		name: "StudyLoop Pro Monthly",
		description: `Pro Monthly: ${PLAN_QUOTAS.monthly.ai_generations} AI generations, ${PLAN_QUOTAS.monthly.materials_uploaded} material uploads per month`,
		recurringInterval: "month",
		prices: [
			{
				amountType: "fixed",
				priceAmount: priceUtils.toCents(monthlyPlan.price),
				priceCurrency: "usd",
			},
		],
	});

	// Create yearly product
	const yearlyProduct = await polar.products.create({
		name: "StudyLoop Pro Yearly",
		description: `Pro Yearly: ${PLAN_QUOTAS.yearly.ai_generations} AI generations, ${PLAN_QUOTAS.yearly.materials_uploaded} material uploads per month - Save $12 annually`,
		recurringInterval: "year",
		prices: [
			{
				amountType: "fixed",
				priceAmount: priceUtils.toCents(
					yearlyPlan.annualPrice || yearlyPlan.price * 12
				), // Use annualPrice directly
				priceCurrency: "usd",
			},
		],
	});

	return { freeProduct, monthlyProduct, yearlyProduct };
}

export async function getProductPrices() {
	const polar = createPolarClient();

	logger.info("GetProductPrices: Fetching product prices from Polar");

	// Fetch all products from Polar using the same pattern as getProducts()
	const productsResponse = await polar.products.list({});
	const products = productsResponse.result?.items || [];

	// Use consistent product matching strategy
	const monthlyProduct = findPaidProductByInterval(products, "month");
	const yearlyProduct = findPaidProductByInterval(products, "year");

	logger.info("GetProductPrices: Product matching results", {
		foundMonthly: !!monthlyProduct,
		foundYearly: !!yearlyProduct,
		monthlyPriceId: monthlyProduct?.prices?.[0]?.id,
		yearlyPriceId: yearlyProduct?.prices?.[0]?.id,
	});

	if (!monthlyProduct?.prices?.[0]?.id || !yearlyProduct?.prices?.[0]?.id) {
		logger.warn("GetProductPrices: Missing price information", {
			monthlyProduct: monthlyProduct
				? {
						id: monthlyProduct.id,
						priceCount: monthlyProduct.prices?.length || 0,
					}
				: null,
			yearlyProduct: yearlyProduct
				? {
						id: yearlyProduct.id,
						priceCount: yearlyProduct.prices?.length || 0,
					}
				: null,
		});
	}

	return {
		monthlyPriceId: monthlyProduct?.prices?.[0]?.id,
		yearlyPriceId: yearlyProduct?.prices?.[0]?.id,
		monthlyProduct,
		yearlyProduct,
	};
}

export async function getProducts() {
	const polar = createPolarClient();

	logger.info("GetProducts: Fetching products from Polar");

	// Fetch all products from Polar
	const productsResponse = await polar.products.list({});
	const products = productsResponse.result?.items || [];

	logger.info("GetProducts: Products fetched", {
		productCount: products.length,
		products: products.map((p) => ({
			id: p.id,
			name: p.name,
			recurringInterval: p.recurringInterval,
		})),
	});

	// Use consistent product matching strategy (paid products only)
	const monthlyProduct = findPaidProductByInterval(products, "month");
	const yearlyProduct = findPaidProductByInterval(products, "year");

	logger.info("GetProducts: Product matching results", {
		foundMonthly: !!monthlyProduct,
		foundYearly: !!yearlyProduct,
		monthlyId: monthlyProduct?.id,
		yearlyId: yearlyProduct?.id,
	});

	if (!monthlyProduct?.id || !yearlyProduct?.id) {
		logger.error("GetProducts: Products not configured properly", {
			monthlyProduct: monthlyProduct
				? { id: monthlyProduct.id, name: monthlyProduct.name }
				: null,
			yearlyProduct: yearlyProduct
				? { id: yearlyProduct.id, name: yearlyProduct.name }
				: null,
			allProducts: products.map((p) => ({
				id: p.id,
				name: p.name,
				interval: p.recurringInterval,
			})),
		});
		throw new Error(
			"Products not configured properly - missing monthly or yearly product"
		);
	}

	return {
		monthlyProductId: monthlyProduct.id,
		yearlyProductId: yearlyProduct.id,
		monthlyProduct,
		yearlyProduct,
	};
}
