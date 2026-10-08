"use client";

import { CalendarCheck, Info, Loader2 } from "lucide-react";

import BookingCalendar from "@/features/parent/components/course-detail/BookingCalendar";
import type { useDemoBooking } from "./useDemoBooking";

interface Props {
  demo: ReturnType<typeof useDemoBooking>;
  studentsLoading: boolean;
  studentCount: number;
  remainingFree: number;
  paidDemoPrice: number;
}

export default function DemoBookingSection({
  demo,
  studentsLoading,
  studentCount,
  remainingFree,
  paidDemoPrice,
}: Props) {
  const {
    selectedDate,
    selectedHour,
    selectionLabel,
    booking,
    bookingError,
    bookingSuccess,
    onSelectDate,
    onSelectHour,
    handleBookDemo,
  } = demo;

  return (
    <>
      <BookingCalendar
        selectedDate={selectedDate}
        selectedHour={selectedHour}
        onSelectDate={onSelectDate}
        onSelectHour={onSelectHour}
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
            studentCount === 0 ||
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
    </>
  );
}
