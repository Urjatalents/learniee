import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/verifyAdmin";
import {
  BlogError,
  approveBlogPost,
  rejectBlogPost,
  type BlogActor,
} from "@/features/blog/server/blog.service";

/**
 * POST { action: "approve" | "reject", reason? }
 *
 * approve: PENDING_REVIEW -> PUBLISHED (goes live on /blog immediately).
 * reject:  PENDING_REVIEW -> REJECTED, or PUBLISHED -> REJECTED (take-down).
 *          `reason` is mandatory and is shown to the Teacher.
 *
 * Signature-verified Admin auth — this publishes to the public site.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const { postId } = await params;
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actor: BlogActor = {
      sub: admin.sub,
      email: admin.email as string | undefined,
      name:
        [admin.given_name, admin.family_name].filter((v) => typeof v === "string" && v).join(" ") ||
        (admin.email as string | undefined) ||
        null,
    };

    const body = await req.json().catch(() => ({}));

    if (body?.action === "approve") {
      const post = await approveBlogPost(postId, actor);
      return NextResponse.json({ success: true, post });
    }

    if (body?.action === "reject") {
      const post = await rejectBlogPost(postId, body.reason, actor);
      return NextResponse.json({ success: true, post });
    }

    return NextResponse.json({ error: "action must be approve or reject." }, { status: 400 });
  } catch (error) {
    if (error instanceof BlogError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Admin blog decision error:", error);

    return NextResponse.json({ error: "Failed to record the decision." }, { status: 500 });
  }
}
