import { z } from "zod";

export const CourseCreationSchema = z.object({
	name: z.string().min(3, "Course name must be at least 3 characters long"),
	description: z.string().optional(),
	language: z.string().optional(),
	durationWeeks: z.number().int().min(1),
});

export type CourseCreationData = z.infer<typeof CourseCreationSchema>;

export const CourseUpdateSchema = CourseCreationSchema.extend({
	id: z.string().uuid(),
});

export type CourseUpdateData = z.infer<typeof CourseUpdateSchema>;
