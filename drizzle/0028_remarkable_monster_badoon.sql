CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"operation_type" varchar(50) NOT NULL,
	"resource_id" varchar(255),
	"user_id" uuid,
	"status" varchar(20) DEFAULT 'processing' NOT NULL,
	"result_data" jsonb,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"last_retry_at" timestamp,
	"processing_started_at" timestamp DEFAULT now() NOT NULL,
	"processing_completed_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb,
	CONSTRAINT "idempotency_keys_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_idempotency_keys_operation_type" ON "idempotency_keys" USING btree ("operation_type");--> statement-breakpoint
CREATE INDEX "idx_idempotency_keys_resource_id" ON "idempotency_keys" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "idx_idempotency_keys_user_id" ON "idempotency_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_idempotency_keys_status" ON "idempotency_keys" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_idempotency_keys_expires_at" ON "idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_idempotency_keys_created_at" ON "idempotency_keys" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_idempotency_keys_expires_status" ON "idempotency_keys" USING btree ("expires_at","status");--> statement-breakpoint
CREATE INDEX "idx_idempotency_keys_retry_tracking" ON "idempotency_keys" USING btree ("status","retry_count","last_retry_at");