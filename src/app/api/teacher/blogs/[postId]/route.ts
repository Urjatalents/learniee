import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import {
  BlogError,
  deleteTeacherPost,
  getTeacherPost,
  updateTeacherPost,
} from "@/features/blog/server/blog.service";

type Ctx = { params: Promise<{ postId: string }> };

function fail(error: unknown, label: string, fallback: string) {
  if (error instanceof BlogError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(label, error);

  return NextResponse.json({ error: fallback }, { status: 500 });
}

/** GET — one of the Teacher's own posts, including the article body. */
export async function GET(req: Request, { params }: Ctx) {
  try {
    const { postId } = await params;
    const teacher = await requireTeacherId(req);
    if ("error" in teacher) return teacher.error;

    const post = await getTeacherPost(teacher.teacherId, postId);

    return NextResponse.json({ success: true, post });
  } catch (error) {
    return fail(error, "Teacher blog GET error:", "Failed to load the blog post.");
  }
}

/** PATCH { title, excerpt, content, category, tags } — only while DRAFT or REJECTED. */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { postId } = await params;
    const teacher = await requireTeacherId(req);
    if ("error" in teacher) return teacher.error;

    const input = await req.json().catch(() => null);

    if (!input || typeof input !== "object") {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const post = await updateTeacherPost(teacher.teacherId, postId, input);

    return NextResponse.json({ success: true, post });
  } catch (error) {
    return fail(error, "Teacher blog PATCH error:", "Failed to save the blog post.");
  }
}

/** DELETE — any of the Teacher's own posts that is not live. */
export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const { postId } = await params;
    const teacher = await requireTeacherId(req);
    if ("error" in teacher) return teacher.error;

    await deleteTeacherPost(teacher.teacherId, postId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return fail(error, "Teacher blog DELETE error:", "Failed to delete the blog post.");
  }
}
