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
export const configurationSource = pgEnum("configuration_source", [
	"user_preference",
	"course_default",
	"course_week_override",
	"adaptive_algorithm",
	"system_default",
	"institution_default", // Future: institution-level defaults
]);

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
		cuecards: { batchId: string; status?: string };
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
			cuecards: number;
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
		language: varchar({ length: 50 }),
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

// Cuecards table - AI generated study cards
export const cuecards = pgTable(
	"cuecards",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		courseId: uuid("course_id").notNull(),
		weekId: uuid("week_id").notNull(),
		question: text().notNull(),
		answer: text().notNull(),
		difficulty: varchar({ length: 20 }).default("intermediate"),
		metadata: jsonb().default({}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_cuecards_course_id").using("btree", table.courseId),
		index("idx_cuecards_week_id").using("btree", table.weekId),
		index("idx_cuecards_difficulty").using("btree", table.difficulty),
		index("idx_cuecards_course_week").using("btree", table.courseId, table.weekId),
		foreignKey({
			columns: [table.courseId],
			foreignColumns: [courses.id],
			name: "cuecards_course_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.weekId],
			foreignColumns: [courseWeeks.id],
			name: "cuecards_week_id_fkey",
		}).onDelete("cascade"),
	]
);

// Multiple choice questions table - AI generated MCQs
export const multipleChoiceQuestions = pgTable(
	"multiple_choice_questions",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		courseId: uuid("course_id").notNull(),
		weekId: uuid("week_id").notNull(),
		question: text().notNull(),
		options: jsonb().notNull(), // Array of strings ['A', 'B', 'C', 'D']
		correctAnswer: varchar("correct_answer", { length: 5 }).notNull(),
		explanation: text(),
		difficulty: varchar({ length: 20 }).default("intermediate"),
		metadata: jsonb().default({}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_mcq_course_id").using("btree", table.courseId),
		index("idx_mcq_week_id").using("btree", table.weekId),
		index("idx_mcq_difficulty").using("btree", table.difficulty),
		index("idx_mcq_course_week").using("btree", table.courseId, table.weekId),
		foreignKey({
			columns: [table.courseId],
			foreignColumns: [courses.id],
			name: "multiple_choice_questions_course_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.weekId],
			foreignColumns: [courseWeeks.id],
			name: "multiple_choice_questions_week_id_fkey",
		}).onDelete("cascade"),
	]
);

// Open questions table - AI generated essay/discussion questions
export const openQuestions = pgTable(
	"open_questions",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		courseId: uuid("course_id").notNull(),
		weekId: uuid("week_id").notNull(),
		question: text().notNull(),
		sampleAnswer: text("sample_answer"),
		gradingRubric: jsonb("grading_rubric"),
		difficulty: varchar({ length: 20 }).default("intermediate"),
		metadata: jsonb().default({}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_open_questions_course_id").using("btree", table.courseId),
		index("idx_open_questions_week_id").using("btree", table.weekId),
		index("idx_open_questions_difficulty").using("btree", table.difficulty),
		index("idx_open_questions_course_week").using("btree", table.courseId, table.weekId),
		foreignKey({
			columns: [table.courseId],
			foreignColumns: [courses.id],
			name: "open_questions_course_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.weekId],
			foreignColumns: [courseWeeks.id],
			name: "open_questions_week_id_fkey",
		}).onDelete("cascade"),
	]
);

// Summaries table - AI generated content summaries
export const summaries = pgTable(
	"summaries",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		courseId: uuid("course_id").notNull(),
		weekId: uuid("week_id").notNull(),
		title: varchar({ length: 255 }),
		content: text().notNull(),
		summaryType: varchar("summary_type", { length: 50 }).default("general"), // 'general', 'executive', 'detailed'
		wordCount: integer("word_count"),
		metadata: jsonb().default({}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_summaries_course_id").using("btree", table.courseId),
		index("idx_summaries_week_id").using("btree", table.weekId),
		index("idx_summaries_type").using("btree", table.summaryType),
		index("idx_summaries_course_week").using("btree", table.courseId, table.weekId),
		foreignKey({
			columns: [table.courseId],
			foreignColumns: [courses.id],
			name: "summaries_course_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.weekId],
			foreignColumns: [courseWeeks.id],
			name: "summaries_week_id_fkey",
		}).onDelete("cascade"),
	]
);

// Golden notes table - AI generated key concepts and important points
export const goldenNotes = pgTable(
	"golden_notes",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		courseId: uuid("course_id").notNull(),
		weekId: uuid("week_id").notNull(),
		title: varchar({ length: 255 }).notNull(),
		content: text().notNull(),
		priority: integer().default(1),
		category: varchar({ length: 100 }),
		metadata: jsonb().default({}),
		version: integer().default(1).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_golden_notes_course_id").using("btree", table.courseId),
		index("idx_golden_notes_week_id").using("btree", table.weekId),
		index("idx_golden_notes_priority").using("btree", table.priority),
		index("idx_golden_notes_category").using("btree", table.category),
		index("idx_golden_notes_course_week").using("btree", table.courseId, table.weekId),
		foreignKey({
			columns: [table.courseId],
			foreignColumns: [courses.id],
			name: "golden_notes_course_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.weekId],
			foreignColumns: [courseWeeks.id],
			name: "golden_notes_week_id_fkey",
		}).onDelete("cascade"),
	]
);

// Own notes table - User-created notes and annotations
export const ownNotes = pgTable(
	"own_notes",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		userId: uuid("user_id").notNull(),
		weekId: uuid("week_id").notNull(),
		courseId: uuid("course_id").notNull(),
		title: varchar({ length: 255 }).notNull(),
		content: text().notNull(),
		noteType: varchar("note_type", { length: 50 }).default("general"),
		tags: jsonb().default([]),
		isPrivate: boolean("is_private").default(true),
		color: varchar({ length: 20 }).default("#ffffff"),
		metadata: jsonb().default({}),
		version: integer().default(1).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_own_notes_user_id").using("btree", table.userId),
		index("idx_own_notes_week_id").using("btree", table.weekId),
		index("idx_own_notes_course_id").using("btree", table.courseId),
		index("idx_own_notes_note_type").using("btree", table.noteType),
		index("idx_own_notes_created_at").using("btree", table.createdAt),
		index("idx_own_notes_course_week").using("btree", table.courseId, table.weekId),
		index("idx_own_notes_user_course").using("btree", table.userId, table.courseId),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInAuth.id],
			name: "own_notes_user_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.weekId],
			foreignColumns: [courseWeeks.id],
			name: "own_notes_week_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.courseId],
			foreignColumns: [courses.id],
			name: "own_notes_course_id_fkey",
		}).onDelete("cascade"),
	]
);

// Generation configurations table
// Generation configurations table - Unified scope-based design
export const generationConfigs = pgTable(
	"generation_configs",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),

		// Configuration source and scope
		configSource: configurationSource("config_source").notNull(),

		// Flexible scope associations (nullable for different scopes)
		userId: uuid("user_id"), // For USER_PREFERENCE
		courseId: uuid("course_id"), // For COURSE_DEFAULT, COURSE_WEEK_OVERRIDE
		weekId: uuid("week_id"), // For COURSE_WEEK_OVERRIDE
		institutionId: uuid("institution_id"), // Future: For INSTITUTION_DEFAULT

		// Configuration data stored as JSONB for flexibility
		configData: jsonb("config_data").notNull(), // Full GenerationConfig object

		// Adaptive learning metadata (only for ADAPTIVE_ALGORITHM)
		adaptationReason: text("adaptation_reason"),
		userPerformanceLevel: varchar("user_performance_level", { length: 20 }),
		learningGaps: jsonb("learning_gaps"),
		adaptiveFactors: jsonb("adaptive_factors"), // Full AdaptiveFactors object

		// Tracking and lifecycle
		isActive: boolean("is_active").default(true),
		appliedAt: timestamp("applied_at").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),

		// Metadata for auditing and debugging
		createdBy: uuid("created_by"), // Who created this config
		metadata: jsonb("metadata"), // Additional context/debugging info
	},
	(table) => [
		// Composite indexes for efficient queries
		index("idx_generation_configs_user_scope").using("btree", table.userId, table.configSource),
		index("idx_generation_configs_course_scope").using("btree", table.courseId, table.configSource),
		index("idx_generation_configs_week_scope").using("btree", table.weekId, table.configSource),
		index("idx_generation_configs_source_active").using(
			"btree",
			table.configSource,
			table.isActive
		),
		index("idx_generation_configs_applied_at").using("btree", table.appliedAt),

		// Foreign key constraints with proper cascade behavior
		foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInAuth.id],
			name: "generation_configs_user_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.courseId],
			foreignColumns: [courses.id],
			name: "generation_configs_course_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.weekId],
			foreignColumns: [courseWeeks.id],
			name: "generation_configs_week_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.createdBy],
			foreignColumns: [usersInAuth.id],
			name: "generation_configs_created_by_fkey",
		}).onDelete("set null"),
		foreignKey({
			columns: [table.institutionId],
			foreignColumns: [institutions.id],
			name: "generation_configs_institution_id_fkey",
		}).onDelete("cascade"),

		// Scope validation constraints
		unique("unique_user_preference").on(table.userId, table.configSource),
		unique("unique_course_default").on(table.courseId, table.configSource),
		unique("unique_week_override").on(table.weekId, table.configSource),
	]
);

// Future: Institutions table for institutional scaling
export const institutions = pgTable(
	"institutions",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		name: varchar("name", { length: 255 }).notNull(),
		slug: varchar("slug", { length: 100 }).notNull().unique(),

		// Institution configuration
		defaultGenerationConfig: jsonb("default_generation_config"), // Institution-wide defaults

		// Branding and customization
		logoUrl: varchar("logo_url", { length: 500 }),
		primaryColor: varchar("primary_color", { length: 7 }), // Hex color
		customDomain: varchar("custom_domain", { length: 255 }),

		// Billing and limits
		maxCourses: integer("max_courses").default(100),
		maxStudentsPerCourse: integer("max_students_per_course").default(1000),
		maxInstructors: integer("max_instructors").default(50),

		// Status and metadata
		isActive: boolean("is_active").default(true),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),

		// Contact and billing information
		contactEmail: varchar("contact_email", { length: 255 }),
		billingEmail: varchar("billing_email", { length: 255 }),
		metadata: jsonb("metadata"),
	},
	(table) => [
		index("idx_institutions_slug").using("btree", table.slug),
		index("idx_institutions_active").using("btree", table.isActive),
		index("idx_institutions_created_at").using("btree", table.createdAt),
	]
);

// Add exams esque table called revisions

// User progress tracking table
export const userProgress = pgTable(
	"user_progress",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		userId: uuid("user_id").notNull(),
		contentType: varchar("content_type", { length: 50 }).notNull(), // 'cuecard', 'mcq', 'open_question'
		contentId: uuid("content_id").notNull(), // references cuecards/mcqs/open_questions
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
		country: varchar({ length: 100 }),
		onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
		onboardingSkipped: boolean("onboarding_skipped").default(false).notNull(),
		institutionId: uuid("institution_id"),
	},
	(table) => [
		unique("users_email_unique").on(table.email),
		unique("users_stripe_customer_id_unique").on(table.stripeCustomerId),
		foreignKey({
			columns: [table.institutionId],
			foreignColumns: [institutions.id],
			name: "users_institution_id_fkey",
		}).onDelete("set null"),
	]
);
