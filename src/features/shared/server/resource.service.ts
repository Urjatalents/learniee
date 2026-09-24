import "server-only";

import { prisma } from "@/lib/prisma";
import { EnrollmentStatus, ResourceType } from "@prisma/client";

import { notifyResourceShared } from "@/features/shared/server/notificationTriggers.service";
import { logActivity } from "@/features/shared/server/activityLog.service";

/**
 * Resource Library (Sep 24, 2026). A Teacher shares a file or a
 * link onto one Enrollment; it shows up for the Parent from then on
 * — on the Enrollment's "My Classes" page (alongside Homework/
 * Chat/Classes) and on a standalone /parent/resources list — and
 * stays there permanently (no expiry, no un-sharing once created;
 * a Teacher can still delete their own mistaken upload as a
 * correction). Admin can see every resource, with who shared it to
 * whom.
 *
 * Deliberately not gated on ACTIVE_ENROLLMENT_STATUSES the way
 * Homework is for *viewing* — a Parent must go on seeing a resource
 * after the Enrollment lapses/completes, per direct instruction
 * ("permanent for the student"). Only *creating* a new resource
 * requires the Enrollment to be a real, ongoing (or ended)
 * teacher-student relationship, not one still pending approval or
 * rejected/cancelled outright.
 */

export class ResourceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Statuses a Teacher may add a resource under — any enrollment that actually happened, at any point. */
const SHAREABLE_ENROLLMENT_STATUSES = new Set<EnrollmentStatus>([
  EnrollmentStatus.ACTIVE,
  EnrollmentStatus.LAPSED,
  EnrollmentStatus.COMPLETED,
]);

const resourceInclude = {
  enrollment: {
    select: {
      course: { select: { courseTitle: true, subject: true } },
    },
  },
} as const;

async function requireTeacherEnrollment(enrollmentId: string, teacherId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, teacherId: true, parentId: true, studentId: true, status: true },
  });

  if (!enrollment) {
    throw new ResourceError("Enrollment not found.", 404);
  }

  if (enrollment.teacherId !== teacherId) {
    throw new ResourceError("This enrollment doesn't belong to your account.", 403);
  }

  if (!SHAREABLE_ENROLLMENT_STATUSES.has(enrollment.status)) {
    throw new ResourceError(
      "Resources can be shared once this enrollment is active — it isn't yet.",
      409,
    );
  }

  return enrollment;
}

async function requireParentEnrollment(enrollmentId: string, parentId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, parentId: true },
  });

  if (!enrollment || enrollment.parentId !== parentId) {
    throw new ResourceError("Enrollment not found, or doesn't belong to your account.", 404);
  }

  return enrollment;
}

/** Every resource shared on one enrollment, newest first. Ownership already checked by the caller. */
function listResourcesForEnrollment(enrollmentId: string) {
  return prisma.resource.findMany({
    where: { enrollmentId },
    orderBy: { createdAt: "desc" },
  });
}

export async function listResourcesForTeacherEnrollment(enrollmentId: string, teacherId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, teacherId: true },
  });

  if (!enrollment || enrollment.teacherId !== teacherId) {
    throw new ResourceError("Enrollment not found, or doesn't belong to your account.", 404);
  }

  return listResourcesForEnrollment(enrollmentId);
}

export async function listResourcesForParentEnrollment(enrollmentId: string, parentId: string) {
  await requireParentEnrollment(enrollmentId, parentId);
  return listResourcesForEnrollment(enrollmentId);
}

/** Every resource ever shared with this Parent, across every enrollment — the flat /parent/resources view. */
export function listResourcesForParent(parentId: string) {
  return prisma.resource.findMany({
    where: { parentId },
    orderBy: { createdAt: "desc" },
    include: resourceInclude,
  });
}

export interface CreateResourceInput {
  enrollmentId: string;
  title: string;
  description?: string;
  type: "FILE" | "LINK";
  fileKey?: string;
  fileName?: string;
  externalUrl?: string;
}

/** Teacher shares a new resource (file or link) onto one of their enrollments. */
export async function createResource(teacherId: string, input: CreateResourceInput) {
  const title = input.title?.trim();

  if (!title) {
    throw new ResourceError("Title is required.");
  }

  if (!input.enrollmentId) {
    throw new ResourceError("enrollmentId is required.");
  }

  const type = input.type === "LINK" ? ResourceType.LINK : ResourceType.FILE;

  if (type === ResourceType.FILE && !input.fileKey) {
    throw new ResourceError("A file is required for a file resource.");
  }

  if (type === ResourceType.LINK) {
    const url = input.externalUrl?.trim();
    if (!url) {
      throw new ResourceError("A link is required for a link resource.");
    }
    try {
      // eslint-disable-next-line no-new
      new URL(url);
    } catch {
      throw new ResourceError("That doesn't look like a valid link.");
    }
  }

  const enrollment = await requireTeacherEnrollment(input.enrollmentId, teacherId);

  const created = await prisma.resource.create({
    data: {
      enrollmentId: enrollment.id,
      teacherId: enrollment.teacherId,
      parentId: enrollment.parentId,
      studentId: enrollment.studentId,
      title,
      description: input.description?.trim() || null,
      type,
      fileKey: type === ResourceType.FILE ? input.fileKey || null : null,
      fileName: type === ResourceType.FILE ? input.fileName?.trim() || null : null,
      externalUrl: type === ResourceType.LINK ? input.externalUrl!.trim() : null,
    },
  });

  await notifyResourceShared(created.id);

  await logActivity({
    action: "RESOURCE_SHARED",
    actorRole: "TEACHER",
    actorId: teacherId,
    description: `Resource "${title}" shared on enrollment ${enrollment.id}.`,
    metadata: { enrollmentId: enrollment.id, resourceId: created.id, type },
  });

  return created;
}

/** Teacher deletes their own resource — a correction (wrong file, typo), not an "un-share" workflow. */
export async function deleteResource(teacherId: string, resourceId: string) {
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, teacherId },
  });

  if (!resource) {
    throw new ResourceError("Resource not found, or doesn't belong to you.", 404);
  }

  await prisma.resource.delete({ where: { id: resource.id } });
}

export interface AdminResourceFilters {
  teacherId?: string;
  parentId?: string;
  studentId?: string;
}

/** Every resource on the platform, newest first — Admin's "who shared what to whom" view. */
export function listResourcesForAdmin(filters: AdminResourceFilters = {}) {
  return prisma.resource.findMany({
    where: {
      teacherId: filters.teacherId || undefined,
      parentId: filters.parentId || undefined,
      studentId: filters.studentId || undefined,
    },
    orderBy: { createdAt: "desc" },
    include: {
      teacher: { select: { firstName: true, lastName: true, visibleName: true } },
      parent: { select: { firstName: true, lastName: true, visibleName: true } },
      student: { select: { firstName: true, lastName: true, visibleName: true } },
      enrollment: {
        select: { course: { select: { courseTitle: true, subject: true } } },
      },
    },
  });
}
