import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/verifyAdmin";
import { BlogError, getAdminPost } from "@/features/blog/server/blog.service";

/** GET — one post with its full article body, for the review screen. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const { postId } = await params;
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const post = await getAdminPost(postId);

    return NextResponse.json({ success: true, post });
  } catch (error) {
    if (error instanceof BlogError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Admin blog GET error:", error);

    return NextResponse.json({ error: "Failed to load the blog post." }, { status: 500 });
  }
}
