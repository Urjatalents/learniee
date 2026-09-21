import { NextResponse } from "next/server";

import { requireTeacherId } from "@/features/teacher/server/auth";
import {
  decideCertificate,
  CertificateActionError,
} from "@/features/shared/server/certificate.service";

/**
 * POST
 *
 * The Teacher's decision for one eligible enrollment: `{ "action":
 * "issue" | "decline" }`. Final — there's no route to re-decide
 * once a Certificate row exists for the enrollment.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ enrollmentId: string }> },
) {
  try {
    const { enrollmentId } = await params;

    const teacher = await requireTeacherId(req);

    if ("error" in teacher) {
      return teacher.error;
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action !== "issue" && action !== "decline") {
      return NextResponse.json(
        { error: "action must be \"issue\" or \"decline\"." },
        { status: 400 },
      );
    }

    const certificate = await decideCertificate(teacher.teacherId, enrollmentId, action);

    return NextResponse.json({ success: true, certificate });
  } catch (error) {
    if (error instanceof CertificateActionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Teacher certificate decision POST error:", error);

    return NextResponse.json(
      { error: "Failed to record the certificate decision." },
      { status: 500 },
    );
  }
}
