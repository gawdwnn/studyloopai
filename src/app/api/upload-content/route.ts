import type { UploadData } from "@/components/course/course-material-upload-wizard";
import { uploadAndGenerateContent } from "@/lib/actions/content-generation";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const uploadData: UploadData = await request.json();

    // Validate required fields
    if (
      !uploadData.courseId ||
      !uploadData.weekNumber ||
      !uploadData.weekName ||
      !uploadData.files?.length
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await uploadAndGenerateContent(uploadData);

    return NextResponse.json(result);
  } catch (error) {
    console.error("API upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Content upload API is running",
  });
}
