"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
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
		await db.update(users).set({ onboardingSkipped: true }).where(eq(users.userId, user.id));

		revalidatePath("/", "layout");
		return { success: true };
	} catch (error) {
		console.error("Error skipping onboarding:", error);
		return { error: "Could not update your onboarding status." };
	}
}
