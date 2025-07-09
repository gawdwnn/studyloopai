-- Fix generation_configs schema: Remove remaining old column
-- This addresses the NOT NULL constraint violation on flashcards_count

ALTER TABLE "generation_configs" DROP COLUMN "flashcards_count";