import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const testId = searchParams.get("testId") as Id<"pdfTests"> | null;
    const fileType = searchParams.get("fileType") as "test" | "answers" | null;

    if (!testId || !fileType) {
      return NextResponse.json(
        { error: "Missing testId or fileType parameter" },
        { status: 400 }
      );
    }

    if (fileType !== "test" && fileType !== "answers") {
      return NextResponse.json(
        { error: "fileType must be 'test' or 'answers'" },
        { status: 400 }
      );
    }

    // Get the download URL (this checks access internally)
    const url = await convex.query(api.pdfTests.getDownloadUrl, {
      userId,
      testId,
      fileType,
    });

    if (!url) {
      return NextResponse.json(
        { error: "Access denied or test not found" },
        { status: 403 }
      );
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    );
  }
}
