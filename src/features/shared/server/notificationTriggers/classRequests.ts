import {
    createNotification,
    createNotifications,
    notifyAllAdmins,
} from "@/features/shared/server/notification.service";
import { prisma } from "@/lib/prisma";
import "server-only";
import { R, T, safe } from './shared';

// ---------------------------------------------------------------------------
// Custom class requests (Oct 2026)
// ---------------------------------------------------------------------------

/** A Parent asked for a class that isn't in the catalogue — every Admin gets told. */
export function notifyClassRequestSubmitted(input: { title: string; subject: string }) {
  return safe("class request submitted", async () => {
    await notifyAllAdmins({
      type: T.CLASS_REQUEST_SUBMITTED,
      title: "New class request",
      message: `A parent requested a custom class: "${input.title}" (${input.subject}).`,
      link: "/admin/class-requests",
    });
  });
}
/** Admin approved, rejected or closed a request — tells the Parent who raised it. */
export function notifyClassRequestReviewed(input: {
  parentId: string;
  title: string;
  outcome: "APPROVED" | "REJECTED" | "CLOSED";
  adminNote?: string | null;
}) {
  return safe("class request reviewed", async () => {
    const copy =
      input.outcome === "APPROVED"
        ? "was approved and shared with our teachers."
        : input.outcome === "REJECTED"
          ? "could not be taken forward."
          : "was closed.";

    await createNotification({
      recipientId: input.parentId,
      recipientRole: R.PARENT,
      type: T.CLASS_REQUEST_REVIEWED,
      title: "Class request update",
      message: `Your request "${input.title}" ${copy}${input.adminNote ? ` Note: ${input.adminNote}` : ""}`,
      link: "/parent/request-class",
    });
  });
}
/** Admin circulated a request — every approved Teacher sees it as a new vacancy. */
export function notifyClassRequestVacancy(input: {
  title: string;
  subject: string;
  grade?: string | null;
}) {
  return safe("class request vacancy", async () => {
    const teachers = await prisma.teacher.findMany({
      where: { approvalStatus: "APPROVED" },
      select: { id: true },
    });

    await createNotifications(
      teachers.map((teacher) => ({
        recipientId: teacher.id,
        recipientRole: R.TEACHER,
        type: T.CLASS_REQUEST_VACANCY,
        title: "New class vacancy",
        message: `Families are looking for: "${input.title}" (${input.subject}${
          input.grade ? `, ${input.grade}` : ""
        }).`,
        link: "/teacher/vacancy",
      })),
    );
  });
}
/** A Teacher accepted a vacancy — tells the Parent and every Admin. */
export function notifyClassRequestAccepted(input: {
  parentId: string;
  title: string;
  teacherName: string;
}) {
  return safe("class request accepted", async () => {
    await createNotification({
      recipientId: input.parentId,
      recipientRole: R.PARENT,
      type: T.CLASS_REQUEST_ACCEPTED,
      title: "A teacher accepted your request",
      message: `${input.teacherName} accepted "${input.title}" and will list a course for it. We'll let you know when it's live.`,
      link: "/parent/request-class",
    });

    await notifyAllAdmins({
      type: T.CLASS_REQUEST_ACCEPTED,
      title: "Vacancy accepted",
      message: `${input.teacherName} accepted the class request "${input.title}".`,
      link: "/admin/class-requests",
    });
  });
}
