import { z } from "zod";

// Common base schemas
const timestampSchema = z
	.string()
	.datetime()
	.transform((str) => new Date(str));
const uuidSchema = z.string().uuid();

// Common metadata schema for Polar webhooks
export const PolarMetadataSchema = z
	.object({
		userId: uuidSchema,
		planId: z.enum(["monthly", "yearly"]).optional(),
		context: z.enum(["onboarding", "account"]).optional(),
	})
	.strict();

// Price schema for Polar webhooks
export const PolarPriceSchema = z.object({
	id: z.string(),
	amount: z.number().min(0),
	currency: z.string().length(3),
	recurringInterval: z.enum(["month", "year"]).optional(),
	type: z.enum(["one_time", "recurring"]).optional(),
});

// Product schema
export const PolarProductSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
});

// Customer schema
export const PolarCustomerSchema = z.object({
	id: z.string(),
	email: z.string().email(),
	name: z.string().optional(),
});

// Common subscription base
const subscriptionBaseSchema = z.object({
	id: z.string(),
	status: z.enum([
		"trialing",
		"active",
		"canceled",
		"incomplete",
		"incomplete_expired",
		"past_due",
		"unpaid",
		"paused",
	]),
	currentPeriodStart: timestampSchema.optional(),
	currentPeriodEnd: timestampSchema.optional(),
	canceledAt: timestampSchema.optional(),
	createdAt: timestampSchema,
	customerId: z.string().optional(),
	prices: z.array(PolarPriceSchema).optional(),
	products: z.array(PolarProductSchema).optional(),
	metadata: PolarMetadataSchema.optional(),
});

// Polar Webhook Event Schemas
export const PolarSubscriptionCreatedSchema = z.object({
	type: z.literal("subscription.created"),
	data: subscriptionBaseSchema,
});

export const PolarSubscriptionUpdatedSchema = z.object({
	type: z.literal("subscription.updated"),
	data: subscriptionBaseSchema,
});

export const PolarSubscriptionCanceledSchema = z.object({
	type: z.literal("subscription.canceled"),
	data: subscriptionBaseSchema.extend({
		canceledAt: timestampSchema,
	}),
});

export const PolarCheckoutCreatedSchema = z.object({
	type: z.literal("checkout.created"),
	data: z.object({
		id: z.string(),
		url: z.string().url().optional(),
		successUrl: z.string().url().optional(),
		status: z.enum(["open", "expired", "confirmed"]),
		customerId: z.string().optional(),
		customer: PolarCustomerSchema.optional(),
		products: z.array(PolarProductSchema).optional(),
		totalAmount: z.number().min(0).optional(),
		currency: z.string().length(3).optional(),
		metadata: PolarMetadataSchema.optional(),
		createdAt: timestampSchema,
		updatedAt: timestampSchema,
	}),
});

export const PolarCheckoutUpdatedSchema = z.object({
	type: z.literal("checkout.updated"),
	data: z.object({
		id: z.string(),
		status: z.enum(["open", "expired", "confirmed"]),
		customerId: z.string().optional(),
		metadata: PolarMetadataSchema.optional(),
		updatedAt: timestampSchema,
	}),
});

export const PolarOrderCreatedSchema = z.object({
	type: z.literal("order.created"),
	data: z.object({
		id: z.string(),
		amount: z.number().min(0),
		currency: z.string().length(3),
		customerId: z.string().optional(),
		customer: PolarCustomerSchema.optional(),
		products: z.array(PolarProductSchema).optional(),
		subscriptionId: z.string().optional(),
		checkoutId: z.string().optional(),
		metadata: PolarMetadataSchema.optional(),
		createdAt: timestampSchema,
	}),
});

// Union of all Polar webhook events
export const PolarWebhookEventSchema = z.discriminatedUnion("type", [
	PolarSubscriptionCreatedSchema,
	PolarSubscriptionUpdatedSchema,
	PolarSubscriptionCanceledSchema,
	PolarCheckoutCreatedSchema,
	PolarCheckoutUpdatedSchema,
	PolarOrderCreatedSchema,
]);

export type PolarWebhookEvent = z.infer<typeof PolarWebhookEventSchema>;

export function validatePolarWebhook(data: unknown): PolarWebhookEvent {
	return PolarWebhookEventSchema.parse(data);
}
