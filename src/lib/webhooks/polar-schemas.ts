import { z } from "zod";

// Common base schemas
const timestampSchema = z
	.string()
	.datetime()
	.transform((str) => new Date(str));
const uuidSchema = z.string().uuid();

// Common metadata schema for Polar webhooks (snake_case from Polar)
export const PolarMetadataSchema = z
	.object({
		userId: uuidSchema,
		planId: z.enum(["monthly", "yearly"]).optional(),
		context: z.enum(["onboarding", "account"]).optional(),
	})
	.strict();

// Price schema exactly matching Polar webhook structure
export const PolarPriceSchema = z.object({
	id: z.string(),
	price_amount: z.number().min(0),
	price_currency: z.string().length(3),
	recurring_interval: z.enum(["month", "year"]).optional(),
	type: z.enum(["one_time", "recurring"]).optional(),
	amount_type: z.string().optional(),
	is_archived: z.boolean().optional(),
	product_id: z.string().optional(),
	created_at: timestampSchema.optional(),
	modified_at: timestampSchema.nullable().optional(),
});

// Product schema (matching Polar structure)
export const PolarProductSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	is_recurring: z.boolean().optional(),
	recurring_interval: z.enum(["month", "year"]).optional(),
	organization_id: z.string().optional(),
	is_archived: z.boolean().optional(),
	created_at: timestampSchema.optional(),
	modified_at: timestampSchema.nullable().optional(),
	metadata: z.record(z.any()).optional(),
	prices: z.array(PolarPriceSchema).optional(),
	benefits: z.array(z.any()).optional(),
	medias: z.array(z.any()).optional(),
	attached_custom_fields: z.array(z.any()).optional(),
});

// Customer schema (matching Polar structure)
export const PolarCustomerSchema = z.object({
	id: z.string(),
	email: z.string().email(),
	name: z.string().optional(),
	created_at: timestampSchema.optional(),
	modified_at: timestampSchema.nullable().optional(),
	organization_id: z.string().optional(),
	avatar_url: z.string().nullable().optional(),
	email_verified: z.boolean().optional(),
	billing_address: z
		.object({
			line1: z.string().nullable().optional(),
			line2: z.string().nullable().optional(),
			postal_code: z.string().nullable().optional(),
			city: z.string().nullable().optional(),
			state: z.string().nullable().optional(),
			country: z.string().nullable().optional(),
		})
		.optional(),
	tax_id: z.string().nullable().optional(),
	external_id: z.string().nullable().optional(),
	deleted_at: timestampSchema.nullable().optional(),
	metadata: z.record(z.any()).optional(),
});

// Subscription schema matching actual Polar webhook payload
const subscriptionSchema = z.object({
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
	created_at: timestampSchema,
	modified_at: timestampSchema.nullable().optional(),
	amount: z.number(),
	currency: z.string(),
	recurring_interval: z.enum(["month", "year"]),
	current_period_start: timestampSchema,
	current_period_end: timestampSchema,
	cancel_at_period_end: z.boolean(),
	canceled_at: timestampSchema.nullable().optional(),
	started_at: timestampSchema,
	ends_at: timestampSchema.nullable().optional(),
	ended_at: timestampSchema.nullable().optional(),
	customer_id: z.string(),
	product_id: z.string(),
	discount_id: z.string().nullable().optional(),
	checkout_id: z.string().optional(),
	price_id: z.string(),
	user_id: z.string().optional(),
	customer_cancellation_reason: z.string().nullable().optional(),
	customer_cancellation_comment: z.string().nullable().optional(),
	metadata: PolarMetadataSchema.optional(),
	custom_field_data: z.record(z.any()).optional(),
	// Nested objects
	customer: PolarCustomerSchema.optional(),
	user: z
		.object({
			id: z.string(),
			email: z.string(),
			public_name: z.string().optional(),
			avatar_url: z.string().nullable().optional(),
			github_username: z.string().nullable().optional(),
		})
		.optional(),
	product: PolarProductSchema.optional(),
	price: PolarPriceSchema.optional(),
	prices: z.array(PolarPriceSchema).optional(),
	discount: z.any().nullable().optional(),
	meters: z.array(z.any()).optional(),
});

// Polar Webhook Event Schemas
export const PolarSubscriptionCreatedSchema = z.object({
	type: z.literal("subscription.created"),
	data: subscriptionSchema,
});

export const PolarSubscriptionUpdatedSchema = z.object({
	type: z.literal("subscription.updated"),
	data: subscriptionSchema,
});

export const PolarSubscriptionCanceledSchema = z.object({
	type: z.literal("subscription.canceled"),
	data: subscriptionSchema,
});

export const PolarCheckoutCreatedSchema = z.object({
	type: z.literal("checkout.created"),
	data: z.object({
		id: z.string(),
		created_at: timestampSchema,
		modified_at: timestampSchema.nullable().optional(),
		custom_field_data: z.record(z.any()).optional(),
		payment_processor: z.string(),
		status: z.enum(["open", "expired", "confirmed"]),
		client_secret: z.string(),
		url: z.string().url(),
		expires_at: timestampSchema,
		success_url: z.string().url(),
		embed_origin: z.string().nullable().optional(),
		amount: z.number(),
		discount_amount: z.number(),
		net_amount: z.number(),
		tax_amount: z.number().nullable().optional(),
		total_amount: z.number(),
		currency: z.string(),
		product_id: z.string(),
		product_price_id: z.string(),
		discount_id: z.string().nullable().optional(),
		allow_discount_codes: z.boolean(),
		require_billing_address: z.boolean(),
		is_discount_applicable: z.boolean(),
		is_free_product_price: z.boolean(),
		is_payment_required: z.boolean(),
		is_payment_setup_required: z.boolean(),
		is_payment_form_required: z.boolean(),
		customer_id: z.string().nullable().optional(),
		is_business_customer: z.boolean(),
		customer_name: z.string().nullable().optional(),
		customer_email: z.string().nullable().optional(),
		customer_ip_address: z.string().nullable().optional(),
		customer_billing_name: z.string().nullable().optional(),
		customer_billing_address: z.any().nullable().optional(),
		customer_tax_id: z.string().nullable().optional(),
		payment_processor_metadata: z.record(z.any()),
		subtotal_amount: z.number(),
		customer_billing_address_fields: z.record(z.any()).optional(),
		billing_address_fields: z.record(z.any()),
		metadata: PolarMetadataSchema,
		external_customer_id: z.string().nullable().optional(),
		customer_external_id: z.string().nullable().optional(),
		products: z.array(PolarProductSchema),
		product: PolarProductSchema,
		product_price: PolarPriceSchema,
		discount: z.any().nullable().optional(),
		subscription_id: z.string().nullable().optional(),
		attached_custom_fields: z.array(z.any()),
		customer_metadata: z.record(z.any()),
	}),
});

export const PolarOrderCreatedSchema = z.object({
	type: z.literal("order.created"),
	data: z.object({
		id: z.string(),
		created_at: timestampSchema,
		modified_at: timestampSchema.nullable().optional(),
		status: z.enum(["pending", "paid", "refunded"]),
		paid: z.boolean(),
		subtotal_amount: z.number(),
		discount_amount: z.number(),
		net_amount: z.number(),
		amount: z.number(),
		tax_amount: z.number(),
		total_amount: z.number(),
		refunded_amount: z.number(),
		refunded_tax_amount: z.number(),
		currency: z.string(),
		billing_reason: z.string(),
		billing_name: z.string(),
		billing_address: z
			.object({
				line1: z.string().nullable().optional(),
				line2: z.string().nullable().optional(),
				postal_code: z.string().nullable().optional(),
				city: z.string().nullable().optional(),
				state: z.string().nullable().optional(),
				country: z.string().nullable().optional(),
			})
			.optional(),
		is_invoice_generated: z.boolean(),
		customer_id: z.string(),
		product_id: z.string(),
		product_price_id: z.string(),
		discount_id: z.string().nullable().optional(),
		subscription_id: z.string().optional(),
		checkout_id: z.string(),
		metadata: PolarMetadataSchema,
		custom_field_data: z.record(z.any()),
		user_id: z.string().optional(),
		// Nested objects
		customer: PolarCustomerSchema,
		user: z
			.object({
				id: z.string(),
				email: z.string(),
				public_name: z.string().optional(),
				avatar_url: z.string().nullable().optional(),
				github_username: z.string().nullable().optional(),
			})
			.optional(),
		product: PolarProductSchema,
		product_price: PolarPriceSchema,
		discount: z.any().nullable().optional(),
		subscription: subscriptionSchema.optional(),
		items: z
			.array(
				z.object({
					id: z.string(),
					created_at: timestampSchema,
					modified_at: timestampSchema.nullable().optional(),
					label: z.string(),
					amount: z.number(),
					tax_amount: z.number(),
					proration: z.boolean(),
					product_price_id: z.string(),
				})
			)
			.optional(),
	}),
});

// Remove unused checkout.updated schema since it's not in the processor
// Union of all Polar webhook events that are actually handled
export const PolarWebhookEventSchema = z.discriminatedUnion("type", [
	PolarSubscriptionCreatedSchema,
	PolarSubscriptionUpdatedSchema,
	PolarSubscriptionCanceledSchema,
	PolarCheckoutCreatedSchema,
	PolarOrderCreatedSchema,
]);

export type PolarWebhookEvent = z.infer<typeof PolarWebhookEventSchema>;

export function validatePolarWebhook(data: unknown): PolarWebhookEvent {
	return PolarWebhookEventSchema.parse(data);
}
