"use client";

import Link from "next/link";

import DemoJoinButton from "@/features/shared/components/DemoJoinButton";
import { Tag } from "@/features/parent/components/home/HomeBits";
import { PD_BTN_SEC_SM } from "@/features/parent/components/courses/pdUi";
import { countdown, fmtTime, inr } from "@/features/parent/components/home/homeLogic";
import type { DemoBookingListItem } from "@/features/parent/hooks/useDemoBookings";

interface Props {
  booking: DemoBookingListItem;
  meetEnabled: boolean;
  /** Server time minus device time (ms). */
  skewMs: number;
  /** Server-corrected "now" (ms), ticking, so countdown text stays fresh. */
  nowMs: number;
}

const teacherName = (t: DemoBookingListItem["teacher"]) =>
  t.visibleName || `${t.firstName} ${t.lastName}`.trim() || "Teacher";

/** One demo in the Demos list (date chip, who/when, price tag, Join / Enroll). */
export default function DemoRow({ booking, meetEnabled, skewMs, nowMs }: Props) {
  const start = booking.scheduledAt ? new Date(booking.scheduledAt) : null;
  const kid = booking.student.visibleName || booking.student.firstName;
  const amount = Number(booking.amount);
  const confirmed = booking.status === "CONFIRMED";
  const attended = booking.status === "COMPLETED";

  const tag =
    booking.status === "PENDING_PAYMENT" ? (
      <Tag tone="amber">Pending payment</Tag>
    ) : booking.status === "CANCELLED" ? (
      <Tag tone="gray">Cancelled</Tag>
    ) : booking.isPaid && amount > 0 ? (
      <Tag tone="gray">{inr(amount)} paid</Tag>
    ) : (
      <Tag tone="green">Free</Tag>
    );

  return (
    <div className="flex w-full items-center gap-3 border-t border-pd-line px-5 py-3.5 first:border-t-0">
      <div className="w-[46px] shrink-0 rounded-lg bg-pd-b50 py-1.5 text-center leading-[1.1]">
        <small className="block text-xs font-semibold text-pd-brand">
          {start ? start.toLocaleDateString("en-IN", { month: "short" }) : "—"}
        </small>
        <b className="font-heading text-lg font-medium">{start ? start.getDate() : "—"}</b>
      </div>

      <div className="min-w-0 flex-1">
        <b className="block truncate text-sm font-medium">
          {booking.course.courseTitle || "Demo session"}
        </b>
        <small className="block text-[13px] font-normal text-pd-ink3">
          {teacherName(booking.teacher)} · {kid} ·{" "}
          {start
            ? `${start.toLocaleDateString("en-IN", { weekday: "short" })}, ${fmtTime(start)}`
            : "Time not set"}
        </small>
      </div>

      {tag}

      {confirmed && start ? (
        <DemoJoinButton
          variant="pd"
          role="parent"
          bookingId={booking.id}
          status={booking.status}
          joinWindow={booking.joinWindow}
          meetEnabled={meetEnabled}
          skewMs={skewMs}
          copyText={kid}
          countdownText={countdown(start, new Date(nowMs)).text}
        />
      ) : attended && booking.course.id ? (
        <Link href={`/parent/courses/${booking.course.id}`} className={PD_BTN_SEC_SM}>
          Enroll
        </Link>
      ) : null}
    </div>
  );
}
