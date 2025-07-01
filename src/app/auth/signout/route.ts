import { getServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
	try {
		const supabase = await getServerClient();
		const { error } = await supabase.auth.signOut();

		if (error) {
			console.error("Sign out error:", error);
			throw error;
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error in sign out route:", error);
		return NextResponse.json({ error: "Error signing out. Please try again." }, { status: 500 });
	}
}
