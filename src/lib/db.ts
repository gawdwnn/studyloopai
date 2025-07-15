import { env } from "@/env";

const getDatabaseUrl = () => {
  if (process.env.NODE_ENV === "production" && env.PROD_DATABASE_URL) {
    return env.PROD_DATABASE_URL;
  }

  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }
  
  throw new Error("Appropriate database URL is not set in environment variables.");
};

export const databaseUrl = getDatabaseUrl();
