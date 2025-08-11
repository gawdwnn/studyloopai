import { relations } from "drizzle-orm/relations";
import {
	courseMaterials,
	courseWeeks,
	courses,
	cuecards,
	documentChunks,
	goldenNotes,
	multipleChoiceQuestions,
	openQuestions,
	ownNotes,
	summaries,
	userPlans,
	userProgress,
	users,
} from "./schema";

export const courseMaterialsRelations = relations(
	courseMaterials,
	({ one, many }) => ({
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
		ownNotes: many(ownNotes),
	})
);

export const coursesRelations = relations(courses, ({ one, many }) => ({
	courseMaterials: many(courseMaterials),
	courseWeeks: many(courseWeeks),
	user: one(users, {
		fields: [courses.userId],
		references: [users.userId],
	}),
	cuecards: many(cuecards),
	multipleChoiceQuestions: many(multipleChoiceQuestions),
	openQuestions: many(openQuestions),
	summaries: many(summaries),
	goldenNotes: many(goldenNotes),
	// generationConfigs removed - using courseWeekFeatures for simplified config storage
}));

export const usersRelations = relations(users, ({ many }) => ({
	courseMaterials: many(courseMaterials),
	courses: many(courses),
	userPlans: many(userPlans),
	ownNotes: many(ownNotes),
	// generationConfigs removed - using courseWeekFeatures for simplified config storage
	userProgress: many(userProgress),
}));

export const courseWeeksRelations = relations(courseWeeks, ({ one, many }) => ({
	courseMaterials: many(courseMaterials),
	course: one(courses, {
		fields: [courseWeeks.courseId],
		references: [courses.id],
	}),
	cuecards: many(cuecards),
	multipleChoiceQuestions: many(multipleChoiceQuestions),
	openQuestions: many(openQuestions),
	summaries: many(summaries),
	goldenNotes: many(goldenNotes),
	// generationConfigs removed - using courseWeekFeatures for simplified config storage
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

// Cuecards relations
export const cuecardsRelations = relations(cuecards, ({ one }) => ({
	course: one(courses, {
		fields: [cuecards.courseId],
		references: [courses.id],
	}),
	courseWeek: one(courseWeeks, {
		fields: [cuecards.weekId],
		references: [courseWeeks.id],
	}),
}));

// Multiple choice questions relations
export const multipleChoiceQuestionsRelations = relations(
	multipleChoiceQuestions,
	({ one }) => ({
		course: one(courses, {
			fields: [multipleChoiceQuestions.courseId],
			references: [courses.id],
		}),
		courseWeek: one(courseWeeks, {
			fields: [multipleChoiceQuestions.weekId],
			references: [courseWeeks.id],
		}),
	})
);

// Open questions relations
export const openQuestionsRelations = relations(openQuestions, ({ one }) => ({
	course: one(courses, {
		fields: [openQuestions.courseId],
		references: [courses.id],
	}),
	courseWeek: one(courseWeeks, {
		fields: [openQuestions.weekId],
		references: [courseWeeks.id],
	}),
}));

// Summaries relations
export const summariesRelations = relations(summaries, ({ one }) => ({
	course: one(courses, {
		fields: [summaries.courseId],
		references: [courses.id],
	}),
	courseWeek: one(courseWeeks, {
		fields: [summaries.weekId],
		references: [courseWeeks.id],
	}),
}));

// Golden notes relations
export const goldenNotesRelations = relations(goldenNotes, ({ one }) => ({
	course: one(courses, {
		fields: [goldenNotes.courseId],
		references: [courses.id],
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
	course: one(courses, {
		fields: [ownNotes.courseId],
		references: [courses.id],
	}),
	week: one(courseWeeks, {
		fields: [ownNotes.weekId],
		references: [courseWeeks.id],
	}),
}));

// Generation configs relations removed - using courseWeekFeatures for simplified config storage

// User progress relations
export const userProgressRelations = relations(userProgress, ({ one }) => ({
	user: one(users, {
		fields: [userProgress.userId],
		references: [users.userId],
	}),
}));
