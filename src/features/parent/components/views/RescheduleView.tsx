"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { usePdToast } from "@/features/parent/components/courses/usePdToast";
import { PdEmpty } from "@/features/parent/components/courses/pdUi";
import HomeLearnerSwitcher from "@/features/parent/components/home/HomeLearnerSwitcher";
import { inKid, kidColor, type LearnerFilter } from "@/features/parent/components/home/homeLogic";
import { firstWord, toHomeKids } from "@/features/parent/components/my-classes/pdClassesUi";
import PdSegmented from "@/features/parent/components/PdSegmented";
import type { RescheduleAction } from "@/features/parent/components/reschedule/RescheduleActions";
import RescheduleDetailDialog from "@/features/parent/components/reschedule/RescheduleDetailDialog";
import {
  GROUP_EMPTY,
  GROUP_LABEL,
  splitByGroup,
  type RescheduleGroup,
} from "@/features/parent/components/reschedule/rescheduleLogic";
import RescheduleRequestDialog from "@/features/parent/components/reschedule/RescheduleRequestDialog";
import RescheduleRow from "@/features/parent/components/reschedule/RescheduleRow";
import { useParentRescheduleRequests } from "@/features/parent/hooks/useRescheduleRequests";
import { useStudents } from "@/features/parent/hooks/useStudents";
import ErrorBanner from "@/features/shared/components/ErrorBanner";
import { displayNameFor, type RescheduleRequestRow } from "@/features/shared/types/rescheduleRequest";

const GROUPS: RescheduleGroup[] = ["you", "teacher", "hist"];

const TOAST: Record<RescheduleAction, string> = {
  approve: "Approved — class moved",
  reject: "Request declined",
  cancel: "Request withdrawn",
};

function RescheduleSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="overflow-hidden rounded-2xl border border-pd-line bg-white">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[72px] animate-pulse border-t border-pd-line bg-[#eeeaf7] first:border-t-0" />
      ))}
    </div>
  );
}

/**
 * Parent "Reschedule" page (design: Reschedule). Requests come from
 * `/api/parent/reschedule-requests`; Approve / Decline / Withdraw call its PATCH,
 * and "Request a reschedule" posts to `/api/parent/class-sessions/[id]/reschedule`.
 *
 * The dialog is opened by `?new=1` (the page's heading button) or `?new=<sessionId>`
 * (the old per-class reschedule link, which now redirects here).
 */
export default function RescheduleView() {
  const router = useRouter();
  const pathname = usePathname();
  const newParam = useSearchParams().get("new");

  const { toast, toastNode } = usePdToast();
  const { students } = useStudents();
  const { requests, loading, error, actingId, approve, reject, cancel, reload } =
    useParentRescheduleRequests();

  const [filter, setFilter] = useState<LearnerFilter>("all");
  const [stat, setStat] = useState<RescheduleGroup | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);

  const kids = useMemo(() => toHomeKids(students), [students]);

  const mine = requests.filter((r) => inKid(filter, r.classSession.studentId));
  const groups = splitByGroup(mine);
  const active: RescheduleGroup =
    stat ?? (groups.you.length ? "you" : groups.teacher.length ? "teacher" : "hist");
  const list = groups[active];
  const [emptyTitle, emptyText] = GROUP_EMPTY[active];
  const viewed = requests.find((r) => r.id === viewId) ?? null;

  const kidFirst = (r: RescheduleRequestRow) => {
    const k = kids.find((x) => x.id === r.classSession.studentId);
    return k ? firstWord(k.first) : "—";
  };

  async function handleAct(action: RescheduleAction, r: RescheduleRequestRow) {
    setViewId(null);

    const done =
      action === "approve" ? await approve(r.id) : action === "reject" ? await reject(r.id) : await cancel(r.id);

    if (done) toast(TOAST[action]);
  }

  function closeNew() {
    router.replace(`${pathname}?tab=reschedule`, { scroll: false });
  }

  return (
    <div className="pt-1">
      <div className="mb-[18px] mt-[22px] flex flex-wrap items-center justify-between gap-3">
        <PdSegmented
          label="Request status"
          value={active}
          onChange={setStat}
          options={GROUPS.map((g) => ({
            value: g,
            label: GROUP_LABEL[g],
            count: groups[g].length,
            warn: g === "you" && groups[g].length > 0,
          }))}
        />
        {/* The design hides "Add learner" in this row. */}
        <div className="[&_a]:hidden [&>div]:mt-0">
          <HomeLearnerSwitcher kids={kids} active={filter} onSelect={setFilter} />
        </div>
      </div>

      {error && <ErrorBanner size="compact">{error}</ErrorBanner>}

      {loading && requests.length === 0 ? (
        <RescheduleSkeleton />
      ) : list.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-pd-line bg-white">
          {list.map((r) => (
            <RescheduleRow
              key={r.id}
              request={r}
              kidFirst={kidFirst(r)}
              kidColor={kidColor(kids, r.classSession.studentId)}
              acting={actingId === r.id}
              onOpen={(x) => setViewId(x.id)}
              onAct={handleAct}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-pd-line bg-white">
          <PdEmpty icon={RefreshCw} title={emptyTitle} text={emptyText} />
        </div>
      )}

      {viewed && (
        <RescheduleDetailDialog
          request={viewed}
          kidFirst={kidFirst(viewed)}
          acting={actingId === viewed.id}
          onAct={handleAct}
          onClose={() => setViewId(null)}
        />
      )}

      {newParam && (
        <RescheduleRequestDialog
          key={newParam}
          kids={kids}
          filter={filter}
          initialSessionId={newParam === "1" ? null : newParam}
          onClose={closeNew}
          onSent={(request) => {
            toast(`Request sent to ${displayNameFor(request.teacher)}`);
            reload();
            closeNew();
          }}
        />
      )}

      {toastNode}
    </div>
  );
}
