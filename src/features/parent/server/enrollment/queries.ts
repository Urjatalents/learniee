import { prisma } from "@/lib/prisma";

/**
 * Lists every enrollment a parent has made, most recent first — for
 * a future "My enrollments"/Payments view. Also the shape Accounts'
 * Tuition Ledger will eventually read from (joined with
 * ParentProfile/Student/Teacher for the name fields, per
 * 03-DATA-MODEL.md's note that names aren't duplicated here).
 */
export async function getEnrollmentsForParent(parentId: string) {
  return prisma.enrollment.findMany({
    where: { parentId },
    orderBy: { createdAt: "desc" },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          visibleName: true,
        },
      },
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          visibleName: true,
        },
      },
      course: {
        select: { id: true, courseTitle: true },
      },
      chatRoom: {
        select: { id: true },
      },
    },
  });
}
