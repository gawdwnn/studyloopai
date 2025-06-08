// Helper function to get the correct site URL
export const getSiteUrl = () => {
  // Force localhost in development environment
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  // In production, use the environment variable or fall back to window.location.origin
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
  }

  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
};
