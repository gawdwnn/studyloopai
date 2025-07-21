import { databaseUrl } from "@/lib/database/db";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: databaseUrl,
	},
	verbose: true,
	strict: true,
});
