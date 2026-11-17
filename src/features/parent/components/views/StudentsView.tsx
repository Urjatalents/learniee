"use client";

import Link from "next/link";
import { Plus, Users } from "lucide-react";

import { PD_BTN_PRI_SM, PD_BTN_SEC_SM, PdEmpty } from "@/features/parent/components/courses/pdUi";
import { KidAvatar } from "@/features/parent/components/home/HomeBits";
import { PD_CARD_FLUSH, PdBanner, PdSkeleton } from "@/features/parent/components/payments/paymentsUi";
import { useStudents } from "@/features/parent/hooks/useStudents";

/** "Students" tab of Account — the child profiles on this parent account. */
export default function StudentsView() {
  const { students, loading, error } = useStudents();

  return (
    <div className="mt-6 max-w-[820px]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <p className="text-[13px] text-pd-ink3">
          Your children’s profiles. Open one to see details or remove it.
        </p>
        <Link href="/parent/students/new" className={`${PD_BTN_PRI_SM} shrink-0`}>
          <Plus size={14} />
          Add a learner
        </Link>
      </div>

      {error && (
        <div className="mb-3">
          <PdBanner tone="red">{error}</PdBanner>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          <PdSkeleton height={72} />
          <PdSkeleton height={72} />
        </div>
      ) : students.length === 0 ? (
        <div className={PD_CARD_FLUSH}>
          <PdEmpty
            icon={Users}
            title="No learners yet"
            text="You haven’t added a child profile yet. Add one to book demos and enroll."
            action={
              <Link href="/parent/students/new" className={PD_BTN_PRI_SM}>
                <Plus size={14} />
                Add a learner
              </Link>
            }
          />
        </div>
      ) : (
        <div className={PD_CARD_FLUSH}>
          {students.map((s) => {
            const name = s.visibleName || `${s.firstName} ${s.lastName}`.trim();
            const meta = [s.standard, s.board, s.age != null ? `Age ${s.age}` : null]
              .filter(Boolean)
              .join(" · ");

            return (
              <div
                key={s.id}
                className="flex items-center gap-3 border-t border-pd-line px-5 py-3.5 first:border-t-0"
              >
                <KidAvatar name={s.firstName} color={null} size="lg" />
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-sm font-medium text-pd-ink">{name}</b>
                  <small className="block truncate text-[13px] text-pd-ink3">
                    {meta || "Tap View profile to complete details"}
                  </small>
                </div>
                <Link href={`/parent/students/${s.id}`} className={`${PD_BTN_SEC_SM} shrink-0`}>
                  View profile
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
