import { getAdminDatabaseAccess } from "@/db";
import type {
	CourseMaterial,
	CourseWeekFeatures,
	DocumentChunk,
} from "@/types/database-types";

/**
 * Service layer for database operations in background jobs
 * Uses Supabase admin client to bypass RLS policies
 */

/**
 * Update generation config status in courseweekfeatures table
 * MODIFIED: Now updates courseweekfeatures instead of generation_configs
 */
export async function updateGenerationConfigStatus(
	configId: string, // Same parameter - now courseweekfeatures.id
	status: "pending" | "processing" | "completed" | "failed",
	additionalData?: {
		generationStartedAt?: Date;
		generationCompletedAt?: Date;
		failedFeatures?: Array<{
			feature: string;
			timestamp: Date;
			retryCount?: number;
		}>;
	}
): Promise<CourseWeekFeatures> {
	const admin = getAdminDatabaseAccess();

	// Failed features tracking
	let failedFeaturesData = null;
	if (additionalData?.failedFeatures?.length) {
		failedFeaturesData = additionalData.failedFeatures.map((failure) => ({
			feature: failure.feature,
			timestamp: failure.timestamp.toISOString(),
			retryCount: failure.retryCount || 0,
		}));
	}

	const updateData = {
		generation_status: status,
		updated_at: new Date().toISOString(),
		...(additionalData?.generationStartedAt && {
			generation_started_at: additionalData.generationStartedAt.toISOString(),
		}),
		...(additionalData?.generationCompletedAt && {
			generation_completed_at:
				additionalData.generationCompletedAt.toISOString(),
		}),
		...(failedFeaturesData && {
			failed_features: JSON.stringify(failedFeaturesData),
		}),
	};

	const { data, error } = await admin
		.from("course_week_features")
		.update(updateData)
		.eq("id", configId)
		.select()
		.single();

	if (error) {
		throw new Error(
			`Failed to update generation config status: ${error.message}`
		);
	}

	return data;
}

/**
 * Get course materials by IDs
 */
export async function getCourseMaterialsByIds(
	materialIds: string[]
): Promise<Array<{ week_id: string | null; course_id: string | null }>> {
	const admin = getAdminDatabaseAccess();
	const { data, error } = await admin
		.from("course_materials")
		.select("week_id, course_id")
		.in("id", materialIds);

	if (error) {
		throw new Error(`Failed to get course materials: ${error.message}`);
	}

	return data as Array<{ week_id: string | null; course_id: string | null }>;
}

/**
 * Update course material status
 */
export async function updateCourseMaterialStatus(
	materialId: string,
	status: "pending" | "processing" | "completed" | "failed",
	additionalData?: {
		processingStartedAt?: Date;
		processingCompletedAt?: Date;
		errorMessage?: string;
	}
): Promise<CourseMaterial> {
	const admin = getAdminDatabaseAccess();

	interface UpdateData {
		embedding_status: string;
		processing_started_at?: string;
		processing_completed_at?: string;
		error_message?: string;
	}

	const updateData: UpdateData = {
		embedding_status: status,
	};

	if (additionalData?.processingStartedAt) {
		updateData.processing_started_at =
			additionalData.processingStartedAt.toISOString();
	}
	if (additionalData?.processingCompletedAt) {
		updateData.processing_completed_at =
			additionalData.processingCompletedAt.toISOString();
	}
	if (additionalData?.errorMessage) {
		updateData.error_message = additionalData.errorMessage;
	}

	const { data, error } = await admin
		.from("course_materials")
		.update(updateData)
		.eq("id", materialId)
		.select()
		.single();

	if (error) {
		throw new Error(`Failed to update course material: ${error.message}`);
	}

	return data as CourseMaterial;
}

/**
 * Insert document chunks
 */
export async function insertDocumentChunks(
	chunks: Array<{
		material_id: string;
		content: string;
		embedding: number[];
		chunk_index: number;
		token_count: number;
	}>
): Promise<DocumentChunk[]> {
	const admin = getAdminDatabaseAccess();
	const { data, error } = await admin
		.from("document_chunks")
		.insert(chunks)
		.select();

	if (error) {
		throw new Error(`Failed to insert document chunks: ${error.message}`);
	}

	return data as DocumentChunk[];
}

/**
 * Get document chunks for a material
 */
export async function getMaterialChunks(materialId: string): Promise<string[]> {
	const admin = getAdminDatabaseAccess();
	const { data, error } = await admin
		.from("document_chunks")
		.select("content")
		.eq("material_id", materialId)
		.order("chunk_index", { ascending: true });

	if (error) {
		throw new Error(`Failed to get material chunks: ${error.message}`);
	}

	return (data as Array<{ content: string }>).map((chunk) => chunk.content);
}

/**
 * Get combined chunks from multiple materials
 */
export async function getCombinedChunks(
	materialIds: string[]
): Promise<string[]> {
	const allChunks: string[] = [];
	for (const id of materialIds) {
		const materialChunks = await getMaterialChunks(id);
		allChunks.push(...materialChunks);
	}
	return allChunks;
}

/**
 * Get user plan information by user ID - more efficient than by material ID
 */
export async function getUserPlanByUserId(userId: string): Promise<{
	userPlan: "free" | "monthly" | "yearly";
}> {
	const admin = getAdminDatabaseAccess();

	const { data: userData, error: userError } = await admin
		.from("users")
		.select(`
			user_plans!inner(
				plan_id,
				is_active
			)
		`)
		.eq("user_id", userId)
		.single();

	if (userError) {
		throw new Error(`Failed to get user data: ${userError.message}`);
	}

	const userPlans = Array.isArray(userData.user_plans)
		? userData.user_plans
		: [userData.user_plans];

	const activePlan = userPlans.find(
		(plan: { plan_id: string; is_active: boolean }) => plan?.is_active
	);

	return {
		userPlan: activePlan?.plan_id,
	};
}
