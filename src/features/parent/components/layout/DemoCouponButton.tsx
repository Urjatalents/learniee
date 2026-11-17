"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Ticket, Plus, Minus, CalendarClock, Sparkles } from "lucide-react";

import { useDemoCoupons } from "@/features/parent/hooks/useDemoCoupons";
import { useDemoBookings } from "@/features/parent/hooks/useDemoBookings";
import { PD_PILL } from "@/features/parent/components/layout/pdStyles";

/**
 * Navbar entry point for everything demo-coupon related: remaining
 * free-demo balance, the flat per-demo price once those run out,
 * buying more coupons, and a quick look at upcoming demo bookings.
 * Replaces the old dashboard-page DemoCouponBanner (moved here per
 * request, Aug 30, 2026) — account-level, not per child, see
 * 06-OPEN-DECISIONS.md #26.
 *
 * "Buy more" opens a real Razorpay Checkout (added Sep 11, 2026, via
 * useDemoCoupons()'s `purchaseCoupons` — order → Checkout → verify,
 * same pattern as the Enrollment/DemoBooking/Wallet payment flows)
 * before any coupons are actually added.
 */
export default function DemoCouponButton() {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [purchaseNotice, setPurchaseNotice] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    balance,
    loading: balanceLoading,
    purchaseCoupons,
    purchasing,
  } = useDemoCoupons();
  const { bookings, loading: bookingsLoading } = useDemoBookings();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const upcomingBookings = bookings
    .filter((b) => b.scheduledAt && new Date(b.scheduledAt) >= new Date())
    .sort(
      (a, b) =>
        new Date(a.scheduledAt as string).getTime() -
        new Date(b.scheduledAt as string).getTime(),
    )
    .slice(0, 5);

  const remainingFree = balance?.remainingFree ?? 0;
  const paidDemoPrice = balance?.paidDemoPrice ?? 100;

  async function handleBuy() {
    setPurchaseNotice("");

    const { message } = await purchaseCoupons(quantity);

    setPurchaseNotice(message);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Demo coupons"
        className={PD_PILL}
      >
        <Ticket size={17} />
        <span className="text-sm font-bold">
          {balanceLoading ? "–" : remainingFree}
        </span>
      </button>

      {open && (
        // On phones the popover spans the screen under the header (a 320px panel anchored to a mid-row button clips off the left edge); from sm up it anchors to its button. Pops in from the top-right.
        <div className="fixed inset-x-3 top-[4.25rem] max-h-[calc(100dvh-5rem)] overflow-y-auto origin-top-right animate-pop-in sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-80 bg-white rounded-2xl border border-violet-100 shadow-playful p-4 z-50">
          {/* BALANCE */}
          <div className="flex items-center gap-3 mb-4">
            <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Ticket size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800">
                {balanceLoading
                  ? "Loading balance..."
                  : remainingFree > 0
                    ? `${remainingFree} free demo${remainingFree === 1 ? "" : "s"} left`
                    : "No free demos left"}
              </p>
              <p className="text-xs text-gray-500">
                Shared across all your children. After that, demos are ₹
                {paidDemoPrice} each.
              </p>
            </div>
          </div>

          <div className="h-px bg-violet-100 mb-4" />

          {/* BUY MORE */}
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
              Buy more coupons
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-7 h-7 rounded-full bg-violet-50 text-brand flex items-center justify-center hover:bg-violet-100"
                aria-label="Decrease quantity"
              >
                <Minus size={13} />
              </button>

              <span className="w-8 text-center text-sm font-bold text-gray-800">
                {quantity}
              </span>

              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-7 h-7 rounded-full bg-violet-50 text-brand flex items-center justify-center hover:bg-violet-100"
                aria-label="Increase quantity"
              >
                <Plus size={13} />
              </button>

              <span className="text-xs text-gray-500 ml-1">
                coupon{quantity === 1 ? "" : "s"} · ₹{quantity * paidDemoPrice}
              </span>
            </div>

            <button
              type="button"
              onClick={handleBuy}
              disabled={purchasing}
              className="w-full mt-2.5 h-9 rounded-full bg-brand text-white text-sm font-bold hover:bg-brand-dark transition active:scale-[0.97] disabled:opacity-60"
            >
              {purchasing
                ? "Please wait..."
                : `Buy for ₹${quantity * paidDemoPrice}`}
            </button>

            {purchaseNotice && (
              <p className="text-xs text-amber-600 mt-2">{purchaseNotice}</p>
            )}
          </div>

          <div className="h-px bg-violet-100 mb-4" />

          {/* UPCOMING DEMOS */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1.5">
              <CalendarClock size={13} />
              Upcoming demos
            </p>

            {bookingsLoading ? (
              <p className="text-xs text-gray-400">Loading...</p>
            ) : upcomingBookings.length === 0 ? (
              <p className="text-xs text-gray-500">
                No upcoming demos scheduled yet.{" "}
                <Link
                  href="/parent"
                  className="text-brand font-semibold hover:underline"
                  onClick={() => setOpen(false)}
                >
                  Browse courses
                </Link>{" "}
                to book one.
              </p>
            ) : (
              <ul className="space-y-2">
                {upcomingBookings.map((booking) => (
                  <li
                    key={booking.id}
                    className="flex items-center gap-2 bg-violet-50/60 rounded-xl px-3 py-2"
                  >
                    <Sparkles
                      size={13}
                      className="text-amber-400 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {booking.course.courseTitle || "Demo session"}
                        {booking.teacher &&
                          ` · ${booking.teacher.visibleName || booking.teacher.firstName}`}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {booking.scheduledAt
                          ? new Date(booking.scheduledAt).toLocaleString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                hour: "numeric",
                                minute: "2-digit",
                              },
                            )
                          : "Time to be confirmed"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
