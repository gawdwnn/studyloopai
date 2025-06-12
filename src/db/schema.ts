import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Enums
export const userRoleEnum = pgEnum("user_role", [
  "student",
  "instructor",
  "admin",
]);

export const planIdEnum = pgEnum("plan_id", ["free", "monthly", "yearly"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "past_due",
  "unpaid",
  "paused",
]);

// This is a minimal definition of the auth.users table from Supabase.
// It's used to establish a foreign key relationship with the public.users table.
// It is managed by Supabase so we are only defining it for type safety.
export const authUsers = pgSchema("auth").table("users", {
  id: uuid("id").primaryKey(),
});

// Users table
export const users = pgTable("users", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  country: varchar("country", { length: 100 }),
  role: userRoleEnum("role").notNull().default("student"),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).unique(),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  preferences: jsonb("preferences"),
  isActive: boolean("is_active").default(true).notNull(),
  signupStep: integer("signup_step").default(1).notNull(),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User plans table
export const userPlans = pgTable("user_plans", {
  userPlanId: uuid("user_plan_id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.userId, { onDelete: "cascade" }),
  planId: planIdEnum("plan_id").notNull(),
  stripeSubscriptionId: varchar("stripe_subscription_id", {
    length: 255,
  }).unique(),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
  subscriptionStatus: subscriptionStatusEnum("subscription_status"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  currentPeriodEnd: timestamp("current_period_end"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Courses table
export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.userId, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  language: varchar("language", { length: 50 }).default("english"),
  durationWeeks: integer("duration_weeks").default(12),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Course weeks table
export const courseWeeks = pgTable("course_weeks", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  weekNumber: integer("week_number").notNull(),
  title: varchar("title", { length: 255 }),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Course materials table
export const courseMaterials = pgTable("course_materials", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  weekId: uuid("week_id").references(() => courseWeeks.id, {
    onDelete: "set null",
  }),
  title: varchar("title", { length: 255 }).notNull(),
  fileName: varchar("file_name", { length: 255 }),
  filePath: varchar("file_path", { length: 500 }),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  uploadStatus: varchar("upload_status", { length: 50 }).default("pending"),
  processingMetadata: jsonb("processing_metadata"),
  uploadedBy: uuid("uploaded_by")
    .notNull()
    .references(() => users.userId),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
