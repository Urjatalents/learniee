"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { useChatRooms } from "@/features/chat/hooks/useChatRooms";
import { displayName } from "@/features/chat/types/chat";
import { useChatPreviews } from "@/features/parent/hooks/useClassListExtras";
import { useStudents } from "@/features/parent/hooks/useStudents";
import HomeLearnerSwitcher from "@/features/parent/components/home/HomeLearnerSwitcher";
import { dayDiff, fmtTime, inKid, type LearnerFilter } from "@/features/parent/components/home/homeLogic";
import { toHomeKids, firstWord } from "@/features/parent/components/my-classes/pdClassesUi";
import { GridSkeleton, PdEmpty } from "@/features/parent/components/courses/pdUi";
import type { ChatRoomSummary } from "@/features/chat/types/chat";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

/** "9:05 AM" today, "Yesterday", else "23 Oct". */
function shortWhen(iso: string, now: Date) {
  const d = new Date(iso);
  const n = dayDiff(d, now);

  if (n === 0) return fmtTime(d);
  if (n === -1) return "Yesterday";

  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** My Classes > Messages tab: one conversation per class. */
export default function ChatListView() {
  const { rooms, loading, error } = useChatRooms("/api/parent/chat");
  const previews = useChatPreviews();
  const { students } = useStudents();
  const [filter, setFilter] = useState<LearnerFilter>("all");
  const [now] = useState(() => new Date());

  const kids = toHomeKids(students);
  const mine = rooms.filter((r) => inKid(filter, r.student.id));
  const past = (r: ChatRoomSummary) => r.enrollment.status === "COMPLETED";
  const active = mine.filter((r) => !past(r));
  const ended = mine.filter(past);

  const row = (r: ChatRoomSummary) => {
    const teacher = displayName(r.teacher);
    const last = previews[r.id];

    return (
      <Link
        key={r.id}
        href={`/parent/chat/${r.id}`}
        className="flex w-full items-center gap-3.5 border-t border-pd-line px-[18px] py-3.5 text-left transition-colors first:border-t-0 hover:bg-[#faf9fe]"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#ebe9f5] text-lg font-semibold text-[#4b4575]">
          {(teacher || "?")[0]}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="flex items-baseline justify-between gap-2">
            <b className="truncate text-[15px] font-semibold">{teacher}</b>
            <time className="shrink-0 text-xs text-pd-ink3">
              {last ? shortWhen(last.createdAt, now) : ""}
            </time>
          </span>
          <span className="truncate text-xs text-pd-ink3">
            {r.course.courseTitle ?? "Untitled course"} · {firstWord(displayName(r.student))}
          </span>
          <span className="truncate text-sm text-pd-ink2">
            {last ? `${last.senderRole === "PARENT" ? "You: " : ""}${last.body}` : "No messages yet"}
          </span>
        </span>
      </Link>
    );
  };

  const group = (title: string, list: ChatRoomSummary[]) =>
    list.length > 0 && (
      <section className="mt-6">
        <h2 className="mb-3 font-heading text-[19px] font-semibold text-pd-ink">
          {title} <span className="text-xs font-medium text-pd-ink3">{list.length}</span>
        </h2>
        <div className="overflow-hidden rounded-2xl border border-pd-line bg-white">{list.map(row)}</div>
      </section>
    );

  return (
    <div>
      <div className="mb-[18px] mt-[22px] flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-pd-ink3">One conversation per class. Message the teacher directly.</p>
        <div className="[&>div]:mt-0!">
          <HomeLearnerSwitcher kids={kids} active={filter} onSelect={setFilter} />
        </div>
      </div>

      {error && <ErrorBanner spacing={false}>{error}</ErrorBanner>}

      {loading ? (
        <GridSkeleton count={3} height={72} />
      ) : mine.length === 0 ? (
        <div className="rounded-2xl border border-pd-line bg-white">
          <PdEmpty
            icon={MessageCircle}
            title="No conversations"
            text="Messages appear here once your child is enrolled."
          />
        </div>
      ) : (
        <>
          {group("Active classes", active)}
          {group("Past classes", ended)}
        </>
      )}
    </div>
  );
}
