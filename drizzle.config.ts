import { defineConfig } from "drizzle-kit";
import { env } from "./src/env";

const databaseUrl = env.NODE_ENV === "production" ? env.PROD_DATABASE_URL : env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("Appropriate database URL is not set in environment variables.");
}

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
