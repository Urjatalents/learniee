import { NextResponse } from "next/server";

import { requireParentId } from "@/features/parent/server/auth";
import { getCertificatesForParent } from "@/features/shared/server/certificate.service";

/**
 * GET
 *
 * Every ISSUED certificate for all of the logged-in Parent's children,
 * newest first. Backs the Library page (declined certificates are never
 * visible to a Parent).
 */
export async function GET(req: Request) {
  try {
    const parent = await requireParentId(req);

    if ("error" in parent) {
      return parent.error;
    }

    const certificates = await getCertificatesForParent(parent.parentId);

    return NextResponse.json({ success: true, certificates });
  } catch (error) {
    console.error("Parent certificates GET error:", error);

    return NextResponse.json({ error: "Failed to fetch certificates." }, { status: 500 });
  }
}
