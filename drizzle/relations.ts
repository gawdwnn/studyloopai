import { relations } from "drizzle-orm/relations";
import {
	courseMaterials,
	courseWeeks,
	courses,
	documentChunks,
	flashcards,
	generationConfigs,
	goldenNotes,
	multipleChoiceQuestions,
	openQuestions,
	ownNotes,
	summaries,
	userPlans,
	userProgress,
	users,
} from "./schema";

export const courseMaterialsRelations = relations(courseMaterials, ({ one, many }) => ({
	course: one(courses, {
		fields: [courseMaterials.courseId],
		references: [courses.id],
	}),
	user: one(users, {
		fields: [courseMaterials.uploadedBy],
		references: [users.userId],
	}),
	courseWeek: one(courseWeeks, {
		fields: [courseMaterials.weekId],
		references: [courseWeeks.id],
	}),
	documentChunks: many(documentChunks),
	flashcards: many(flashcards),
	multipleChoiceQuestions: many(multipleChoiceQuestions),
	openQuestions: many(openQuestions),
	summaries: many(summaries),
	goldenNotes: many(goldenNotes),
	ownNotes: many(ownNotes),
	generationConfigs: many(generationConfigs),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
	courseMaterials: many(courseMaterials),
	courseWeeks: many(courseWeeks),
	user: one(users, {
		fields: [courses.userId],
		references: [users.userId],
	}),
}));

export const usersRelations = relations(users, ({ many }) => ({
	courseMaterials: many(courseMaterials),
	courses: many(courses),
	userPlans: many(userPlans),
	ownNotes: many(ownNotes),
	generationConfigs: many(generationConfigs),
	userProgress: many(userProgress),
}));

export const courseWeeksRelations = relations(courseWeeks, ({ one, many }) => ({
	courseMaterials: many(courseMaterials),
	course: one(courses, {
		fields: [courseWeeks.courseId],
		references: [courses.id],
	}),
	flashcards: many(flashcards),
	multipleChoiceQuestions: many(multipleChoiceQuestions),
	openQuestions: many(openQuestions),
	summaries: many(summaries),
	goldenNotes: many(goldenNotes),
}));

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
	courseMaterial: one(courseMaterials, {
		fields: [documentChunks.materialId],
		references: [courseMaterials.id],
	}),
}));

export const userPlansRelations = relations(userPlans, ({ one }) => ({
	user: one(users, {
		fields: [userPlans.userId],
		references: [users.userId],
	}),
}));

// Flashcards relations
export const flashcardsRelations = relations(flashcards, ({ one }) => ({
	courseMaterial: one(courseMaterials, {
		fields: [flashcards.materialId],
		references: [courseMaterials.id],
	}),
	courseWeek: one(courseWeeks, {
		fields: [flashcards.weekId],
		references: [courseWeeks.id],
	}),
}));

// Multiple choice questions relations
export const multipleChoiceQuestionsRelations = relations(multipleChoiceQuestions, ({ one }) => ({
	courseMaterial: one(courseMaterials, {
		fields: [multipleChoiceQuestions.materialId],
		references: [courseMaterials.id],
	}),
	courseWeek: one(courseWeeks, {
		fields: [multipleChoiceQuestions.weekId],
		references: [courseWeeks.id],
	}),
}));

// Open questions relations
export const openQuestionsRelations = relations(openQuestions, ({ one }) => ({
	courseMaterial: one(courseMaterials, {
		fields: [openQuestions.materialId],
		references: [courseMaterials.id],
	}),
	courseWeek: one(courseWeeks, {
		fields: [openQuestions.weekId],
		references: [courseWeeks.id],
	}),
}));

// Summaries relations
export const summariesRelations = relations(summaries, ({ one }) => ({
	courseMaterial: one(courseMaterials, {
		fields: [summaries.materialId],
		references: [courseMaterials.id],
	}),
	courseWeek: one(courseWeeks, {
		fields: [summaries.weekId],
		references: [courseWeeks.id],
	}),
}));

// Golden notes relations
export const goldenNotesRelations = relations(goldenNotes, ({ one }) => ({
	courseMaterial: one(courseMaterials, {
		fields: [goldenNotes.materialId],
		references: [courseMaterials.id],
	}),
	courseWeek: one(courseWeeks, {
		fields: [goldenNotes.weekId],
		references: [courseWeeks.id],
	}),
}));

// Own notes relations
export const ownNotesRelations = relations(ownNotes, ({ one }) => ({
	user: one(users, {
		fields: [ownNotes.userId],
		references: [users.userId],
	}),
	courseMaterial: one(courseMaterials, {
		fields: [ownNotes.materialId],
		references: [courseMaterials.id],
	}),
	course: one(courses, {
		fields: [ownNotes.courseId],
		references: [courses.id],
	}),
}));

// Generation configs relations
export const generationConfigsRelations = relations(generationConfigs, ({ one }) => ({
	courseMaterial: one(courseMaterials, {
		fields: [generationConfigs.materialId],
		references: [courseMaterials.id],
	}),
	user: one(users, {
		fields: [generationConfigs.userId],
		references: [users.userId],
	}),
}));

// User progress relations
export const userProgressRelations = relations(userProgress, ({ one }) => ({
	user: one(users, {
		fields: [userProgress.userId],
		references: [users.userId],
	}),
}));
