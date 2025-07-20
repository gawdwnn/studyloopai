"use server";

import { db } from "@/db";
import { courseMaterials } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import { getUserFriendlyErrorMessage } from "@/lib/utils/error-messages";
import { and, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
	materialIds: z
		.array(z.string().uuid("Invalid material ID"))
		.min(1, "At least one material ID is required")
		.max(5, "Maximum 5 materials allowed per batch"),
});

export async function POST(req: NextRequest) {
	try {
		const json = await req.json();
		const body = BodySchema.parse(json);

		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
		}

		const updateResult = await db
			.update(courseMaterials)
			.set({ 
				uploadStatus: "failed",
			})
			.where(
				and(
					inArray(courseMaterials.id, body.materialIds),
					eq(courseMaterials.uploadedBy, user.id),
					eq(courseMaterials.uploadStatus, "pending")
				)
			)
			.returning({ id: courseMaterials.id });

		if (updateResult.length === 0) {
			return NextResponse.json(
				{ error: "No matching pending materials found" },
				{ status: 404 }
			);
		}

		console.log(`Upload failed for ${updateResult.length} materials:`, {
			materialIds: updateResult.map(m => m.id),
			userId: user.id,
		});

		return NextResponse.json({
			success: true,
			updatedCount: updateResult.length,
		});
	} catch (err) {
		console.error("Upload failure tracking error:", err);
		
		const userMessage = getUserFriendlyErrorMessage(
			err instanceof Error ? err : "Unknown error occurred"
		);
		
		return NextResponse.json(
			{ error: userMessage },
			{ status: 400 }
		);
	}
}