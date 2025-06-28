import { relations } from "drizzle-orm/relations";
import {
	courseMaterials,
	courseWeeks,
	courses,
	documentChunks,
	userPlans,
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
	})
);

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
}));

export const courseWeeksRelations = relations(courseWeeks, ({ one, many }) => ({
	courseMaterials: many(courseMaterials),
	course: one(courses, {
		fields: [courseWeeks.courseId],
		references: [courses.id],
	}),
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
