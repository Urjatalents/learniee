import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import { ResourceError, deleteResource } from "@/features/shared/server/resource.service";

/**
 * DELETE
 *
 * Removes a resource the requesting Teacher shared — a correction
 * (wrong file, typo), not an "un-share" workflow. Resources have no
 * other edit path; the Parent-visible copy disappears immediately.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ resourceId: string }> },
) {
  try {
    const { resourceId } = await params;
    const teacher = await requireTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    await deleteResource(teacher.teacherId, resourceId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ResourceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Teacher resource DELETE error:", error);

    return NextResponse.json({ error: "Failed to delete resource." }, { status: 500 });
  }
}
