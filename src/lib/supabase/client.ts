import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// Environment validation with type assertion
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseAnonKey) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

// Basic client for simple use cases
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Browser client for client-side operations
export const getBrowserClient = () =>
  createBrowserClient(supabaseUrl, supabaseAnonKey);
