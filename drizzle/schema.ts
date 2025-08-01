import type {
	GenerationTemplate,
	SelectiveGenerationConfig,
} from "@/types/generation-types";
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
	"institution_default",
]);

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
		uploadedBy: uuid("uploaded_by").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
		embeddingStatus: varchar("embedding_status", { length: 50 }).default(
			"pending"
		),
		totalChunks: integer("total_chunks").default(0),
		embeddedChunks: integer("embedded_chunks").default(0),

		// New columns for standalone materials
		contentType: varchar("content_type", { length: 50 }).default("pdf"),
		originalFilename: varchar("original_filename", { length: 255 }),
		processingStartedAt: timestamp("processing_started_at"),
		processingCompletedAt: timestamp("processing_completed_at"),
		sourceUrl: text("source_url"),
		transcriptPath: varchar("transcript_path", { length: 500 }),
		thumbnailPath: varchar("thumbnail_path", { length: 500 }),
	},
	(table) => [
		index("idx_course_materials_course_id").using("btree", table.courseId),
		index("idx_course_materials_content_type").using(
			"btree",
			table.contentType
		),
		index("idx_course_materials_embedding_status").using(
			"btree",
			table.embeddingStatus
		),
		index("idx_course_materials_upload_status").using(
			"btree",
			table.uploadStatus
		),
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
		isActive: boolean("is_active").default(true),
		hasMaterials: boolean("has_materials").default(false),

		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_course_weeks_course_id").using("btree", table.courseId),
		index("idx_course_weeks_has_materials").using("btree", table.hasMaterials),
		// Composite index for optimized hasMaterials filtering with course filtering
		index("idx_course_weeks_course_materials_filter").using(
			"btree",
			table.courseId,
			table.hasMaterials,
			table.weekNumber
		),
		unique("course_weeks_course_id_week_number_unique").on(
			table.courseId,
			table.weekNumber
		),
		// Adaptive learning indexes
		index("idx_course_weeks_course_number").using(
			"btree",
			table.courseId,
			table.weekNumber
		),
		index("idx_course_weeks_course_active").using(
			"btree",
			table.courseId,
			table.isActive
		),
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
	(table) => [
		index("idx_courses_user_id").using("btree", table.userId),
		// Adaptive learning indexes
		index("idx_courses_user_active").using(
			"btree",
			table.userId,
			table.isActive
		),
		index("idx_courses_user_created").using(
			"btree",
			table.userId,
			table.createdAt.desc()
		),
	]
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
		index("idx_cuecards_course_week").using(
			"btree",
			table.courseId,
			table.weekId
		),
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
		options: jsonb().$type<string[]>().notNull(), // Array of strings ['A', 'B', 'C', 'D']
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
		index("idx_open_questions_course_week").using(
			"btree",
			table.courseId,
			table.weekId
		),
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
		index("idx_summaries_course_week").using(
			"btree",
			table.courseId,
			table.weekId
		),
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
		version: integer().default(1).notNull(),
		metadata: jsonb().default({}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_golden_notes_course_id").using("btree", table.courseId),
		index("idx_golden_notes_week_id").using("btree", table.weekId),
		index("idx_golden_notes_priority").using("btree", table.priority),
		index("idx_golden_notes_category").using("btree", table.category),
		index("idx_golden_notes_course_week").using(
			"btree",
			table.courseId,
			table.weekId
		),
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

// Concept maps table - AI generated visual concept maps and mind maps
export const conceptMaps = pgTable(
	"concept_maps",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		courseId: uuid("course_id").notNull(),
		weekId: uuid("week_id").notNull(),
		title: varchar({ length: 255 }).notNull(),
		content: text().notNull(), // JSON string containing the concept map data
		style: varchar({ length: 50 }).default("hierarchical").notNull(), // hierarchical, radial, network
		version: integer().default(1).notNull(),
		metadata: jsonb().default({}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_concept_maps_course_id").using("btree", table.courseId),
		index("idx_concept_maps_week_id").using("btree", table.weekId),
		index("idx_concept_maps_style").using("btree", table.style),
		index("idx_concept_maps_course_week").using(
			"btree",
			table.courseId,
			table.weekId
		),
		foreignKey({
			columns: [table.courseId],
			foreignColumns: [courses.id],
			name: "concept_maps_course_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.weekId],
			foreignColumns: [courseWeeks.id],
			name: "concept_maps_week_id_fkey",
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
		tags: jsonb().$type<string[]>().default([]),
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
		index("idx_own_notes_course_week").using(
			"btree",
			table.courseId,
			table.weekId
		),
		index("idx_own_notes_user_course").using(
			"btree",
			table.userId,
			table.courseId
		),
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
export const generationConfigs = pgTable(
	"generation_configs",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),

		// Configuration source and scope
		configSource: configurationSource("config_source").notNull(),

		// Flexible scope associations (nullable for different scopes)
		userId: uuid("user_id"),
		courseId: uuid("course_id"),
		weekId: uuid("week_id"),
		institutionId: uuid("institution_id"),

		// Configuration data stored as JSONB for flexibility
		configData: jsonb("config_data")
			.$type<SelectiveGenerationConfig>()
			.notNull(),

		// Adaptive learning metadata (only for ADAPTIVE_ALGORITHM)
		adaptationReason: text("adaptation_reason"),
		userPerformanceLevel: varchar("user_performance_level", { length: 20 }),
		learningGaps: jsonb("learning_gaps"),
		adaptiveFactors: jsonb("adaptive_factors"),

		// Tracking and lifecycle
		isActive: boolean("is_active").default(true),
		appliedAt: timestamp("applied_at").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),

		// Generation status tracking (added in status tracking cleanup)
		generationStatus: varchar("generation_status", { length: 20 }).default(
			"pending"
		), // 'pending', 'processing', 'completed', 'failed'
		generationStartedAt: timestamp("generation_started_at"),
		generationCompletedAt: timestamp("generation_completed_at"),
		failedFeatures: jsonb("failed_features").default("[]"),

		// Metadata for auditing and debugging
		createdBy: uuid("created_by"),
		metadata: jsonb("metadata"),
	},
	(table) => [
		// Composite indexes for efficient queries
		index("idx_generation_configs_user_scope").using(
			"btree",
			table.userId,
			table.configSource
		),
		index("idx_generation_configs_course_scope").using(
			"btree",
			table.courseId,
			table.configSource
		),
		index("idx_generation_configs_week_scope").using(
			"btree",
			table.weekId,
			table.configSource
		),
		index("idx_generation_configs_source_active").using(
			"btree",
			table.configSource,
			table.isActive
		),
		index("idx_generation_configs_applied_at").using("btree", table.appliedAt),
		index("idx_generation_configs_status").using(
			"btree",
			table.generationStatus
		),

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

// User prompt templates for selective generation
export const userPromptTemplates = pgTable(
	"user_prompt_templates",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		userId: uuid("user_id").notNull(),
		featureType: varchar("feature_type", { length: 50 }).notNull(), // 'cuecards', 'mcqs', 'openQuestions', etc.
		name: varchar("name", { length: 255 }).notNull(),
		config: jsonb("config").$type<GenerationTemplate["config"]>().notNull(), // Uses existing GenerationTemplate type
		isDefault: boolean("is_default").default(false),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		// Indexes
		index("idx_user_prompt_templates_user_id").using("btree", table.userId),
		index("idx_user_prompt_templates_feature_type").using(
			"btree",
			table.featureType
		),
		index("idx_user_prompt_templates_is_default").using(
			"btree",
			table.isDefault
		),

		// Foreign key constraints
		foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInAuth.id],
			name: "user_prompt_templates_user_id_fkey",
		}).onDelete("cascade"),

		// Unique constraint - only one template with same name per user per feature type
		unique("unique_user_template_name").on(
			table.userId,
			table.name,
			table.featureType
		),
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
		unique("user_progress_unique").on(
			table.userId,
			table.contentType,
			table.contentId
		),
		index("idx_user_progress_user_id").using("btree", table.userId),
		index("idx_user_progress_content").using(
			"btree",
			table.contentType,
			table.contentId
		),
		index("idx_user_progress_status").using("btree", table.status),
		// Adaptive learning indexes
		index("idx_user_progress_user_content_status").using(
			"btree",
			table.userId,
			table.contentType,
			table.status
		),
		index("idx_user_progress_user_last_attempt").using(
			"btree",
			table.userId,
			table.lastAttemptAt.desc()
		),
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
	(table) => [
		unique("user_plans_stripe_subscription_id_unique").on(
			table.stripeSubscriptionId
		),
	]
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
		onboardingCompleted: boolean("onboarding_completed")
			.default(false)
			.notNull(),
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

// Course week features table - Tracks generation status per feature per week
export const courseWeekFeatures = pgTable(
	"course_week_features",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		courseId: uuid("course_id").notNull(),
		weekId: uuid("week_id").notNull(),

		// Feature generation flags and counts
		cuecardsGenerated: boolean("cuecards_generated").default(false),
		cuecardsCount: integer("cuecards_count").default(0),
		cuecardsGeneratedAt: timestamp("cuecards_generated_at"),

		mcqsGenerated: boolean("mcqs_generated").default(false),
		mcqsCount: integer("mcqs_count").default(0),
		mcqsGeneratedAt: timestamp("mcqs_generated_at"),

		openQuestionsGenerated: boolean("open_questions_generated").default(false),
		openQuestionsCount: integer("open_questions_count").default(0),
		openQuestionsGeneratedAt: timestamp("open_questions_generated_at"),

		summariesGenerated: boolean("summaries_generated").default(false),
		summariesCount: integer("summaries_count").default(0),
		summariesGeneratedAt: timestamp("summaries_generated_at"),

		goldenNotesGenerated: boolean("golden_notes_generated").default(false),
		goldenNotesCount: integer("golden_notes_count").default(0),
		goldenNotesGeneratedAt: timestamp("golden_notes_generated_at"),

		conceptMapsGenerated: boolean("concept_maps_generated").default(false),
		conceptMapsCount: integer("concept_maps_count").default(0),
		conceptMapsGeneratedAt: timestamp("concept_maps_generated_at"),

		// Last generation config used (for tracking)
		lastGenerationConfigId: uuid("last_generation_config_id"),

		// Metadata
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		// Unique constraint - one record per course week
		unique("unique_course_week").on(table.courseId, table.weekId),

		// Performance indexes
		index("idx_course_week_features_course_id").using("btree", table.courseId),
		index("idx_course_week_features_week_id").using("btree", table.weekId),
		index("idx_course_week_features_updated").using("btree", table.updatedAt),

		// Foreign key constraints
		foreignKey({
			columns: [table.courseId],
			foreignColumns: [courses.id],
			name: "course_week_features_course_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.weekId],
			foreignColumns: [courseWeeks.id],
			name: "course_week_features_week_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.lastGenerationConfigId],
			foreignColumns: [generationConfigs.id],
			name: "course_week_features_config_id_fkey",
		}).onDelete("set null"),
	]
);

// =============================================================================
// ADAPTIVE LEARNING SYSTEM TABLES
// =============================================================================

// Learning sessions table - Universal session tracking for all adaptive features
export const learningSessions = pgTable(
	"learning_sessions",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		userId: uuid("user_id").notNull(),
		contentType: varchar("content_type", { length: 50 }).notNull(), // 'cuecard', 'mcq', 'open_question'
		sessionConfig: jsonb("session_config").notNull(), // Store session configuration
		totalTime: integer("total_time").notNull(), // Total session time in milliseconds
		itemsCompleted: integer("items_completed").notNull(),
		accuracy: integer().notNull(), // Percentage accuracy (0-100)
		startedAt: timestamp("started_at").notNull(),
		completedAt: timestamp("completed_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_learning_sessions_user_id").using("btree", table.userId),
		index("idx_learning_sessions_content_type").using(
			"btree",
			table.contentType
		),
		index("idx_learning_sessions_completed_at").using(
			"btree",
			table.completedAt
		),
		index("idx_learning_sessions_user_content").using(
			"btree",
			table.userId,
			table.contentType
		),
		// Additional composite index for date range queries
		index("idx_learning_sessions_user_date").using(
			"btree",
			table.userId,
			table.completedAt.desc()
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.userId],
			name: "learning_sessions_user_id_fkey",
		}).onDelete("cascade"),
	]
);

// Session responses table - Detailed per-item responses within sessions
export const sessionResponses = pgTable(
	"session_responses",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		sessionId: uuid("session_id").notNull(),
		contentId: uuid("content_id").notNull(), // References cuecards/mcqs/open_questions
		responseData: jsonb("response_data").notNull(), // Store response details (feedback, selected_option, etc.)
		responseTime: integer("response_time").notNull(), // Time spent on this item in milliseconds
		isCorrect: boolean("is_correct").notNull(),
		attemptedAt: timestamp("attempted_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_session_responses_session_id").using("btree", table.sessionId),
		index("idx_session_responses_content_id").using("btree", table.contentId),
		index("idx_session_responses_is_correct").using("btree", table.isCorrect),
		index("idx_session_responses_attempted_at").using(
			"btree",
			table.attemptedAt
		),
		// Additional composite index for content performance analysis
		index("idx_session_responses_content_performance").using(
			"btree",
			table.contentId,
			table.attemptedAt.desc(),
			table.isCorrect
		),
		foreignKey({
			columns: [table.sessionId],
			foreignColumns: [learningSessions.id],
			name: "session_responses_session_id_fkey",
		}).onDelete("cascade"),
	]
);

// Learning gaps table - Universal gap tracking across all content types
export const learningGaps = pgTable(
	"learning_gaps",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		userId: uuid("user_id").notNull(),
		contentType: varchar("content_type", { length: 50 }).notNull(), // 'cuecard', 'mcq', 'open_question'
		contentId: uuid("content_id").notNull(), // References specific content item
		conceptId: uuid("concept_id"), // Links to concept mappings for cross-content intelligence
		severity: integer().notNull(), // Gap severity score (1-10)
		failureCount: integer("failure_count").default(1).notNull(),
		lastFailureAt: timestamp("last_failure_at").notNull(),
		identifiedAt: timestamp("identified_at").defaultNow().notNull(),
		recoveredAt: timestamp("recovered_at"), // When gap was resolved
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_learning_gaps_user_id").using("btree", table.userId),
		index("idx_learning_gaps_content").using(
			"btree",
			table.contentType,
			table.contentId
		),
		index("idx_learning_gaps_concept_id").using("btree", table.conceptId),
		index("idx_learning_gaps_severity").using("btree", table.severity),
		index("idx_learning_gaps_is_active").using("btree", table.isActive),
		index("idx_learning_gaps_user_active").using(
			"btree",
			table.userId,
			table.isActive
		),
		// Additional composite index for priority gap detection
		index("idx_learning_gaps_user_priority").using(
			"btree",
			table.userId,
			table.isActive,
			table.severity.desc()
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.userId],
			name: "learning_gaps_user_id_fkey",
		}).onDelete("cascade"),
	]
);

// AI recommendations table - Store and track AI-generated adaptive suggestions
export const aiRecommendations = pgTable(
	"ai_recommendations",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		userId: uuid("user_id").notNull(),
		recommendationType: varchar("recommendation_type", {
			length: 50,
		}).notNull(), // 'review_priority', 'content_focus', 'difficulty_adjustment', 'study_strategy'
		contentData: jsonb("content_data").notNull(), // Store recommendation details and content references
		priority: integer().notNull(), // Recommendation priority (1-10)
		reasoning: text(), // AI explanation for the recommendation
		isAccepted: boolean("is_accepted"), // Track user acceptance (null = not responded)
		acceptedAt: timestamp("accepted_at"),
		dismissedAt: timestamp("dismissed_at"),
		expiresAt: timestamp("expires_at"), // When recommendation becomes stale
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_ai_recommendations_user_id").using("btree", table.userId),
		index("idx_ai_recommendations_type").using(
			"btree",
			table.recommendationType
		),
		index("idx_ai_recommendations_priority").using("btree", table.priority),
		index("idx_ai_recommendations_is_accepted").using(
			"btree",
			table.isAccepted
		),
		index("idx_ai_recommendations_expires_at").using("btree", table.expiresAt),
		index("idx_ai_recommendations_user_active").using(
			"btree",
			table.userId,
			table.expiresAt
		),
		// Additional composite index for active recommendations
		index("idx_ai_recommendations_active").using(
			"btree",
			table.userId,
			table.expiresAt,
			table.isAccepted,
			table.priority.desc()
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.userId],
			name: "ai_recommendations_user_id_fkey",
		}).onDelete("cascade"),
	]
);

// Cuecard scheduling table - Spaced repetition scheduling (cuecard-specific)
export const cuecardScheduling = pgTable(
	"cuecard_scheduling",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		userId: uuid("user_id").notNull(),
		cardId: uuid("card_id").notNull(),
		nextReviewAt: timestamp("next_review_at").notNull(),
		intervalDays: integer("interval_days").notNull(), // Current interval in days
		easeFactor: integer("ease_factor").default(250).notNull(), // Ease factor * 100 (SuperMemo algorithm)
		reviewCount: integer("review_count").default(0).notNull(),
		consecutiveCorrect: integer("consecutive_correct").default(0).notNull(),
		lastReviewedAt: timestamp("last_reviewed_at"),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		unique("cuecard_scheduling_user_card_unique").on(
			table.userId,
			table.cardId
		),
		index("idx_cuecard_scheduling_user_id").using("btree", table.userId),
		index("idx_cuecard_scheduling_card_id").using("btree", table.cardId),
		index("idx_cuecard_scheduling_next_review").using(
			"btree",
			table.nextReviewAt
		),
		index("idx_cuecard_scheduling_is_active").using("btree", table.isActive),
		index("idx_cuecard_scheduling_user_due").using(
			"btree",
			table.userId,
			table.nextReviewAt,
			table.isActive
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.userId],
			name: "cuecard_scheduling_user_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.cardId],
			foreignColumns: [cuecards.id],
			name: "cuecard_scheduling_card_id_fkey",
		}).onDelete("cascade"),
	]
);

// Concept mappings table - Cross-content concept relationships for intelligence
export const conceptMappings = pgTable(
	"concept_mappings",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		conceptName: varchar("concept_name", { length: 255 }).notNull(),
		contentType: varchar("content_type", { length: 50 }).notNull(), // 'cuecard', 'mcq', 'open_question'
		contentId: uuid("content_id").notNull(),
		courseId: uuid("course_id").notNull(), // For scoping concepts to courses
		weekId: uuid("week_id"), // Optional week scoping
		confidenceScore: integer("confidence_score").default(100).notNull(), // Confidence in mapping (0-100)
		extractedBy: varchar("extracted_by", { length: 50 })
			.default("ai")
			.notNull(), // 'ai', 'manual'
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("idx_concept_mappings_concept_name").using(
			"btree",
			table.conceptName
		),
		index("idx_concept_mappings_content").using(
			"btree",
			table.contentType,
			table.contentId
		),
		index("idx_concept_mappings_course_id").using("btree", table.courseId),
		index("idx_concept_mappings_week_id").using("btree", table.weekId),
		index("idx_concept_mappings_course_concept").using(
			"btree",
			table.courseId,
			table.conceptName
		),
		foreignKey({
			columns: [table.courseId],
			foreignColumns: [courses.id],
			name: "concept_mappings_course_id_fkey",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.weekId],
			foreignColumns: [courseWeeks.id],
			name: "concept_mappings_week_id_fkey",
		}).onDelete("cascade"),
	]
);
