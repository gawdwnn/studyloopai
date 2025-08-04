ALTER TABLE "user_plans" RENAME COLUMN "stripe_subscription_id" TO "polar_subscription_id";--> statement-breakpoint
ALTER TABLE "user_plans" RENAME COLUMN "stripe_price_id" TO "polar_price_id";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "stripe_customer_id" TO "polar_customer_id";--> statement-breakpoint
ALTER TABLE "user_plans" DROP CONSTRAINT "user_plans_stripe_subscription_id_unique";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_stripe_customer_id_unique";--> statement-breakpoint
ALTER TABLE "user_plans" ADD COLUMN "polar_checkout_id" varchar(255);--> statement-breakpoint
ALTER TABLE "user_plans" ADD COLUMN "polar_order_id" varchar(255);--> statement-breakpoint
ALTER TABLE "user_plans" ADD CONSTRAINT "user_plans_polar_subscription_id_unique" UNIQUE("polar_subscription_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_polar_customer_id_unique" UNIQUE("polar_customer_id");