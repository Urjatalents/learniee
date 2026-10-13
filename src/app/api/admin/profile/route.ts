import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVerifiedAdminAuth } from "@/lib/verifiedAdminAuth";

/**
 * GET/PATCH `/api/admin/profile` — new (Sep 10, 2026), backs the new
 * `/admin/profile` page. `Admin` is a minimal model (no phone/address
 * fields like Parent/Teacher — see `03-DATA-MODEL.md`), so this only
 * ever has name to show/edit plus a read-only email + join date.
 *
 * Signature-verified auth (`requireVerifiedAdminAuth`) — same JWT
 * signature/expiry/role checks as the money routes, so a forged
 * token can't read or edit an Admin's profile.
 */
export async function GET(req: Request) {
  try {
    const auth = await requireVerifiedAdminAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const admin = await prisma.admin.findUnique({
      where: { cognitoId: auth.payload.sub },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
      },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "Admin profile not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ admin });
  } catch (error) {
    console.error("Admin profile error:", error);

    return NextResponse.json(
      { error: "Failed to fetch admin profile" },
      { status: 500 },
    );
  }
}

const EDITABLE_FIELDS = ["firstName", "lastName"] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];
type ProfileUpdateBody = Partial<Record<EditableField, string>>;

export async function PATCH(req: Request) {
  try {
    const auth = await requireVerifiedAdminAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const body = (await req.json()) as ProfileUpdateBody;

    const data: ProfileUpdateBody = {};
    for (const field of EDITABLE_FIELDS) {
      if (typeof body[field] === "string") {
        data[field] = body[field]!.trim();
      }
    }

    if (data.firstName === "" || data.lastName === "") {
      return NextResponse.json(
        { error: "First name and last name are required." },
        { status: 400 },
      );
    }

    const admin = await prisma.admin.update({
      where: { cognitoId: auth.payload.sub },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ admin });
  } catch (error) {
    console.error("Admin profile update error:", error);

    return NextResponse.json(
      { error: "Failed to update the admin profile." },
      { status: 500 },
    );
  }
}
