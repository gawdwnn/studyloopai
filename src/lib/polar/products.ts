import { PLANS, priceUtils } from "@/lib/config/plans";
import { createLogger } from "@/lib/utils/logger";
import { createPolarClient } from "./client";

const logger = createLogger("billing:products");

export async function createProducts() {
	const polar = createPolarClient();
	const monthlyPlan = PLANS.find((p) => p.id === "monthly");
	const yearlyPlan = PLANS.find((p) => p.id === "yearly");

	if (!monthlyPlan || !yearlyPlan) {
		throw new Error("Monthly or yearly plan not found");
	}

	// Create monthly product
	const monthlyProduct = await polar.products.create({
		name: "StudyLoop Pro Monthly",
		description: "Monthly subscription to StudyLoop Pro",
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
		description: "Yearly subscription to StudyLoop Pro - Save $1.00/month",
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

	return { monthlyProduct, yearlyProduct };
}

export async function getProductPrices() {
	const polar = createPolarClient();

	// Fetch all products from Polar using the same pattern as getProducts()
	const productsResponse = await polar.products.list({});
	const products = productsResponse.result?.items || [];

	const monthlyProduct = products.find((p) => p.name?.includes("Monthly"));
	const yearlyProduct = products.find((p) => p.name?.includes("Yearly"));

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

	// More robust product matching based on recurring interval
	const monthlyProduct = products.find((p) => p.recurringInterval === "month");
	const yearlyProduct = products.find((p) => p.recurringInterval === "year");

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
