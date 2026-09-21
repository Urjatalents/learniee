import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { getCertificateForParent } from "@/features/shared/server/certificate.service";

/**
 * GET
 *
 * A single issued certificate belonging to one of this Parent's
 * students — backs the printable/downloadable certificate view.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ certificateId: string }> },
) {
  try {
    const { certificateId } = await params;

    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const certificate = await getCertificateForParent(parent.parentId, certificateId);

    if (!certificate) {
      return NextResponse.json({ error: "Certificate not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, certificate });
  } catch (error) {
    console.error("Parent certificate GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch this certificate." },
      { status: 500 },
    );
  }
}
