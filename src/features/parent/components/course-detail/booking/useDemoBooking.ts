"use client";

import { useState } from "react";

import { openRazorpayCheckout } from "@/lib/loadRazorpayCheckout";

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

interface Args {
  selectedStudentId: string;
  teacherId: string;
  courseId: string;
  subject: string | null;
  remainingFree: number;
  paidDemoPrice: number;
  reloadBalance: () => void;
}

/** Calendar selection + the free / paid demo booking flow. */
export function useDemoBooking({
  selectedStudentId,
  teacherId,
  courseId,
  subject,
  remainingFree,
  paidDemoPrice,
  reloadBalance,
}: Args) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  const selectionLabel = formatSelection(selectedDate, selectedHour);

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
        name: "Learnie",
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

  return {
    selectedDate,
    selectedHour,
    selectionLabel,
    booking,
    bookingError,
    bookingSuccess,
    onSelectDate: (date: Date | null) => {
      setSelectedDate(date);
      setSelectedHour(null);
    },
    onSelectHour: setSelectedHour,
    handleBookDemo,
  };
}
