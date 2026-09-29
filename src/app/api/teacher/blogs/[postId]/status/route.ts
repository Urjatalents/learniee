import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import {
  BlogError,
  changeTeacherPostStatus,
  type TeacherStatusAction,
} from "@/features/blog/server/blog.service";

const ACTIONS: TeacherStatusAction[] = ["submit", "withdraw", "unpublish"];

/** POST { action: "submit" | "withdraw" | "unpublish" } */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const { postId } = await params;
    const teacher = await requireTeacherId(req);
    if ("error" in teacher) return teacher.error;

    const body = await req.json().catch(() => ({}));
    const action = body?.action as TeacherStatusAction;

    if (!ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: "action must be submit, withdraw or unpublish." },
        { status: 400 },
      );
    }

    const post = await changeTeacherPostStatus(teacher.teacherId, postId, action);

    return NextResponse.json({ success: true, post });
  } catch (error) {
    if (error instanceof BlogError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher blog status error:", error);

    return NextResponse.json({ error: "Failed to update the blog post." }, { status: 500 });
  }
}
