import { supabase } from "./client";
import { getAdminClient, getServerClient } from "./server";

async function testSupabaseConnection() {
  try {
    console.log("Testing Supabase connection...");

    // Test 1: Basic connection test
    const { error: healthError } = await supabase
      .from("_health")
      .select("*")
      .limit(1);
    if (healthError) {
      console.error("❌ Basic connection test failed:", healthError.message);
    } else {
      console.log("✅ Basic connection test passed");
    }

    // Test 2: Auth test
    const { error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error("❌ Auth test failed:", authError.message);
    } else {
      console.log("✅ Auth test passed");
    }

    // Test 3: Admin client test
    const adminClient = getAdminClient();
    const { error: adminError } = await adminClient
      .from("_health")
      .select("*")
      .limit(1);
    if (adminError) {
      console.error("❌ Admin client test failed:", adminError.message);
    } else {
      console.log("✅ Admin client test passed");
    }

    // Test 4: Database connection test
    const { error: dbError } = await supabase
      .from("_health")
      .select("*")
      .limit(1);
    if (dbError) {
      console.error("❌ Database connection test failed:", dbError.message);
    } else {
      console.log("✅ Database connection test passed");
    }

    // Test 5: Server client test
    const serverClient = getServerClient();
    const { error: serverError } = await serverClient
      .from("_health")
      .select("*")
      .limit(1);
    if (serverError) {
      console.error("❌ Server client test failed:", serverError.message);
    } else {
      console.log("✅ Server client test passed");
    }

    console.log("\nAll tests completed!");
  } catch (error) {
    console.error("❌ Test suite failed with error:", error);
  }
}

// Run the tests
testSupabaseConnection();
