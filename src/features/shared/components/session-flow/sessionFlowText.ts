import { formatPlatformTime } from "@/lib/platformTime";
import type { SessionFlowState } from "@/features/shared/types/sessionFlow";
import {
  getSessionActions,
  type SessionActorRole,
} from "@/features/shared/utils/sessionOutcome";

export type SessionTone = "info" | "success" | "warn" | "danger";

export interface SessionMessage {
  tone: SessionTone;
  title: string;
  body: string;
}

function at(iso: string | null) {
  return iso ? formatPlatformTime(new Date(iso)) : "";
}

/** "4:30 pm – 5:30 pm" for the header. */
export function formatSessionRange(state: SessionFlowState): string {
  if (!state.startsAt || !state.endsAt) return "";

  return `${at(state.startsAt)} – ${at(state.endsAt)}`;
}

/** The headline + one-line explanation for a cycle session, from one side's point of view. */
export function describeSession(
  state: SessionFlowState,
  role: SessionActorRole,
  now: Date,
): SessionMessage {
  const isTeacher = role === "TEACHER";

  switch (state.status) {
    case "COMPLETED":
      return {
        tone: "success",
        title: "Session completed",
        body: "This class was held and counts toward the cycle.",
      };

    case "STUDENT_NO_SHOW":
      return {
        tone: "warn",
        title: isTeacher ? "Student absent" : "You didn't join",
        body: isTeacher
          ? "The student didn't join, so this class is recorded as a no-show. It still counts and is paid."
          : "Nobody joined from your side, so this class is recorded as a no-show. It still counts and is charged.",
      };

    case "TEACHER_NO_SHOW":
      return {
        tone: "danger",
        title: isTeacher ? "Recorded as teacher absent" : "The teacher didn't start the class",
        body: isTeacher
          ? "The session wasn't started, so it doesn't count."
          : "The teacher never started this class, so it doesn't count toward the cycle.",
      };

    case "CANCELLED_LATE":
      return {
        tone: "warn",
        title: "Cancelled late",
        body: "It was cancelled less than 4 hours before the start, so this class still counts.",
      };

    case "CANCELLED":
      return {
        tone: "danger",
        title: "Session cancelled",
        body:
          state.cancelledByRole === "SYSTEM"
            ? "Nobody joined, so this class was cancelled automatically. It doesn't count."
            : state.cancelledByRole === "TEACHER"
              ? "The teacher cancelled this class. It doesn't count."
              : "This class was cancelled with enough notice. It doesn't count.",
      };

    case "NEEDS_REVIEW":
      return {
        tone: "warn",
        title: "Needs review",
        body: "Both of you joined, but for less than half of the class time. An Admin will review it.",
      };

    case "MISSED":
      return { tone: "danger", title: "Session missed", body: "This class was missed." };

    case "SCHEDULED":
      break;
  }

  const opensAt = state.joinOpensAt ? new Date(state.joinOpensAt) : null;

  if (state.teacherEndedAt) {
    return {
      tone: "info",
      title: "Session ended",
      body: "Recording the outcome…",
    };
  }

  if (isTeacher && state.teacherStartedAt) {
    if (state.studentJoinedAt) {
      return {
        tone: "success",
        title: "Session in progress",
        body: `Started at ${at(state.teacherStartedAt)}. The student joined at ${at(state.studentJoinedAt)}. Tap End when the class is over.`,
      };
    }

    const absentFrom = state.studentAbsentFrom ? new Date(state.studentAbsentFrom) : null;

    return {
      tone: "info",
      title: "Waiting for the student",
      body:
        absentFrom && now >= absentFrom
          ? "The student hasn't joined. You can now end the session as “student absent”."
          : `Started at ${at(state.teacherStartedAt)}. If the student doesn't join, you can end the session as “student absent” from ${at(state.studentAbsentFrom)}.`,
    };
  }

  if (!isTeacher && state.studentJoinedAt) {
    return {
      tone: "success",
      title: "You're in the session",
      body: state.teacherStartedAt
        ? `The teacher started at ${at(state.teacherStartedAt)}. This page updates when the class ends.`
        : "Waiting for the teacher to start. This page updates on its own.",
    };
  }

  if (opensAt && now < opensAt) {
    return {
      tone: "info",
      title: `Opens at ${at(state.joinOpensAt)}`,
      body: `You can ${isTeacher ? "start" : "join"} this session from 10 minutes before it begins at ${at(state.startsAt)}.`,
    };
  }

  const actions = getSessionActions(role, toActionInput(state), now);

  if (actions.canStart || actions.canJoin) {
    return {
      tone: "success",
      title: isTeacher ? "Ready to start" : "Ready to join",
      body: `Class time is ${formatSessionRange(state)}.`,
    };
  }

  return {
    tone: "warn",
    title: "This session is over",
    body: "Its time has passed. The outcome is being recorded.",
  };
}

/** `SessionFlowState` (ISO strings) -> the Date-based input `getSessionActions` takes. */
export function toActionInput(state: SessionFlowState) {
  return {
    status: state.status,
    startsAt: new Date(state.startsAt as string),
    endsAt: new Date(state.endsAt as string),
    teacherStartedAt: state.teacherStartedAt ? new Date(state.teacherStartedAt) : null,
    teacherEndedAt: state.teacherEndedAt ? new Date(state.teacherEndedAt) : null,
    studentJoinedAt: state.studentJoinedAt ? new Date(state.studentJoinedAt) : null,
  };
}
