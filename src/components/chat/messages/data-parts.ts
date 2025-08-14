import z from "zod";

export const dataPartSchema = z.object({
	"web-search": z.object({
		query: z.string().optional(),
		resultsCount: z.number().optional(),
		status: z.enum(["loading", "done", "error"]),
		error: z.string().optional(),
	}),
	"enhanced-web-search": z.object({
		query: z.string().optional(),
		currentResult: z.number().optional(),
		totalResults: z.number().optional(),
		status: z.enum(["loading", "scraping", "done", "error"]),
		error: z.string().optional(),
	}),
	"browse-website": z.object({
		url: z.string().optional(),
		title: z.string().optional(),
		status: z.enum(["loading", "extracting", "done", "error"]),
		error: z.string().optional(),
	}),
	"course-material": z.object({
		question: z.string().optional(),
		courseIds: z.array(z.string()).optional(),
		resultsCount: z.number().optional(),
		status: z.enum(["loading", "searching", "done", "error"]),
		error: z.string().optional(),
	}),
});

export type DataPart = z.infer<typeof dataPartSchema>;
