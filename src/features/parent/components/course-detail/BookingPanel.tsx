"use client";

import { useState } from "react";

import ChildPicker from "./booking/ChildPicker";
import DemoBookingSection from "./booking/DemoBookingSection";
import EnrollSection from "./booking/EnrollSection";
import { useDemoBooking } from "./booking/useDemoBooking";
import { useEnrollment } from "./booking/useEnrollment";
import { useStudents } from "@/features/parent/hooks/useStudents";
import { useDemoCoupons } from "@/features/parent/hooks/useDemoCoupons";

interface Props {
  price: string | null;
  teacherId: string;
  courseId: string;
  subject: string | null;
}

/**
 * Session-booking panel. Both "Book Demo" and "Enroll Now" are
 * payment-gated (Razorpay) end to end:
 *
 * - "Book Demo": free while the account still has one of its 2 free
 *   demos (06-OPEN-DECISIONS.md #26) — no payment involved. Once
 *   those are used, this opens Razorpay Checkout for the flat ₹100
 *   fee before the booking is created.
 * - "Enroll Now": always payment-gated. One enrollment = one
 *   monthly cycle (start date to the same date next month minus one
 *   day); the parent picks weekdays, a time and a start date, the
 *   session count is however many of those weekdays fall in the
 *   cycle (min 4), and the price is session rate x count — see
 *   `cyclePlan.ts`. Then opens Razorpay Checkout for the amount. The
 *   Enrollment row is only created after payment is verified
 *   server-side — see enrollment.service.ts. A paid enrollment then
 *   enters the sequential dual-approval flow (Teacher, then Admin —
 *   resolves 06-OPEN-DECISIONS.md #2). Parent-facing copy always
 *   frames this as "waiting for teacher approval", never mentioning
 *   Admin by name, per direct instruction.
 *
 * All amounts are INR — Razorpay's "International Payments" account
 * setting is what lets a non-Indian card pay this same INR amount;
 * the cardholder's own bank/network does the conversion and any
 * forex fee lands on them, not on Learnie.
 */
export default function BookingPanel({
  price,
  teacherId,
  courseId,
  subject,
}: Props) {
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const { students, loading: studentsLoading } = useStudents();
  const {
    balance,
    loading: balanceLoading,
    reload: reloadBalance,
  } = useDemoCoupons();

  const remainingFree = balance?.remainingFree ?? 0;
  const paidDemoPrice = balance?.paidDemoPrice ?? 100;

  const demo = useDemoBooking({
    selectedStudentId,
    teacherId,
    courseId,
    subject,
    remainingFree,
    paidDemoPrice,
    reloadBalance,
  });
  const enroll = useEnrollment({
    price,
    selectedStudentId,
    teacherId,
    courseId,
    subject,
  });

  return (
    <div className="bg-white border border-violet-100 rounded-3xl shadow-sm p-5 sm:p-6 lg:sticky lg:top-20">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-heading text-base font-bold text-gray-800">
          Book a session
        </h2>

        {price && (
          <span className="text-sm font-bold text-gray-800">
            ₹{price}
            <span className="text-[11px] font-medium text-gray-400">
              /session
            </span>
          </span>
        )}
      </div>

      {!balanceLoading && (
        <p className="text-xs text-gray-400 mb-4">
          {remainingFree > 0
            ? `${remainingFree} free demo session${remainingFree === 1 ? "" : "s"} left on your account.`
            : `No free demos left — demos are ₹${paidDemoPrice} each.`}
        </p>
      )}

      {/* Shared by both Book Demo and Enroll; for a demo, the
          (teacher, subject, child) cap is enforced server-side. */}
      <ChildPicker
        students={students}
        loading={studentsLoading}
        value={selectedStudentId}
        onChange={setSelectedStudentId}
      />

      <DemoBookingSection
        demo={demo}
        studentsLoading={studentsLoading}
        studentCount={students.length}
        remainingFree={remainingFree}
        paidDemoPrice={paidDemoPrice}
      />

      <EnrollSection
        enroll={enroll}
        studentsLoading={studentsLoading}
        studentCount={students.length}
      />
    </div>
  );
}
