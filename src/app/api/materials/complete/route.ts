"use server";

import { db } from "@/db";
import { courseMaterials } from "@/db/schema";
import { getServerClient } from "@/lib/supabase/server";
import type { ingestCourseMaterials } from "@/trigger/ingest-course-materials";
import { tasks } from "@trigger.dev/sdk";
import { inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
	materialIds: z.array(z.string().min(1)).min(1),
});

export async function POST(req: NextRequest) {
	try {
		const json = await req.json();
		const body = BodySchema.parse(json);

		const supabase = await getServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

		// Fetch materials that belong to the user
		const materials = await db
			.select()
			.from(courseMaterials)
			.where(inArray(courseMaterials.id, body.materialIds));

		const userMaterials = materials.filter((m) => m.uploadedBy === user.id);

		if (userMaterials.length === 0)
			return NextResponse.json({ error: "No matching materials" }, { status: 404 });

		// Ensure all materials have a filePath (upload finished)
		const ingestMaterials = userMaterials.filter((m) => m.filePath);

		if (ingestMaterials.length === 0) {
			return NextResponse.json({ error: "Uploads not finished" }, { status: 400 });
		}

		// Update uploadStatus to completed
		await db
			.update(courseMaterials)
			.set({ uploadStatus: "completed" })
			.where(
				inArray(
					courseMaterials.id,
					ingestMaterials.map((m) => m.id)
				)
			);

		// Trigger ingest task for those materials
		const ingestHandle = await tasks.trigger<typeof ingestCourseMaterials>(
			"ingest-course-materials",
			{
				userId: user.id,
				materials: ingestMaterials.map((m) => ({
					materialId: m.id,
					filePath: m.filePath as string,
					contentType: m.contentType as string,
				})),
			}
		);

		return NextResponse.json({
			success: true,
			runId: ingestHandle.id,
			publicAccessToken: ingestHandle.publicAccessToken,
		});
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 400 }
		);
	}
}
