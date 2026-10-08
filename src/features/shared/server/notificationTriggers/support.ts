import {
    createNotification,
    notifyAllAdmins
} from "@/features/shared/server/notification.service";
import { prisma } from "@/lib/prisma";
import {
    ComplainantRole,
    ComplaintStatus
} from "@prisma/client";
import "server-only";
import { R, T, displayName, safe } from './shared';

// ---------------------------------------------------------------------------
// Complaints (Sep 10, 2026) — Parent/Teacher raises -> Admin resolves.
// See the `Complaint` model's doc-comment in schema.prisma.
// ---------------------------------------------------------------------------

/** A Parent or Teacher raised a new complaint — every Admin gets told (same "any Admin can act" pattern as leave requests). */
export function notifyComplaintSubmitted(input: {
  raiserRole: ComplainantRole;
  raiserName: string | null;
  subject: string;
  department?: string | null;
}) {
  return safe("complaint submitted", async () => {
    const roleLabel = input.raiserRole === ComplainantRole.PARENT ? "A parent" : "A teacher";

    await notifyAllAdmins({
      type: T.COMPLAINT_SUBMITTED,
      title: "New complaint",
      message: `${input.raiserName ?? roleLabel} raised a complaint${
        input.department ? ` for ${input.department}` : ""
      }: "${input.subject}".`,
      link: "/admin/complaints",
    });
  });
}
const COMPLAINT_STATUS_COPY: Record<string, string> = {
  IN_PROGRESS: "is now being looked into",
  RESOLVED: "has been resolved",
  CLOSED: "has been closed",
};
/** Admin moved a complaint along — notifies whichever role (Parent or Teacher) raised it. */
export function notifyComplaintResolved(input: {
  raiserId: string;
  raiserRole: ComplainantRole;
  status: ComplaintStatus;
}) {
  return safe("complaint responded", async () => {
    const recipientRole = input.raiserRole === ComplainantRole.PARENT ? R.PARENT : R.TEACHER;
    const link = input.raiserRole === ComplainantRole.PARENT ? "/parent/complain" : "/teacher/complain";

    await createNotification({
      recipientId: input.raiserId,
      recipientRole,
      type: T.COMPLAINT_RESOLVED,
      title: "Complaint update",
      message: `Your complaint ${COMPLAINT_STATUS_COPY[input.status] ?? "was updated"} by Admin.`,
      link,
    });
  });
}
/**
 * A Parent submitted a Review (see `review.service.ts`) — notifies
 * the Teacher whose course/teaching it's about.
 */
export function notifyReviewSubmitted(reviewId: string) {
  return safe("review submitted", async () => {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        rating: true,
        teacherId: true,
        parent: { select: { firstName: true, lastName: true, visibleName: true } },
        course: { select: { courseTitle: true } },
      },
    });
    if (!review) return;

    const parentName = displayName(review.parent);
    const courseTitle = review.course.courseTitle || "your course";

    await createNotification({
      recipientId: review.teacherId,
      recipientRole: R.TEACHER,
      type: T.REVIEW_SUBMITTED,
      title: "New review",
      message: `${parentName} left a ${review.rating}-star review for ${courseTitle}.`,
      link: "/teacher/course-management",
    });
  });
}
