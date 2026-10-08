import {
    createNotification,
    notifyAllAdmins
} from "@/features/shared/server/notification.service";
import { formatPlatformTime } from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import "server-only";
import { R, T, displayName, loadEnrollmentContext, safe } from './shared';

// ---------------------------------------------------------------------------
// Session follow-ups and leave shifts (Part 1C)
// ---------------------------------------------------------------------------

export interface SessionFollowUpNotice {
  sessionId: string;
  /** The outcome that caused the follow-up. */
  outcome: "TEACHER_NO_SHOW" | "STUDENT_NO_SHOW" | "NOBODY_JOINED" | "TEACHER_CANCELLED";
  /** When the make-up starts, or null if none was created. */
  makeupStartsAt: Date | null;
  /** True when a make-up was wanted but no slot fits inside the 45-day window. */
  makeupWanted: boolean;
  strikeRecorded: boolean;
}
/**
 * One call per applied follow-up (the caller only invokes it for the
 * request that actually applied it, so nothing here can double-send):
 * the parent hears what happened and what replaces the class, the
 * teacher hears about a make-up or strike, and Admin is alerted to a
 * teacher no-show. Uses the existing in-app notification feed.
 */
export function notifySessionFollowUp(notice: SessionFollowUpNotice) {
  return safe("session follow-up", async () => {
    const session = await prisma.classSession.findUnique({
      where: { id: notice.sessionId },
      select: {
        parentId: true,
        teacherId: true,
        startsAt: true,
        scheduledDate: true,
        enrollment: { select: { course: { select: { courseTitle: true } } } },
        student: { select: { firstName: true, visibleName: true } },
        teacher: { select: { firstName: true, lastName: true, visibleName: true } },
      },
    });
    if (!session) return;

    const courseTitle = session.enrollment.course.courseTitle || "the course";
    const classWhen = session.startsAt
      ? formatPlatformTime(session.startsAt, true)
      : session.scheduledDate.toISOString().slice(0, 10);
    const makeupWhen = notice.makeupStartsAt ? formatPlatformTime(notice.makeupStartsAt, true) : null;
    const teacherName = displayName(session.teacher);
    const studentName = displayName(session.student);

    const makeupLine = makeupWhen
      ? ` A make-up class is scheduled for ${makeupWhen}.`
      : notice.makeupWanted
        ? " No make-up slot fits inside this cycle's 45-day window, so this class will not be counted."
        : "";

    if (notice.outcome === "STUDENT_NO_SHOW") {
      await createNotification({
        recipientId: session.parentId,
        recipientRole: R.PARENT,
        type: T.SESSION_STUDENT_NO_SHOW,
        title: "Class missed",
        message: `${studentName} did not join the ${classWhen} class for "${courseTitle}". The class still counts toward this cycle.`,
        link: "/parent/calendar",
      });
      return;
    }

    const parentMessage =
      notice.outcome === "TEACHER_NO_SHOW"
        ? `${teacherName} did not join the ${classWhen} class for "${courseTitle}".${makeupLine}`
        : notice.outcome === "NOBODY_JOINED"
          ? `Nobody joined the ${classWhen} class for "${courseTitle}", so it was cancelled.${makeupLine}`
          : `${teacherName} cancelled the ${classWhen} class for "${courseTitle}".${makeupLine}`;

    await createNotification({
      recipientId: session.parentId,
      recipientRole: R.PARENT,
      type: makeupWhen ? T.SESSION_MAKEUP_SCHEDULED : T.SESSION_TEACHER_NO_SHOW,
      title: makeupWhen ? "Make-up class scheduled" : "Class not held",
      message: parentMessage,
      link: "/parent/calendar",
    });

    if (makeupWhen) {
      await createNotification({
        recipientId: session.teacherId,
        recipientRole: R.TEACHER,
        type: T.SESSION_MAKEUP_SCHEDULED,
        title: "Make-up class scheduled",
        message: `A make-up class for "${courseTitle}" (${studentName}) is scheduled for ${makeupWhen}.`,
        link: "/teacher/calendar",
      });
    }

    if (notice.strikeRecorded) {
      await createNotification({
        recipientId: session.teacherId,
        recipientRole: R.TEACHER,
        type: T.TEACHER_STRIKE_RECORDED,
        title: "Strike recorded",
        message:
          notice.outcome === "TEACHER_NO_SHOW"
            ? `A strike was recorded because you did not join the ${classWhen} class for "${courseTitle}".`
            : `A strike was recorded because you cancelled the ${classWhen} class for "${courseTitle}".`,
        link: "/teacher/classes",
      });
    }

    if (notice.outcome === "TEACHER_NO_SHOW") {
      await notifyAllAdmins({
        type: T.SESSION_TEACHER_NO_SHOW,
        title: "Teacher no-show",
        message: `${teacherName} did not join the ${classWhen} class for "${courseTitle}" (${studentName}). A strike was recorded.`,
        link: "/admin/teacher-directory",
      });
    }
  });
}
export interface LeaveShiftNotice {
  enrollmentId: string;
  moved: { from: Date; to: Date }[];
  /** Classes that could not be moved inside the 45-day window and were cancelled. */
  cancelled: Date[];
}
/** Tells a parent which of their classes moved because the teacher's leave was approved. */
export function notifySessionsMovedForLeave(notice: LeaveShiftNotice) {
  return safe("sessions moved for leave", async () => {
    const e = await loadEnrollmentContext(notice.enrollmentId);
    if (!e) return;

    const courseTitle = e.course.courseTitle || "your course";
    const teacherName = displayName(e.teacher);
    const parts: string[] = [];

    if (notice.moved.length > 0) {
      const shown = notice.moved
        .slice(0, 3)
        .map((m) => `${formatPlatformTime(m.from, true)} to ${formatPlatformTime(m.to, true)}`)
        .join("; ");
      const more = notice.moved.length > 3 ? ` and ${notice.moved.length - 3} more` : "";

      parts.push(`Moved: ${shown}${more}.`);
    }

    if (notice.cancelled.length > 0) {
      const shown = notice.cancelled
        .slice(0, 3)
        .map((d) => formatPlatformTime(d, true))
        .join("; ");

      parts.push(
        `Could not be moved inside this cycle's 45-day window, so they will not be counted: ${shown}.`,
      );
    }

    if (parts.length === 0) return;

    await createNotification({
      recipientId: e.parentId,
      recipientRole: R.PARENT,
      type: T.SESSION_MOVED_FOR_LEAVE,
      title: "Classes moved for teacher leave",
      message: `${teacherName} is on approved leave, so some "${courseTitle}" classes changed. ${parts.join(" ")}`,
      link: "/parent/calendar",
    });
  });
}
// ---------------------------------------------------------------------------
// After-class and disputes (Part 2A)
// ---------------------------------------------------------------------------

async function loadSessionNoticeContext(sessionId: string) {
  return prisma.classSession.findUnique({
    where: { id: sessionId },
    select: {
      parentId: true,
      teacherId: true,
      startsAt: true,
      scheduledDate: true,
      enrollment: { select: { course: { select: { courseTitle: true } } } },
      student: { select: { firstName: true, visibleName: true } },
      teacher: { select: { firstName: true, lastName: true, visibleName: true } },
    },
  });
}
function sessionWhen(session: { startsAt: Date | null; scheduledDate: Date }) {
  return session.startsAt
    ? formatPlatformTime(session.startsAt, true)
    : session.scheduledDate.toISOString().slice(0, 10);
}
/** A parent reported a problem — every Admin gets it in their queue. */
export function notifySessionOutcomeReported(sessionId: string) {
  return safe("session outcome reported", async () => {
    const session = await loadSessionNoticeContext(sessionId);
    if (!session) return;

    const courseTitle = session.enrollment.course.courseTitle || "the course";

    await notifyAllAdmins({
      type: T.SESSION_OUTCOME_REPORTED,
      title: "Class outcome reported",
      message: `A parent reported a problem with the ${sessionWhen(session)} class for "${courseTitle}" (${displayName(session.student)} with ${displayName(session.teacher)}).`,
      link: "/admin/session-reviews",
    });
  });
}
/** Both joined for under half the class — Admin has to decide. */
export function notifySessionNeedsReview(sessionId: string) {
  return safe("session needs review", async () => {
    const session = await loadSessionNoticeContext(sessionId);
    if (!session) return;

    const courseTitle = session.enrollment.course.courseTitle || "the course";

    await notifyAllAdmins({
      type: T.SESSION_NEEDS_REVIEW,
      title: "Class needs review",
      message: `The ${sessionWhen(session)} class for "${courseTitle}" (${displayName(session.student)} with ${displayName(session.teacher)}) ran for under half its time and needs an outcome.`,
      link: "/admin/session-reviews",
    });
  });
}
export interface SessionOutcomeDecidedNotice {
  sessionId: string;
  /** Plain-English outcome, e.g. "Completed". */
  outcomeLabel: string;
  changed: boolean;
  kind: "DECISION" | "OVERRIDE";
}
/** Admin decided (or overrode) an outcome — tell the parent and the teacher. */
export function notifySessionOutcomeDecided(notice: SessionOutcomeDecidedNotice) {
  return safe("session outcome decided", async () => {
    const session = await loadSessionNoticeContext(notice.sessionId);
    if (!session) return;

    const courseTitle = session.enrollment.course.courseTitle || "the course";
    const when = sessionWhen(session);

    const result = notice.changed
      ? `An Admin reviewed it and recorded it as: ${notice.outcomeLabel}.`
      : `An Admin reviewed it and the recorded outcome (${notice.outcomeLabel}) stands.`;

    const title = notice.kind === "OVERRIDE" ? "Class outcome changed" : "Class reviewed";

    await createNotification({
      recipientId: session.parentId,
      recipientRole: R.PARENT,
      type: T.SESSION_OUTCOME_DECIDED,
      title,
      message: `The ${when} class for "${courseTitle}": ${result}`,
      link: `/parent/classes/${notice.sessionId}/join`,
    });

    await createNotification({
      recipientId: session.teacherId,
      recipientRole: R.TEACHER,
      type: T.SESSION_OUTCOME_DECIDED,
      title,
      message: `The ${when} class for "${courseTitle}" (${displayName(session.student)}): ${result}`,
      link: `/teacher/classes/${notice.sessionId}/start`,
    });
  });
}
