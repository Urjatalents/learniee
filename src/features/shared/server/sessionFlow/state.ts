import {
    isCohostConfirmed
} from "@/features/shared/server/sessionMeeting.service";
import type { SessionFlowState } from "@/features/shared/types/sessionFlow";
import { cycleDeadlineDate } from "@/features/shared/utils/cyclePlan";
import { buildTeacherLaunchUrl } from "@/features/shared/utils/meetLaunch";
import {
    canAddSummary,
    canParentRespond,
    getConfirmationState
} from "@/features/shared/utils/outcomeConfirmation";
import {
    joinOpensAt,
    overlapPercent,
    SESSION_STATUS_LABEL,
    studentAbsentFrom,
    type SessionActorRole,
    type SessionStatusValue
} from "@/features/shared/utils/sessionOutcome";
import { isGoogleMeetEnabled } from "@/lib/googleMeet";
import {
    dateToCalendarDate,
    toDateKey
} from "@/lib/platformTime";
import {
    ClassSessionStatus
} from "@prisma/client";
import "server-only";
import { displayName, FlowSession, isCycleSession, iso, loadAndSettle, loadSession, SessionActor, toConfirmationInput } from './core';

export function toState(session: FlowSession, role: SessionActorRole, now: Date): SessionFlowState {
  const otherPartyName =
    role === "TEACHER" ? displayName(session.student) : displayName(session.teacher);
  const courseTitle = session.enrollment.course.courseTitle ?? session.enrollment.subject ?? null;

  if (!isCycleSession(session)) {
    const d = new Date(session.scheduledDate);

    return {
      id: session.id,
      isCycleSession: false,
      status: session.status,
      scheduledDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`,
      scheduledTime: session.scheduledTime,
      startsAt: null,
      endsAt: null,
      joinOpensAt: null,
      studentAbsentFrom: null,
      teacherStartedAt: null,
      teacherEndedAt: null,
      studentJoinedAt: null,
      cancelledByRole: null,
      overlapPercent: null,
      cycleDeadline: null,
      otherPartyName,
      courseTitle,
      summary: null,
      summaryUpdatedAt: null,
      confirmation: null,
      meetingEnabled: false,
      meetingUri: null,
      meetingAccountEmail: null,
      meetingCohost: null,
      studentName: null,
      serverNow: now.toISOString(),
    };
  }

  // The Meet link goes only to the viewer who has already started
  // (teacher) or joined (parent), and only while the class is live.
  const viewerPresent =
    role === "TEACHER" ? session.teacherStartedAt !== null : session.studentJoinedAt !== null;
  const rawMeetingUri =
    viewerPresent &&
    session.status === ClassSessionStatus.SCHEDULED &&
    session.teacherEndedAt === null
      ? session.meetingUri
      : null;
  // Teacher: open Meet through Google's account chooser with their login
  // email pre-selected, so a browser with several Google accounts uses the
  // co-host account (recording and host controls need it). Parents keep
  // the plain link.
  const teacherEmail = session.teacher.email?.trim() || null;
  const meetingUri =
    rawMeetingUri && role === "TEACHER"
      ? buildTeacherLaunchUrl(rawMeetingUri, teacherEmail)
      : rawMeetingUri;

  const times = { startsAt: session.startsAt, endsAt: session.endsAt };
  const confirmation = getConfirmationState(toConfirmationInput(session), now);

  return {
    id: session.id,
    isCycleSession: true,
    status: session.status,
    scheduledDate: toDateKey(dateToCalendarDate(session.scheduledDate)),
    scheduledTime: session.scheduledTime,
    startsAt: iso(session.startsAt),
    endsAt: iso(session.endsAt),
    joinOpensAt: iso(joinOpensAt(session.startsAt)),
    studentAbsentFrom: iso(studentAbsentFrom(session.startsAt)),
    teacherStartedAt: iso(session.teacherStartedAt),
    teacherEndedAt: iso(session.teacherEndedAt),
    studentJoinedAt: iso(session.studentJoinedAt),
    cancelledByRole: session.cancelledByRole,
    overlapPercent: overlapPercent(times, session.overlapSeconds),
    cycleDeadline: session.cycle
      ? toDateKey(cycleDeadlineDate(dateToCalendarDate(session.cycle.startDate)))
      : null,
    otherPartyName,
    courseTitle,
    // The summary is the teacher's to see for now; the parent's class
    // page shows it in Part 2C.
    summary: role === "TEACHER" ? session.teacherSummary : null,
    summaryUpdatedAt: role === "TEACHER" ? iso(session.teacherSummaryAt) : null,
    confirmation: {
      phase: confirmation.phase,
      settled: confirmation.settled,
      windowEndsAt: iso(confirmation.windowEndsAt),
      canRespond: role === "PARENT" && canParentRespond(toConfirmationInput(session), now),
      // The parent's own words go back to the parent (and Admin) only.
      reportNote: role === "PARENT" ? session.reportNote : null,
      reportedAt: role === "PARENT" ? iso(session.reportedAt) : null,
      canEditSummary: role === "TEACHER" && canAddSummary(session),
    },
    meetingEnabled: isGoogleMeetEnabled(),
    meetingUri,
    meetingAccountEmail: role === "TEACHER" ? teacherEmail : null,
    // Teacher only. Null until a room exists; then CONFIRMED (Meet shows
    // them as co-host) or PENDING (not confirmed — the page offers a retry).
    meetingCohost:
      role === "TEACHER" && isGoogleMeetEnabled() && session.meetingUri
        ? isCohostConfirmed(session)
          ? "CONFIRMED"
          : "PENDING"
        : null,
    studentName: role === "PARENT" ? displayName(session.student) : null,
    serverNow: now.toISOString(),
  };
}
export function statusLabel(status: SessionStatusValue) {
  return SESSION_STATUS_LABEL[status].toLowerCase();
}
/** The page's read: settles an ended session first, then returns its state. */
export async function getSessionFlowState(
  sessionId: string,
  actor: SessionActor,
  now: Date = new Date(),
): Promise<SessionFlowState> {
  const session = await loadAndSettle(sessionId, actor, now);

  return toState(session, actor.role, now);
}
export async function reload(sessionId: string, actor: SessionActor, now: Date) {
  return toState(await loadSession(sessionId, actor), actor.role, now);
}
