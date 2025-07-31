"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function skipOnboarding() {
	const supabase = await getServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return { error: "You must be logged in to do this." };
	}

	try {
		await db
			.update(users)
			.set({ onboardingSkipped: true })
			.where(eq(users.userId, user.id));

		revalidatePath("/", "layout");
		return { success: true };
	} catch (error) {
		logger.error("Failed to skip onboarding", {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			action: "skipOnboarding",
			userId: user.id,
		});
		return { error: "Could not update your onboarding status." };
	}
}

export async function completeOnboarding() {
	const supabase = await getServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return { error: "You must be logged in to do this." };
	}

	try {
		await db
			.update(users)
			.set({ onboardingCompleted: true })
			.where(eq(users.userId, user.id));

		revalidatePath("/", "layout");
		return { success: true };
	} catch (error) {
		logger.error("Failed to complete onboarding", {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			action: "completeOnboarding",
			userId: user.id,
		});
		return { error: "Could not update your onboarding status." };
	}
}
