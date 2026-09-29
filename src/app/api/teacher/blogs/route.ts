import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import {
  BlogError,
  createTeacherPost,
  listTeacherPosts,
} from "@/features/blog/server/blog.service";

/** GET — the logged-in Teacher's own blog posts (no article body), most recently edited first. */
export async function GET(req: Request) {
  try {
    const teacher = await requireTeacherId(req);
    if ("error" in teacher) return teacher.error;

    const posts = await listTeacherPosts(teacher.teacherId);

    return NextResponse.json({ success: true, posts });
  } catch (error) {
    console.error("Teacher blogs GET error:", error);

    return NextResponse.json({ error: "Failed to load your blog posts." }, { status: 500 });
  }
}

/** POST { title, excerpt, content, category, tags } — creates a DRAFT. */
export async function POST(req: Request) {
  try {
    const teacher = await requireTeacherId(req);
    if ("error" in teacher) return teacher.error;

    const input = await req.json().catch(() => null);

    if (!input || typeof input !== "object") {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const post = await createTeacherPost(teacher.teacherId, input);

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (error) {
    if (error instanceof BlogError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher blogs POST error:", error);

    return NextResponse.json({ error: "Failed to save the blog post." }, { status: 500 });
  }
}
