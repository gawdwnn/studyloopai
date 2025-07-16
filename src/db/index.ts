import * as schema from "@/db/schema";
import { databaseUrl } from "@/lib/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const migrationClient = postgres(databaseUrl, { max: 1 });

const queryClient = postgres(databaseUrl, { prepare: false });

export const db = drizzle(queryClient, { schema });

export const migrationDb = drizzle(migrationClient, { schema });
