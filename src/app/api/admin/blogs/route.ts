import { NextResponse } from "next/server";
import { BlogPostStatus } from "@prisma/client";

import { requireAdmin } from "@/lib/verifyAdmin";
import { listAdminPosts } from "@/features/blog/server/blog.service";

/**
 * GET ?status=PENDING_REVIEW|PUBLISHED|REJECTED|DRAFT
 *
 * Blog posts for Admin review. Publishing puts content on the public
 * site, so this uses signature-verified auth (`requireAdmin`), not the
 * decode-only helper (06-OPEN-DECISIONS.md #21).
 */
export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = new URL(req.url).searchParams.get("status");
    const status =
      raw && (Object.values(BlogPostStatus) as string[]).includes(raw)
        ? (raw as BlogPostStatus)
        : undefined;

    const posts = await listAdminPosts(status);

    return NextResponse.json({ success: true, posts });
  } catch (error) {
    console.error("Admin blogs GET error:", error);

    return NextResponse.json({ error: "Failed to load blog posts." }, { status: 500 });
  }
}
