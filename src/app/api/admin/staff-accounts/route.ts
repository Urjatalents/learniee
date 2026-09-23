import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/verifyAdmin";
import { createStaffAccount, listStaffAccounts } from "@/features/admin/server/staffAccount.service";

// NOTE: OTP verification (email + phone) was removed from this route on
// 2026-09-03 — re-add via AWS SES (and whatever phone channel is chosen)
// when that's ready. See src/lib/otp.ts, send-otp/verify-otp routes, which
// are left in place but are no longer called from this route.

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await listStaffAccounts();
  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin || typeof admin.sub !== "string") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { firstName, lastName, email, phone, role } = body;

  if (!firstName || !lastName || !email || !phone || !role) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  if (role !== "HR" && role !== "ACCOUNTS" && role !== "IT") {
    return NextResponse.json({ error: "Role must be HR, ACCOUNTS or IT." }, { status: 400 });
  }

  const adminRow = await prisma.admin.findUnique({ where: { cognitoId: admin.sub } });
  if (!adminRow) {
    return NextResponse.json({ error: "Admin record not found." }, { status: 403 });
  }

  try {
    const { account, tempPassword } = await createStaffAccount({
      firstName,
      lastName,
      email,
      phone,
      role,
      createdById: adminRow.id,
    });

    return NextResponse.json({ account, tempPassword });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create staff account." },
      { status: 400 },
    );
  }
}
