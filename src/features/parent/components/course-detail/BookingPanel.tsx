"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, CheckCircle2, Info, Loader2, MessageCircle } from "lucide-react";

import BookingCalendar from "@/features/parent/components/course-detail/BookingCalendar";
import { useStudents } from "@/features/parent/hooks/useStudents";
import { useDemoCoupons } from "@/features/parent/hooks/useDemoCoupons";
import {
  loadRazorpayCheckout,
  type RazorpayCheckoutOptions,
} from "@/lib/loadRazorpayCheckout";
import { WEEKDAY_LABELS } from "@/features/shared/utils/weekdays";
import {
  buildCyclePlan,
  formatCycleSummary,
  getCyclePlanProblem,
  priceForSessions,
} from "@/features/shared/utils/cyclePlan";
import { toDateKey, todayInPlatformTz } from "@/lib/platformTime";

interface Props {
  price: string | null;
  teacherId: string;
  courseId: string;
  subject: string | null;
}

function formatSelection(date: Date | null, hour: number | null) {
  if (!date || hour == null) {
    return null;
  }

  const withTime = new Date(date);
  withTime.setHours(hour, 0, 0, 0);

  return withTime.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Opens Razorpay Checkout against a server-created order and
 * resolves with the payment result once the user completes (or
 * abandons) it. Both "Book Demo" (once free demos run out) and
 * "Enroll Now" use this same helper — only the order/verify
 * endpoints differ.
 */
function openRazorpayCheckout(options: {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  name: string;
  description: string;
}): Promise<{
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
} | null> {
  return new Promise((resolve, reject) => {
    loadRazorpayCheckout().then((loaded) => {
      if (!loaded || !window.Razorpay) {
        reject(new Error("Couldn't load the payment window. Check your connection and try again."));
        return;
      }

      const checkoutOptions: RazorpayCheckoutOptions = {
        key: options.keyId,
        amount: options.amount,
        currency: options.currency,
        order_id: options.orderId,
        name: "Learnie",
        description: options.description,
        theme: { color: "#9347FF" },
        handler: (response) => resolve(response),
        modal: {
          ondismiss: () => resolve(null),
        },
      };

      const instance = new window.Razorpay!(checkoutOptions);
      instance.open();
    });
  });
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  // Enroll — separate from the demo-booking state above since a
  // parent may enroll without booking another demo first (they
  // might already be past their demos for this teacher/subject).
  // Cycle start date ("YYYY-MM-DD", platform timezone) — defaults to today.
  const [startDate, setStartDate] = useState(() =>
    toDateKey(todayInPlatformTz()),
  );
  // Recurring weekly schedule — required before enrolling so the
  // teacher/parent calendar can actually show something real.
  const [scheduleDays, setScheduleDays] = useState<number[]>([]);
  const [scheduleTime, setScheduleTime] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);
  const [enrollChatRoomId, setEnrollChatRoomId] = useState<string | null>(null);

  const router = useRouter();
  const { students, loading: studentsLoading } = useStudents();
  const {
    balance,
    loading: balanceLoading,
    reload: reloadBalance,
  } = useDemoCoupons();

  const selectionLabel = formatSelection(selectedDate, selectedHour);
  const remainingFree = balance?.remainingFree ?? 0;
  const paidDemoPrice = balance?.paidDemoPrice ?? 100;

  // Client-side preview only — the authoritative calculation always
  // happens server-side in enrollment.service.ts, using this same
  // `buildCyclePlan()`. Rate is a PER-SESSION rate.
  const ratePerSession = price ? Number(price) : null;
  const minStartDate = toDateKey(todayInPlatformTz());
  const startInPast = !!startDate && startDate < minStartDate;

  const cyclePlan = useMemo(
    () =>
      startDate && scheduleDays.length > 0
        ? buildCyclePlan(startDate, scheduleDays)
        : null,
    [startDate, scheduleDays],
  );
  const planProblem = cyclePlan ? getCyclePlanProblem(cyclePlan) : null;

  const pricePreview = useMemo(() => {
    if (!ratePerSession || !cyclePlan || planProblem) return null;

    return {
      sessionCount: cyclePlan.sessionCount,
      totalAmount: priceForSessions(ratePerSession, cyclePlan.sessionCount),
    };
  }, [ratePerSession, cyclePlan, planProblem]);

  async function handleBookDemo() {
    if (!selectedStudentId) {
      setBookingError("Pick which child this demo is for.");
      return;
    }

    // A demo has to be arranged for a specific time — date and
    // time selection is now required, not optional, before booking.
    if (!selectedDate || selectedHour == null) {
      setBookingError(
        "Pick a date and time from the calendar below before booking.",
      );
      return;
    }

    setBooking(true);
    setBookingError("");
    setBookingSuccess(null);

    try {
      const withTime = new Date(selectedDate);
      withTime.setHours(selectedHour, 0, 0, 0);
      const scheduledAt = withTime.toISOString();

      const payload = {
        studentId: selectedStudentId,
        teacherId,
        courseId,
        subject,
        scheduledAt,
      };

      if (remainingFree > 0) {
        // Free demo — no Razorpay involved.
        const res = await fetch("/api/parent/demo-bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to book demo.");
        }

        setBookingSuccess(
          "Free demo booked! We'll be in touch to confirm the time.",
        );
        reloadBalance();
        return;
      }

      // Paid demo — create a Razorpay order, open Checkout, verify.
      const orderRes = await fetch("/api/parent/demo-bookings/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(orderData.error || "Failed to start payment.");
      }

      const result = await openRazorpayCheckout({
        orderId: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId: orderData.keyId,
        name: "Demo session",
        description: `Demo — ₹${paidDemoPrice}`,
      });

      if (!result) {
        // User closed the payment window without paying.
        setBookingError("Payment cancelled — no charge was made.");
        return;
      }

      const verifyRes = await fetch("/api/parent/demo-bookings/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          razorpayOrderId: result.razorpay_order_id,
          razorpayPaymentId: result.razorpay_payment_id,
          razorpaySignature: result.razorpay_signature,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Payment succeeded but booking could not be confirmed — contact support.");
      }

      setBookingSuccess(`Payment received — demo booked for ₹${paidDemoPrice}.`);
      reloadBalance();
    } catch (err) {
      setBookingError(
        err instanceof Error ? err.message : "Failed to book demo.",
      );
    } finally {
      setBooking(false);
    }
  }

  function toggleScheduleDay(day: number) {
    setScheduleDays((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  }

  async function handleEnroll() {
    if (!selectedStudentId) {
      setEnrollError("Pick which child this enrollment is for.");
      return;
    }

    if (scheduleDays.length === 0 || !scheduleTime) {
      setEnrollError("Pick which days and what time classes should happen.");
      return;
    }

    if (!startDate || startInPast) {
      setEnrollError("Pick a start date that isn't in the past.");
      return;
    }

    if (!cyclePlan || planProblem) {
      setEnrollError(planProblem ?? "Pick a valid start date.");
      return;
    }

    setEnrolling(true);
    setEnrollError("");
    setEnrollSuccess(null);

    try {
      const payload = {
        studentId: selectedStudentId,
        teacherId,
        courseId,
        subject,
        cycleStartDate: startDate,
        scheduleDays,
        scheduleTime,
      };

      const orderRes = await fetch("/api/parent/enrollments/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(orderData.error || "Failed to start payment.");
      }

      const result = await openRazorpayCheckout({
        orderId: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId: orderData.keyId,
        name: "Course enrollment",
        description: `Enrollment — ₹${orderData.pricing.totalAmount.toLocaleString("en-IN")}`,
      });

      if (!result) {
        setEnrollError("Payment cancelled — no charge was made.");
        return;
      }

      const verifyRes = await fetch("/api/parent/enrollments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          razorpayOrderId: result.razorpay_order_id,
          razorpayPaymentId: result.razorpay_payment_id,
          razorpaySignature: result.razorpay_signature,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Payment succeeded but enrollment could not be confirmed — contact support.");
      }

      setEnrollSuccess(
        "Payment successful! Your enrollment is on its way — you can connect with your teacher over chat any time.",
      );
      setEnrollChatRoomId(verifyData.enrollment?.chatRoom?.id ?? null);
    } catch (err) {
      setEnrollError(err instanceof Error ? err.message : "Failed to enroll.");
    } finally {
      setEnrolling(false);
    }
  }

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

      {/* CHILD PICKER — shared by both Book Demo and Enroll below;
          for a demo, the (teacher, subject, child) cap is enforced
          server-side. */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
          Which child is this for?
        </label>

        {studentsLoading ? (
          <div className="h-10 rounded-xl bg-violet-50 animate-pulse" />
        ) : students.length === 0 ? (
          <p className="text-xs text-gray-400">
            Add a child profile from the dashboard before booking a demo.
          </p>
        ) : (
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full text-sm border border-violet-100 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <option value="">Select a child</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.visibleName || s.firstName}
              </option>
            ))}
          </select>
        )}
      </div>

      <BookingCalendar
        selectedDate={selectedDate}
        selectedHour={selectedHour}
        onSelectDate={(date) => {
          setSelectedDate(date);
          setSelectedHour(null);
        }}
        onSelectHour={setSelectedHour}
      />

      {selectionLabel && (
        <div className="flex items-center gap-2 mt-4 text-xs font-semibold text-brand bg-violet-50 rounded-xl px-3 py-2">
          <CalendarCheck size={14} className="flex-shrink-0" />
          {selectionLabel}
        </div>
      )}

      {bookingError && (
        <p className="text-xs text-red-600 mt-3">{bookingError}</p>
      )}

      {bookingSuccess && (
        <p className="text-xs text-emerald-600 font-semibold mt-3">
          {bookingSuccess}
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 mt-5">
        <button
          type="button"
          onClick={handleBookDemo}
          disabled={
            booking ||
            studentsLoading ||
            students.length === 0 ||
            !selectedDate ||
            selectedHour == null
          }
          title={
            !selectedDate || selectedHour == null
              ? "Pick a date and time first"
              : undefined
          }
          className="w-full text-sm font-bold text-white bg-brand px-4 py-2.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {booking && <Loader2 size={14} className="animate-spin" />}
          {remainingFree > 0
            ? "Book Free Demo"
            : `Pay & Book Demo — ₹${paidDemoPrice}`}
        </button>
      </div>

      <div className="flex items-start gap-2 mt-4 text-[11px] text-gray-400 leading-relaxed">
        <Info size={13} className="flex-shrink-0 mt-0.5" />
        <span>
          Every account gets 2 free demo sessions in total (not per child) —
          after that, each demo is a flat ₹100, collected via Razorpay before
          the booking is confirmed. Pick a date and time above so the session
          can actually be arranged.
        </span>
      </div>

      {/* ENROLL — one enrollment is one monthly cycle: weekdays +
          time + start date (Part 1A). The session count and total
          are always calculated server-side in enrollment.service.ts;
          this preview is client-side only so the parent sees the
          total before paying. Payment via
          Razorpay is required before the Enrollment row is created
          (resolves 06-OPEN-DECISIONS.md #36); dual approval (Teacher
          + Admin, #2 still open) hasn't been built either, so a paid
          enrollment starts "Pending approval". */}
      <div className="mt-6 pt-5 border-t border-violet-50">
        <h3 className="font-heading text-sm font-bold text-gray-800 mb-3">
          Enroll in this course
        </h3>

        <div className="mb-3">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Start date
          </label>
          <input
            type="date"
            min={minStartDate}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full text-sm border border-violet-100 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        <div className="mb-3">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Class days
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {WEEKDAY_LABELS.map((label, day) => {
              const active = scheduleDays.includes(day);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleScheduleDay(day)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                    active
                      ? "bg-brand text-white border-brand"
                      : "bg-white text-gray-500 border-violet-100 hover:border-brand/40"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Class time (IST)
          </label>
          <input
            type="time"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            className="w-full text-sm border border-violet-100 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        {startInPast && (
          <p className="text-xs text-red-600 mb-3">
            The start date can&apos;t be in the past.
          </p>
        )}

        {cyclePlan && !startInPast && (
          <div className="text-xs text-gray-600 bg-violet-50 rounded-xl px-3 py-2.5 mb-3 space-y-0.5">
            <p className="font-bold text-gray-800">
              {formatCycleSummary(cyclePlan)}
            </p>
            {planProblem ? (
              <p className="text-red-600">{planProblem}</p>
            ) : (
              pricePreview &&
              ratePerSession && (
                <p>
                  {pricePreview.sessionCount} × ₹
                  {ratePerSession.toLocaleString("en-IN")} ={" "}
                  <span className="font-bold text-gray-800">
                    ₹{pricePreview.totalAmount.toLocaleString("en-IN")}
                  </span>
                </p>
              )
            )}
          </div>
        )}

        {enrollError && (
          <p className="text-xs text-red-600 mb-2">{enrollError}</p>
        )}

        {enrollSuccess && (
          <div className="mb-2">
            <div className="flex items-start gap-2 text-xs text-emerald-600 font-semibold">
              <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
              {enrollSuccess}
            </div>

            {enrollChatRoomId && (
              <button
                type="button"
                onClick={() => router.push(`/parent/chat/${enrollChatRoomId}`)}
                className="mt-2 w-full flex items-center justify-center gap-2 text-xs font-bold text-brand-dark bg-violet-50 hover:bg-violet-100 px-4 py-2 rounded-full transition-colors"
              >
                <MessageCircle size={14} />
                Chat with your teacher
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleEnroll}
          disabled={
            enrolling ||
            studentsLoading ||
            students.length === 0 ||
            scheduleDays.length === 0 ||
            !scheduleTime ||
            !startDate ||
            startInPast ||
            !cyclePlan ||
            !!planProblem
          }
          title={
            scheduleDays.length === 0 || !scheduleTime
              ? "Pick class days and time first"
              : startInPast || !startDate
                ? "Pick a start date that isn't in the past"
                : planProblem
                  ? planProblem
                  : undefined
          }
          className="w-full text-sm font-bold text-white bg-brand-dark px-4 py-2.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {enrolling && <Loader2 size={14} className="animate-spin" />}
          {pricePreview
            ? `Pay ₹${pricePreview.totalAmount.toLocaleString("en-IN")} & Enroll`
            : "Enroll Now"}
        </button>

        <p className="flex items-start gap-2 mt-3 text-[11px] text-gray-400 leading-relaxed">
          <Info size={13} className="flex-shrink-0 mt-0.5" />
          Payment is collected via Razorpay before your enrollment is
          created. After that, it&apos;s waiting for teacher approval —
          you&apos;ll be able to track it and chat with your teacher from
          &quot;My Enrollments&quot;.
        </p>
      </div>
    </div>
  );
}
