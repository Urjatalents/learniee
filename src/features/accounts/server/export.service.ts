import "server-only";

import ExcelJS from "exceljs";

import { EnrollmentStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSessionCountsForEnrollments } from "@/features/shared/server/classSession.service";

/**
 * Accounts export — the Tuition Ledger (08-PROJECT-KNOWLEDGE-BASE.md's
 * "17-field record per enrollment/payment cycle", not previously built) plus
 * a secondary Demo Bookings sheet.
 *
 * Two fields here were NOT built until now and are now resolved directly
 * from existing Enrollment data, per 06-OPEN-DECISIONS.md #1 (RESOLVED,
 * previously unbuilt): teacher keeps 70% (`Monthly_teacher_pay`,
 * `Teacher_rate`), platform keeps 30% (`Profits`). No schema change needed —
 * both are derived from `ratePerSession`/`monthlyRate`, which already exist.
 *
 * CCC / MCC / TCC (columns 9-11) are now real counts, sourced from the
 * `ClassSession` table (`classSession.service.ts`'s
 * `getSessionCountsForEnrollments`) instead of the hardcoded `0` this file
 * used before that model existed (03-DATA-MODEL.md / 07-LESSONS-LEARNED.md).
 * See that function's doc-comment for the exact CCC/MCC/TCC definitions
 * used — still flagged as a judgment call pending sign-off, same footing as
 * the pricing formula.
 *
 * The 5-day due-date reminder mentioned in the source spec now also fires
 * as a real in-app notification — see `dueDateReminder.service.ts` (added
 * Sep 17, 2026, cron-driven, independent of this export). `isDueSoon`
 * below is unrelated to that reminder's send/dedupe state; it just drives
 * the visual flag on this report's on-page table and Excel cell fill.
 */

const TEACHER_SHARE = 0.7; // Resolved #1: teacher keeps 70% of Monthly_rate
const PLATFORM_SHARE = 0.3; // Resolved #1: Profits = 30% of Monthly_rate

const ledgerInclude = {
  student: { select: { firstName: true, visibleName: true } },
  parent: { select: { firstName: true, lastName: true } },
  teacher: { select: { firstName: true, lastName: true, visibleName: true } },
  course: { select: { courseTitle: true, subject: true } },
} as const;

function displayName(first: string, last?: string | null, visible?: string | null) {
  if (visible && visible.trim()) return visible;
  return [first, last].filter(Boolean).join(" ").trim();
}

export interface TuitionLedgerRow {
  enrollmentId: string;
  transactionDate: Date;
  parentName: string;
  childName: string;
  status: string;
  noOfMonths: number;
  rate: number;
  monthlyRate: number;
  totalAmount: number;
  ccc: number; // Current Class Completed — placeholder, see file header
  mcc: number; // Monthly Class Completed — placeholder, see file header
  tcc: number; // Total Class Count — placeholder, see file header
  dueDate: Date;
  teacherName: string;
  subject: string;
  teacherRate: number;
  monthlyTeacherPay: number;
  profits: number;
  isDueSoon: boolean; // due within 5 days — see file header re: real reminders
}

/** The Tuition Ledger — one row per Enrollment, the 17 fields as specified. */
export async function getTuitionLedgerRows(): Promise<TuitionLedgerRow[]> {
  const enrollments = await prisma.enrollment.findMany({
    include: ledgerInclude,
    orderBy: { paidAt: "desc" },
  });

  const fiveDaysFromNow = new Date();
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

  const sessionCounts = await getSessionCountsForEnrollments(enrollments.map((e) => e.id));

  return enrollments.map((e) => {
    const rate = Number(e.ratePerSession);
    const monthlyRate = Number(e.monthlyRate);
    const counts = sessionCounts.get(e.id) ?? { ccc: 0, mcc: 0, tcc: 0 };

    return {
      enrollmentId: e.id,
      transactionDate: e.paidAt,
      parentName: displayName(e.parent.firstName, e.parent.lastName),
      childName: displayName(e.student.firstName, undefined, e.student.visibleName),
      status: e.status,
      noOfMonths: e.noOfMonths,
      rate,
      monthlyRate,
      totalAmount: Number(e.totalAmount),
      ccc: counts.ccc,
      mcc: counts.mcc,
      tcc: counts.tcc,
      dueDate: e.dueDate,
      teacherName: displayName(e.teacher.firstName, e.teacher.lastName, e.teacher.visibleName),
      subject: e.subject ?? e.course.subject ?? "",
      teacherRate: Math.round(rate * TEACHER_SHARE * 100) / 100,
      monthlyTeacherPay: Math.round(monthlyRate * TEACHER_SHARE * 100) / 100,
      profits: Math.round(monthlyRate * PLATFORM_SHARE * 100) / 100,
      isDueSoon: e.dueDate <= fiveDaysFromNow && e.dueDate >= new Date(),
    };
  });
}

export interface OngoingCycleRow {
  enrollmentId: string;
  parentName: string;
  childName: string;
  teacherName: string;
  subject: string;
  cycleNumber: number; // cyclesCompleted + 1 — the cycle currently in progress
  sessionsCompletedInCycle: number;
  sessionsPerMonth: number;
  monthlyRate: number;
  projectedTeacherPay: number; // what this cycle will pay the Teacher once it completes
  projectedProfit: number; // platform's cut once it completes
  cycleStartDate: Date;
  lastSessionMarkedAt: Date | null;
}

/**
 * Cycles currently IN PROGRESS — distinct from the Payout
 * Verification queue (`tuitionLedger.service.ts`/`useTuitionLedger`),
 * which only ever shows a cycle *after* it's fully completed and a
 * `TuitionLedgerEntry` already exists for it. This is the "not paid
 * out yet, not even completed yet" view Accounts asked for: how far
 * into the current cycle each active Enrollment is, so an upcoming
 * payout isn't a surprise the moment it lands in Payout Verification.
 *
 * Sorted with the closest-to-completing cycle first (highest
 * sessions-done ratio), since that's the most actionable ordering
 * for anticipating "what's about to need a payout decision."
 */
export async function getOngoingCycleRows(): Promise<OngoingCycleRow[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { status: EnrollmentStatus.ACTIVE },
    include: ledgerInclude,
    orderBy: { lastSessionMarkedAt: "desc" },
  });

  const rows = enrollments.map((e) => {
    const monthlyRate = Number(e.monthlyRate);

    return {
      enrollmentId: e.id,
      parentName: displayName(e.parent.firstName, e.parent.lastName),
      childName: displayName(e.student.firstName, undefined, e.student.visibleName),
      teacherName: displayName(e.teacher.firstName, e.teacher.lastName, e.teacher.visibleName),
      subject: e.subject ?? e.course.subject ?? "",
      cycleNumber: e.cyclesCompleted + 1,
      sessionsCompletedInCycle: e.sessionsCompletedInCycle,
      sessionsPerMonth: e.sessionsPerMonth,
      monthlyRate,
      projectedTeacherPay: Math.round(monthlyRate * TEACHER_SHARE * 100) / 100,
      projectedProfit: Math.round(monthlyRate * PLATFORM_SHARE * 100) / 100,
      cycleStartDate: e.cycleStartDate,
      lastSessionMarkedAt: e.lastSessionMarkedAt,
    };
  });

  return rows.sort((a, b) => {
    const ratioA = a.sessionsCompletedInCycle / Math.max(1, a.sessionsPerMonth);
    const ratioB = b.sessionsCompletedInCycle / Math.max(1, b.sessionsPerMonth);
    return ratioB - ratioA;
  });
}

export interface DemoBookingRow {
  date: Date;
  parentName: string;
  childName: string;
  teacherName: string;
  subject: string;
  amount: number;
  razorpayPaymentId: string;
  status: string;
}

/** Secondary sheet — paid (3rd+) Demo Bookings, outside the tuition cycle. */
export async function getDemoBookingRows(): Promise<DemoBookingRow[]> {
  const demoBookings = await prisma.demoBooking.findMany({
    where: { isPaid: true, razorpayPaymentId: { not: null } },
    include: {
      student: {
        select: {
          firstName: true,
          visibleName: true,
          parent: { select: { firstName: true, lastName: true } },
        },
      },
      teacher: { select: { firstName: true, lastName: true, visibleName: true } },
      course: { select: { subject: true } },
    },
    orderBy: { paidAt: "desc" },
  });

  return demoBookings.map((d) => ({
    date: d.paidAt ?? d.createdAt,
    parentName: displayName(d.student.parent.firstName, d.student.parent.lastName),
    childName: displayName(d.student.firstName, undefined, d.student.visibleName),
    teacherName: displayName(d.teacher.firstName, d.teacher.lastName, d.teacher.visibleName),
    subject: d.subject || d.course.subject || "",
    amount: Number(d.amount ?? 0),
    razorpayPaymentId: d.razorpayPaymentId ?? "",
    status: d.status,
  }));
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF9347FF" } };
  row.alignment = { vertical: "middle" };
  row.height = 20;
}

const DUE_SOON_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFDF0C8" }, // soft yellow — accent-adjacent, not the alert red
};

function addLedgerSheet(workbook: ExcelJS.Workbook, rows: TuitionLedgerRow[]) {
  const sheet = workbook.addWorksheet("Tuition Ledger");

  sheet.columns = [
    { header: "Transaction_Date", key: "transactionDate", width: 18, style: { numFmt: "yyyy-mm-dd" } },
    { header: "Parent_name", key: "parentName", width: 20 },
    { header: "Child_name", key: "childName", width: 18 },
    { header: "Status", key: "status", width: 24 },
    { header: "No_month", key: "noOfMonths", width: 10 },
    { header: "Rate", key: "rate", width: 12, style: { numFmt: "#,##0.00" } },
    { header: "Monthly_rate", key: "monthlyRate", width: 14, style: { numFmt: "#,##0.00" } },
    { header: "Total_Amount", key: "totalAmount", width: 14, style: { numFmt: "#,##0.00" } },
    { header: "CCC", key: "ccc", width: 8 },
    { header: "MCC", key: "mcc", width: 8 },
    { header: "TCC", key: "tcc", width: 8 },
    { header: "Due_Date", key: "dueDate", width: 14, style: { numFmt: "yyyy-mm-dd" } },
    { header: "Teacher_name", key: "teacherName", width: 20 },
    { header: "Subject", key: "subject", width: 16 },
    { header: "Teacher_rate", key: "teacherRate", width: 14, style: { numFmt: "#,##0.00" } },
    { header: "Monthly_teacher_pay", key: "monthlyTeacherPay", width: 18, style: { numFmt: "#,##0.00" } },
    { header: "Profits", key: "profits", width: 14, style: { numFmt: "#,##0.00" } },
  ];

  styleHeaderRow(sheet.getRow(1));

  rows.forEach((r) => {
    const row = sheet.addRow(r);
    if (r.isDueSoon) {
      row.eachCell((cell) => {
        cell.fill = DUE_SOON_FILL;
      });
    }
  });

  sheet.autoFilter = { from: "A1", to: "Q1" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const totalsRowIndex = rows.length + 2;
  sheet.getCell(`G${totalsRowIndex}`).value = "TOTAL:";
  sheet.getCell(`G${totalsRowIndex}`).font = { bold: true };
  sheet.getCell(`H${totalsRowIndex}`).value = rows.reduce((s, r) => s + r.totalAmount, 0);
  sheet.getCell(`H${totalsRowIndex}`).numFmt = "#,##0.00";
  sheet.getCell(`H${totalsRowIndex}`).font = { bold: true };
  sheet.getCell(`P${totalsRowIndex}`).value = rows.reduce((s, r) => s + r.monthlyTeacherPay, 0);
  sheet.getCell(`P${totalsRowIndex}`).numFmt = "#,##0.00";
  sheet.getCell(`P${totalsRowIndex}`).font = { bold: true };
  sheet.getCell(`Q${totalsRowIndex}`).value = rows.reduce((s, r) => s + r.profits, 0);
  sheet.getCell(`Q${totalsRowIndex}`).numFmt = "#,##0.00";
  sheet.getCell(`Q${totalsRowIndex}`).font = { bold: true };

  const noteRowIndex = totalsRowIndex + 2;
  sheet.getCell(`A${noteRowIndex}`).value =
    "CCC = completed this cycle, MCC = completed this calendar month, TCC = completed all-time. Highlighted rows are due within 5 days.";
  sheet.getCell(`A${noteRowIndex}`).font = { italic: true, color: { argb: "FF888888" } };
}

function addDemoBookingsSheet(workbook: ExcelJS.Workbook, rows: DemoBookingRow[]) {
  const sheet = workbook.addWorksheet("Demo Bookings");

  sheet.columns = [
    { header: "Date", key: "date", width: 18, style: { numFmt: "yyyy-mm-dd hh:mm" } },
    { header: "Parent", key: "parentName", width: 20 },
    { header: "Child", key: "childName", width: 18 },
    { header: "Teacher", key: "teacherName", width: 20 },
    { header: "Subject", key: "subject", width: 16 },
    { header: "Amount (₹)", key: "amount", width: 12, style: { numFmt: "#,##0.00" } },
    { header: "Razorpay Payment ID", key: "razorpayPaymentId", width: 26 },
    { header: "Status", key: "status", width: 16 },
  ];

  styleHeaderRow(sheet.getRow(1));
  rows.forEach((r) => sheet.addRow(r));
  sheet.autoFilter = { from: "A1", to: "H1" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

/** Builds the full Accounts export workbook and returns it as a Buffer. */
export async function buildAccountsExportWorkbook(): Promise<Buffer> {
  const [ledgerRows, demoRows] = await Promise.all([
    getTuitionLedgerRows(),
    getDemoBookingRows(),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Learniee";
  workbook.created = new Date();

  addLedgerSheet(workbook, ledgerRows);
  addDemoBookingsSheet(workbook, demoRows);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/** Summary used by the Accounts/Admin dashboard cards. */
export async function getAccountsSummary(ledgerRows: TuitionLedgerRow[], demoRows: DemoBookingRow[]) {
  return {
    totalTuitionRevenue: ledgerRows.reduce((s, r) => s + r.totalAmount, 0),
    totalDemoRevenue: demoRows.reduce((s, r) => s + r.amount, 0),
    totalEnrollments: ledgerRows.length,
    dueSoonCount: ledgerRows.filter((r) => r.isDueSoon).length,
  };
}
