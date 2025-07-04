import {
	boolean,
	foreignKey,
	index,
	integer,
	jsonb,
	pgEnum,
	pgSchema,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
	vector,
} from "drizzle-orm/pg-core";

// Enums
export const planId = pgEnum("plan_id", ["free", "monthly", "yearly"]);
export const subscriptionStatus = pgEnum("subscription_status", [
	"trialing",
	"active",
	"canceled",
	"incomplete",
	"incomplete_expired",
	"past_due",
	"unpaid",
	"paused",
]);
export const userRole = pgEnum("user_role", ["student", "instructor", "admin"]);

// Processing metadata type for course materials - DOCUMENT PROCESSING ONLY
export type ProcessingMetadata = {
	processingStatus?: "pending" | "processing" | "completed" | "failed";
	error?: string;
	processingTimeMs?: number;
	extractedText?: boolean;
	chunkingCompleted?: boolean;
	embeddingCompleted?: boolean;

	// Future content type processing metadata
	videoDurationMs?: number; // For videos
	audioTranscribed?: boolean; // For audio
	thumbnailGenerated?: boolean; // For videos/images
	contentExtracted?: boolean; // For weblinks
};

// Week-level content generation metadata type - AI CONTENT GENERATION TRACKING
export type WeekContentGenerationMetadata = {
	// Batch trigger information
	batchInfo?: {
		goldenNotes: { batchId: string; status?: string };
		flashcards: { batchId: string; status?: string };
		mcqs: { batchId: string; status?: string };
		openQuestions: { batchId: string; status?: string };
		summaries: { batchId: string; status?: string };
	};

	// Content generation results
	totalMaterialsProcessed?: number;
	generationResults?: {
		totalGenerated: number;
		contentCounts: {
			goldenNotes: number;
			flashcards: number;
			mcqs: number;
			openQuestions: number;
			summaries: number;
		};
		generatedAt: string;
	};

	// Timing information
	startedAt?: string;
	completedAt?: string;
	durationMs?: number;

	// Error handling
	errors?: string[];
	partialSuccess?: boolean;
};

// Content metadata type for different content types
export type ContentMetadata = {
	// PDF-specific
	pageCount?: number;
	pdfVersion?: string;
	hasImages?: boolean;

	// Video-specific (future)
	duration?: number;
	resolution?: string;
	format?: string;
	frameRate?: number;

	// Audio-specific (future)
	sampleRate?: number;
	bitrate?: number;

	// Image-specific (future)
	width?: number;
	height?: number;

	// Weblink-specific (future)
	url?: string;
	title?: string;
	domain?: string;
	scrapedAt?: string;

	// Common
	language?: string;
	encoding?: string;
};

// This is a minimal definition of the auth.users table from Supabase.
// It's used to establish a foreign key relationship with the public.users table.
// It is managed by Supabase so we are only defining it for type safety.
export const usersInAuth = pgSchema("auth").table("users", {
	id: uuid("id").primaryKey(),
});

// Course materials table
export const courseMaterials = pgTable(
	"course_materials",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		courseId: uuid("course_id").notNull(),
		weekId: uuid("week_id"),
		title: varchar({ length: 255 }).notNull(),
		fileName: varchar("file_name", { length: 255 }),
		filePath: varchar("file_path", { length: 500 }),
		fileSize: integer("file_size"),
		mimeType: varchar("mime_type", { length: 100 }),
		uploadStatus: varchar("upload_status", { length: 50 }).default("pending"),
		processingMetadata: jsonb("processing_metadata"),
		runId: text("run_id"),
		uploadedBy: uuid("uploaded_by").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		embeddingStatus: varchar("embedding_status", { length: 50 }).default("pending"),
		embeddingMetadata: jsonb("embedding_metadata").default({}),
		totalChunks: integer("total_chunks").default(0),
		embeddedChunks: integer("embedded_chunks").default(0),

		// New columns for standalone materials
		contentType: varchar("content_type", { length: 50 }).default("pdf"),
		originalFilename: varchar("original_filename", { length: 255 }),
		processingStartedAt: timestamp("processing_started_at"),
		processingCompletedAt: timestamp("processing_completed_at"),
		contentMetadata: jsonb("content_metadata").default({}),
		sourceUrl: text("source_url"), // For weblinks in future
		transcriptPath: varchar("transcript_path", { length: 500 }), // For video/audio in future
		thumbnailPath: varchar("thumbnail_path", { length: 500 }), // For videos/images in future
	},
	(table) => [
		index("idx_course_materials_course_id").using("btree", table.courseId),
		index("idx_course_materials_content_type").using("btree", table.contentType),
		index("idx_course_materials_processing_status").using("btree", table.processingMetadata),
	]
);

// Course weeks table
export const courseWeeks = pgTable(
	"course_weeks",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		courseId: uuid("course_id").notNull(),
		weekNumber: integer("week_number").notNull(),
		title: varchar({ length: 255 }),
		startDate: timestamp("start_date"),
		endDate: timestamp("end_date"),
		isActive: boolean("is_active").default(true),

		// Content generation tracking
		contentGenerationStatus: varchar("content_generation_status", { length: 50 }).default(
			"pending"
		),
		contentGenerationMetadata: jsonb("content_generation_metadata").default({}),
		contentGenerationTriggeredAt: timestamp("content_generation_triggered_at"),
		contentGenerationCompletedAt: timestamp("content_generation_completed_at"),

		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_course_weeks_course_id").using("btree", table.courseId),
		index("idx_course_weeks_content_generation_status").using(
			"btree",
			table.contentGenerationStatus
		),
		unique("course_weeks_course_id_week_number_unique").on(table.courseId, table.weekNumber),
	]
);

// Courses table
export const courses = pgTable(
	"courses",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		userId: uuid("user_id").notNull(),
		name: varchar({ length: 255 }).notNull(),
		description: text(),
		language: varchar({ length: 50 }).default("english"),
		durationWeeks: integer("duration_weeks").default(12),
		isActive: boolean("is_active").default(true),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [index("idx_courses_user_id").using("btree", table.userId)]
);

// Document chunks table
export const documentChunks = pgTable(
	"document_chunks",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		materialId: uuid("material_id").notNull(),
		content: text().notNull(),
		embedding: vector({ dimensions: 1536 }),
		metadata: jsonb().default({}),
		chunkIndex: integer("chunk_index").notNull(),
		tokenCount: integer("token_count"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_document_chunks_chunk_index").using(
			"btree",
			table.materialId.asc().nullsLast().op("uuid_ops"),
			table.chunkIndex.asc().nullsLast().op("int4_ops")
		),
		index("idx_document_chunks_embedding").using(
			"hnsw",
			table.embedding.asc().nullsLast().op("vector_cosine_ops")
		),
		index("idx_document_chunks_material_id").using(
			"btree",
			table.materialId.asc().nullsLast().op("uuid_ops")
		),
	]
);

// Flashcards table - AI generated study cards
export const flashcards = pgTable(
	"flashcards",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		materialId: uuid("material_id"),
		question: text().notNull(),
		answer: text().notNull(),
		difficulty: varchar({ length: 20 }).default("intermediate"),
		metadata: jsonb().default({}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		weekId: uuid("week_id"),
	},
	(table) => [
		index("idx_flashcards_material_id").using("btree", table.materialId),
		index("idx_flashcards_difficulty").using("btree", table.difficulty),
		index("idx_flashcards_week_id").using("btree", table.weekId),
	]
);

// Multiple choice questions table - AI generated MCQs
export const multipleChoiceQuestions = pgTable(
	"multiple_choice_questions",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		materialId: uuid("material_id"),
		question: text().notNull(),
		options: jsonb().notNull(), // Array of strings ['A', 'B', 'C', 'D']
		correctAnswer: varchar("correct_answer", { length: 5 }).notNull(),
		explanation: text(),
		difficulty: varchar({ length: 20 }).default("intermediate"),
		metadata: jsonb().default({}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		weekId: uuid("week_id"),
	},
	(table) => [
		index("idx_mcq_material_id").using("btree", table.materialId),
		index("idx_mcq_difficulty").using("btree", table.difficulty),
		index("idx_mcq_week_id").using("btree", table.weekId),
	]
);

// Open questions table - AI generated essay/discussion questions
export const openQuestions = pgTable(
	"open_questions",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		materialId: uuid("material_id"),
		question: text().notNull(),
		sampleAnswer: text("sample_answer"),
		gradingRubric: jsonb("grading_rubric"),
		difficulty: varchar({ length: 20 }).default("intermediate"),
		metadata: jsonb().default({}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		weekId: uuid("week_id"),
	},
	(table) => [
		index("idx_open_questions_material_id").using("btree", table.materialId),
		index("idx_open_questions_difficulty").using("btree", table.difficulty),
		index("idx_open_questions_week_id").using("btree", table.weekId),
	]
);

// Summaries table - AI generated content summaries
export const summaries = pgTable(
	"summaries",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		materialId: uuid("material_id"),
		title: varchar({ length: 255 }),
		content: text().notNull(),
		summaryType: varchar("summary_type", { length: 50 }).default("general"), // 'general', 'executive', 'detailed'
		wordCount: integer("word_count"),
		metadata: jsonb().default({}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		weekId: uuid("week_id"),
	},
	(table) => [
		index("idx_summaries_material_id").using("btree", table.materialId),
		index("idx_summaries_type").using("btree", table.summaryType),
		index("idx_summaries_week_id").using("btree", table.weekId),
	]
);

// Golden notes table - AI generated key concepts and important points
export const goldenNotes = pgTable(
	"golden_notes",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		materialId: uuid("material_id"),
		title: varchar({ length: 255 }).notNull(),
		content: text().notNull(),
		priority: integer().default(1),
		category: varchar({ length: 100 }),
		metadata: jsonb().default({}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		weekId: uuid("week_id"),
	},
	(table) => [
		index("idx_golden_notes_material_id").using("btree", table.materialId),
		index("idx_golden_notes_priority").using("btree", table.priority),
		index("idx_golden_notes_category").using("btree", table.category),
		index("idx_golden_notes_week_id").using("btree", table.weekId),
	]
);

// Own notes table - User-created notes and annotations
export const ownNotes = pgTable(
	"own_notes",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		userId: uuid("user_id").notNull(),
		materialId: uuid("material_id"), // Optional - can be linked to specific material
		courseId: uuid("course_id"), // Optional - can be linked to course
		title: varchar({ length: 255 }).notNull(),
		content: text().notNull(),
		noteType: varchar("note_type", { length: 50 }).default("general"), // 'general', 'annotation', 'summary', 'question'
		tags: jsonb().default([]), // Array of user-defined tags
		isPrivate: boolean("is_private").default(true), // User can make notes shareable
		color: varchar({ length: 20 }).default("#ffffff"), // Note color for organization
		position: jsonb(), // For annotations linked to specific content positions
		metadata: jsonb().default({}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_own_notes_user_id").using("btree", table.userId),
		index("idx_own_notes_material_id").using("btree", table.materialId),
		index("idx_own_notes_course_id").using("btree", table.courseId),
		index("idx_own_notes_note_type").using("btree", table.noteType),
		index("idx_own_notes_created_at").using("btree", table.createdAt),
	]
);

// Generation configurations table - Critical for adaptive learning
export const generationConfigs = pgTable(
	"generation_configs",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		materialId: uuid("material_id").notNull(),
		userId: uuid("user_id").notNull(),
		configSource: varchar("config_source", { length: 50 }).notNull(), // 'user_preference', 'adaptive_algorithm', etc.

		// Core generation settings
		goldenNotesCount: integer("golden_notes_count").notNull(),
		flashcardsCount: integer("flashcards_count").notNull(),
		summaryLength: integer("summary_length").notNull(),
		examExercisesCount: integer("exam_exercises_count").notNull(),
		mcqExercisesCount: integer("mcq_exercises_count").notNull(),
		difficulty: varchar({ length: 20 }).notNull(),
		focus: varchar({ length: 20 }).notNull(),

		// Adaptive learning metadata
		adaptationReason: text("adaptation_reason"),
		userPerformanceLevel: varchar("user_performance_level", { length: 20 }),
		learningGaps: jsonb("learning_gaps").default([]),

		// Tracking
		isActive: boolean("is_active").default(true),
		appliedAt: timestamp("applied_at").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_generation_configs_material_id").using("btree", table.materialId),
		index("idx_generation_configs_user_id").using("btree", table.userId),
		index("idx_generation_configs_source").using("btree", table.configSource),
		index("idx_generation_configs_difficulty").using("btree", table.difficulty),
		index("idx_generation_configs_performance").using("btree", table.userPerformanceLevel),
		index("idx_generation_configs_active").using("btree", table.isActive),
		foreignKey({
			columns: [table.materialId],
			foreignColumns: [courseMaterials.id],
			name: "generation_configs_material_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInAuth.id],
			name: "generation_configs_user_id_fkey",
		}).onDelete("cascade"),
	]
);

// Add exams table

// User progress tracking table
export const userProgress = pgTable(
	"user_progress",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		userId: uuid("user_id").notNull(),
		contentType: varchar("content_type", { length: 50 }).notNull(), // 'flashcard', 'mcq', 'open_question'
		contentId: uuid("content_id").notNull(), // references flashcards/mcqs/open_questions
		status: varchar({ length: 20 }).default("not_started"), // 'not_started', 'in_progress', 'completed'
		score: integer(), // Score out of 100
		attempts: integer().default(0),
		lastAttemptAt: timestamp("last_attempt_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		unique("user_progress_unique").on(table.userId, table.contentType, table.contentId),
		index("idx_user_progress_user_id").using("btree", table.userId),
		index("idx_user_progress_content").using("btree", table.contentType, table.contentId),
		index("idx_user_progress_status").using("btree", table.status),
	]
);

// User plans table
export const userPlans = pgTable(
	"user_plans",
	{
		userPlanId: uuid("user_plan_id").defaultRandom().primaryKey().notNull(),
		userId: uuid("user_id").notNull(),
		planId: planId("plan_id").notNull(),
		startedAt: timestamp("started_at").defaultNow().notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
		stripePriceId: varchar("stripe_price_id", { length: 255 }),
		subscriptionStatus: subscriptionStatus("subscription_status"),
		currentPeriodEnd: timestamp("current_period_end"),
	},
	(table) => [unique("user_plans_stripe_subscription_id_unique").on(table.stripeSubscriptionId)]
);

// Users table
export const users = pgTable(
	"users",
	{
		userId: uuid("user_id").primaryKey().notNull(),
		email: varchar({ length: 255 }).notNull(),
		firstName: varchar("first_name", { length: 100 }),
		lastName: varchar("last_name", { length: 100 }),
		role: userRole().default("student").notNull(),
		avatarUrl: varchar("avatar_url", { length: 500 }),
		timezone: varchar({ length: 50 }).default("UTC"),
		preferences: jsonb(),
		isActive: boolean("is_active").default(true).notNull(),
		lastLoginAt: timestamp("last_login_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
		signupStep: integer("signup_step").default(1).notNull(),
		country: varchar({ length: 100 }),
	},
	(table) => [
		unique("users_email_unique").on(table.email),
		unique("users_stripe_customer_id_unique").on(table.stripeCustomerId),
	]
);
