"use client";

import { useMemo, useState } from "react";

import PdDialog from "@/features/parent/components/courses/PdDialog";
import {
  PD_BTN_PRI,
  PD_BTN_SEC,
  PD_ERR,
  PD_INPUT,
  PD_LABEL,
} from "@/features/parent/components/courses/pdUi";
import { monthKeyOf, shiftMonth } from "@/features/parent/components/calendar/calendarLogic";
import { inKid, whenLabel, type LearnerFilter } from "@/features/parent/components/home/homeLogic";
import type { HomeKid } from "@/features/parent/components/home/homeTypes";
import { toIsoDate } from "@/features/parent/components/reschedule/rescheduleLogic";
import { useParentCalendar } from "@/features/parent/hooks/useCalendar";
import { useProposeSessionReschedule } from "@/features/parent/hooks/useProposeSessionReschedule";
import type { RescheduleRequestRow } from "@/features/shared/types/rescheduleRequest";

const MAX_OPTIONS = 12;
const TEXTAREA =
  "min-h-24 w-full resize-y rounded-xl border border-pd-line2 bg-white p-3 text-sm text-pd-ink outline-none transition focus:border-pd-brand focus:ring-4 focus:ring-pd-b100 aria-invalid:border-pd-red";

interface Props {
  kids: HomeKid[];
  filter: LearnerFilter;
  /** A class to start on (from "Reschedule" on a class), or null. */
  initialSessionId: string | null;
  onSent: (request: RescheduleRequestRow) => void;
  onClose: () => void;
}

/** "Request a reschedule" dialog: pick an upcoming class, a new date/time and a reason. */
export default function RescheduleRequestDialog({
  kids,
  filter,
  initialSessionId,
  onSent,
  onClose,
}: Props) {
  const now = useMemo(() => new Date(), []);
  const thisMonth = monthKeyOf(now);
  const first = useParentCalendar(thisMonth);
  const second = useParentCalendar(shiftMonth(thisMonth, 1));
  const loading = first.loading || second.loading;

  // Upcoming classes this month and next, for the chosen learner(s).
  const options = useMemo(() => {
    return [...first.occurrences, ...second.occurrences]
      .filter((o) => o.status === "SCHEDULED" && inKid(filter, o.studentId))
      .map((o) => ({
        o,
        start: o.startsAt ? new Date(o.startsAt) : new Date(`${o.date}T${o.time ?? "00:00"}:00`),
      }))
      .filter((x) => x.start.getTime() > now.getTime())
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, MAX_OPTIONS);
  }, [first.occurrences, second.occurrences, filter, now]);

  const defaultDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return toIsoDate(d);
  }, []);

  const [picked, setPicked] = useState<string | null>(initialSessionId);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("17:00");
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState("");

  const sessionId =
    options.find((x) => x.o.id === picked)?.o.id ?? options[0]?.o.id ?? "";
  const { submit, submitting, error } = useProposeSessionReschedule(sessionId);

  async function handleSend() {
    if (!sessionId) return;

    if (!date || !time) {
      setFieldError("Pick a new date and time.");
      return;
    }
    if (reason.trim().length < 5) {
      setFieldError("Please add a short reason.");
      return;
    }

    setFieldError("");
    const request = await submit({
      proposedDate: date,
      proposedTime: time,
      reason: reason.trim(),
    });

    if (request) onSent(request);
  }

  const shownError = fieldError || error;

  return (
    <PdDialog
      title="Request a reschedule"
      onClose={onClose}
      inlineFooter
      footer={
        <>
          <button type="button" onClick={onClose} className={PD_BTN_SEC}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={submitting || loading || !sessionId}
            className={PD_BTN_PRI}
          >
            {submitting ? "Sending…" : "Send request"}
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        noValidate
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="rs-s" className={PD_LABEL}>
            Which class?
          </label>
          <select
            id="rs-s"
            value={sessionId}
            disabled={loading || options.length === 0}
            onChange={(e) => setPicked(e.target.value)}
            className={PD_INPUT}
          >
            {options.length === 0 && (
              <option value="">{loading ? "Loading classes…" : "No upcoming classes"}</option>
            )}
            {options.map(({ o, start }) => (
              <option key={o.id} value={o.id}>
                {o.courseTitle ?? o.subject ?? "Class"}
                {kids.length > 1 ? ` (${o.studentName.split(/\s+/)[0]})` : ""} — {whenLabel(start, now)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="rs-d" className={PD_LABEL}>
              New date
            </label>
            <input
              id="rs-d"
              type="date"
              value={date}
              min={toIsoDate(now)}
              onChange={(e) => setDate(e.target.value)}
              className={PD_INPUT}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="rs-t" className={PD_LABEL}>
              New time
            </label>
            <input
              id="rs-t"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={PD_INPUT}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="rs-r" className={PD_LABEL}>
            Reason
          </label>
          <textarea
            id="rs-r"
            maxLength={300}
            value={reason}
            aria-invalid={fieldError.includes("reason") || undefined}
            onChange={(e) => setReason(e.target.value)}
            className={TEXTAREA}
          />
          {shownError && (
            <span role="alert" className={PD_ERR}>
              {shownError}
            </span>
          )}
        </div>
      </form>
    </PdDialog>
  );
}
