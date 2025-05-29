import { getFeatureLimit, hasFeatureAccess } from "@/lib/actions/plans";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 1. Check if user has document upload feature
    const hasAccess = await hasFeatureAccess("DOCUMENT_UPLOADS");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Document uploads not available in your plan" },
        { status: 403 }
      );
    }

    // 2. Check upload limit
    const uploadLimit = await getFeatureLimit("DOCUMENT_UPLOADS");
    if (uploadLimit !== null) {
      const supabase = createRouteHandlerClient({ cookies });
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Count existing uploads
      const { count } = await supabase
        .from("uploaded_content")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id);

      if (count && count >= uploadLimit) {
        return NextResponse.json(
          { error: `Upload limit reached (${uploadLimit} documents)` },
          { status: 403 }
        );
      }
    }

    // 3. Process the upload
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // ... handle file upload logic ...

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}
