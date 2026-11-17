import {
  parseGradeNumber,
  parseGradeRange,
} from "@/features/courses/utils/coursePricing";
import { getDemoCouponBalance } from "@/features/parent/server/demoCoupon/shared";
import {
  buildEnrollHref,
  listPendingDemoSurveys,
} from "@/features/parent/server/demoFeedback.service";
import { isRenewalWindowOpen } from "@/features/parent/server/renewal/plan";
import { getTeacherRatingsByIds } from "@/features/shared/server/review.service";
import { getDemoJoinWindow } from "@/features/shared/utils/demoWindow";
import { COUNTED_SESSION_STATUSES } from "@/features/shared/utils/sessionOutcome";
import { sessionLengthForCourse } from "@/features/shared/utils/sessionLength";
import { isGoogleMeetEnabled } from "@/lib/googleMeet";
import { daysBetween, dateToCalendarDate, todayInPlatformTz } from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import type {
  DashboardAttention,
  DashboardChat,
  DashboardClass,
  DashboardClassStatus,
  DashboardCourseRec,
  DashboardDemo,
  DashboardHomework,
  DashboardKid,
  DashboardSession,
  DashboardSetup,
  ParentDashboardData,
} from "@/features/parent/types/dashboard";
import {
  ClassSessionStatus,
  CourseStatus,
  DemoBookingStatus,
  EnrollmentStatus,
  RescheduleRequestStatus,
} from "@prisma/client";
import "server-only";

/**
 * Everything the Parent home screen needs, in one round trip
 * (`GET /api/parent/dashboard`).
 *
 * Read-only: it composes data other services already own (cycles, sessions,
 * demos, homework, chat, wallet) and writes nothing. Every query is scoped by
 * `parentId` — that `where` is the access rule. Cycle-model sessions only
 * (they are the ones with real `startsAt` / `endsAt` instants).
 */

const RUNNING: EnrollmentStatus[] = [EnrollmentStatus.ACTIVE, EnrollmentStatus.APPROVED];
const PENDING: EnrollmentStatus[] = [
  EnrollmentStatus.PENDING_TEACHER_APPROVAL,
  EnrollmentStatus.PENDING_PARENT_RECONFIRMATION,
  EnrollmentStatus.PENDING_ADMIN_APPROVAL,
  EnrollmentStatus.PENDING_APPROVAL,
];
const SHOWN: EnrollmentStatus[] = [...RUNNING, ...PENDING, EnrollmentStatus.COMPLETED];

/** Recommended courses kept per child (the screen shows three in total). */
const RECOMMENDATION_COUNT = 3;
/** The sessions list needs a week of agenda plus a few "coming up" rows. */
const SESSION_LIMIT = 80;

type NameParts = { firstName: string; lastName: string; visibleName: string | null };

function teacherName(t: NameParts) {
  return t.visibleName || `${t.firstName} ${t.lastName}`.trim();
}

function kidName(s: { firstName: string; visibleName: string | null }) {
  return s.visibleName || s.firstName;
}

function classStatus(status: EnrollmentStatus): DashboardClassStatus | null {
  if (RUNNING.includes(status)) return "enrolled";
  if (PENDING.includes(status)) return "pending";
  if (status === EnrollmentStatus.COMPLETED) return "completed";
  return null;
}

export async function getParentDashboard(
  parentId: string,
  now: Date = new Date(),
): Promise<ParentDashboardData> {
  const today = todayInPlatformTz(now);

  const [
    profile,
    students,
    enrollments,
    sessionRows,
    demoRows,
    homeworkRows,
    chatRows,
    rescheduleRows,
    wallet,
    coupon,
    surveys,
    courseRows,
    demoCount,
  ] = await Promise.all([
    prisma.parentProfile.findUnique({
      where: { id: parentId },
      select: {
        firstName: true,
        visibleName: true,
        country: true,
        preferredLanguage: true,
        modeOfCommunication: true,
      },
    }),
    prisma.student.findMany({
      where: { parentId },
      orderBy: { createdAt: "asc" },
      select: { id: true, firstName: true, visibleName: true, standard: true },
    }),
    prisma.enrollment.findMany({
      where: { parentId, status: { in: SHOWN } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        studentId: true,
        courseId: true,
        status: true,
        isLegacy: true,
        subject: true,
        sessionsPerMonth: true,
        sessionsCompletedInCycle: true,
        monthlyRate: true,
        course: { select: { courseTitle: true, subject: true } },
        teacher: { select: { firstName: true, lastName: true, visibleName: true } },
        cycles: {
          orderBy: { cycleNumber: "desc" },
          take: 1,
          select: { id: true, endDate: true, sessionCount: true, price: true, status: true },
        },
      },
    }),
    prisma.classSession.findMany({
      where: {
        parentId,
        status: ClassSessionStatus.SCHEDULED,
        startsAt: { not: null },
        endsAt: { gte: now },
      },
      orderBy: { startsAt: "asc" },
      take: SESSION_LIMIT,
      select: {
        id: true,
        enrollmentId: true,
        studentId: true,
        startsAt: true,
        endsAt: true,
        enrollment: { select: { subject: true, course: { select: { courseTitle: true, subject: true } } } },
        teacher: { select: { firstName: true, lastName: true, visibleName: true } },
      },
    }),
    prisma.demoBooking.findMany({
      where: {
        parentId,
        status: DemoBookingStatus.CONFIRMED,
        scheduledAt: { gte: new Date(now.getTime() - 3 * 60 * 60 * 1000) },
      },
      orderBy: { scheduledAt: "asc" },
      take: 20,
      select: {
        id: true,
        studentId: true,
        subject: true,
        scheduledAt: true,
        course: { select: { courseTitle: true, subject: true, duration: true } },
        teacher: { select: { firstName: true, lastName: true, visibleName: true } },
      },
    }),
    prisma.homework.findMany({
      where: {
        parentId,
        submission: { is: null },
        enrollment: { status: { in: RUNNING } },
      },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      take: 60,
      select: {
        id: true,
        enrollmentId: true,
        studentId: true,
        title: true,
        dueDate: true,
        enrollment: { select: { subject: true, course: { select: { subject: true } } } },
      },
    }),
    prisma.chatRoom.findMany({
      where: { parentId, enrollment: { status: { in: RUNNING } } },
      orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
      take: 6,
      select: {
        id: true,
        enrollmentId: true,
        studentId: true,
        lastMessageAt: true,
        teacher: { select: { firstName: true, lastName: true, visibleName: true } },
        course: { select: { subject: true } },
      },
    }),
    prisma.rescheduleRequest.findMany({
      where: { parentId, status: RescheduleRequestStatus.PENDING_PARENT_APPROVAL },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        enrollment: { select: { studentId: true, subject: true, course: { select: { subject: true } } } },
        teacher: { select: { firstName: true, lastName: true, visibleName: true } },
      },
    }),
    prisma.wallet.findUnique({ where: { parentId }, select: { balance: true } }),
    getDemoCouponBalance(parentId),
    listPendingDemoSurveys(parentId, now),
    prisma.course.findMany({
      where: { status: CourseStatus.APPROVED },
      orderBy: { createdAt: "desc" },
      take: 150,
      select: {
        id: true,
        courseTitle: true,
        subject: true,
        grade: true,
        price: true,
        teacherId: true,
        teacher: { select: { firstName: true, lastName: true, visibleName: true } },
      },
    }),
    prisma.demoBooking.count({ where: { parentId } }),
  ]);

  // ---- Learners --------------------------------------------------------
  const kids: DashboardKid[] = students.map((s) => ({
    id: s.id,
    name: kidName(s),
    grade: parseGradeNumber(s.standard),
  }));

  // ---- Classes (one per enrollment) -------------------------------------
  const latestCycleIds = enrollments
    .filter((e) => !e.isLegacy && e.cycles[0])
    .map((e) => e.cycles[0].id);

  const countedByCycle = new Map<string, number>();

  if (latestCycleIds.length > 0) {
    const grouped = await prisma.classSession.groupBy({
      by: ["cycleId"],
      where: {
        cycleId: { in: latestCycleIds },
        status: { in: [...COUNTED_SESSION_STATUSES] as ClassSessionStatus[] },
      },
      _count: { _all: true },
    });

    for (const g of grouped) {
      if (g.cycleId) countedByCycle.set(g.cycleId, g._count._all);
    }
  }

  const classes: DashboardClass[] = [];

  for (const e of enrollments) {
    const status = classStatus(e.status);

    if (!status) continue;

    const cycle = !e.isLegacy ? e.cycles[0] : undefined;
    const title = e.course.courseTitle ?? e.subject ?? "Course";
    const subject = e.course.subject ?? e.subject ?? "";
    const end = cycle ? dateToCalendarDate(cycle.endDate) : null;
    const daysLeft =
      status === "enrolled" && cycle && cycle.status === "OPEN" && end
        ? daysBetween(today, end)
        : null;

    classes.push({
      id: e.id,
      studentId: e.studentId,
      title,
      subject,
      teacherName: teacherName(e.teacher),
      status,
      done: cycle ? (countedByCycle.get(cycle.id) ?? 0) : e.sessionsCompletedInCycle,
      total: cycle ? cycle.sessionCount : e.sessionsPerMonth,
      daysLeft,
      renewalAmount: cycle ? Number(cycle.price) : Number(e.monthlyRate),
      renewable:
        status === "enrolled" &&
        !!cycle &&
        cycle.status === "OPEN" &&
        isRenewalWindowOpen(cycle.endDate, today),
    });
  }

  // ---- Sessions / demos --------------------------------------------------
  const sessions: DashboardSession[] = sessionRows.flatMap((s) =>
    s.startsAt && s.endsAt
      ? [
          {
            id: s.id,
            enrollmentId: s.enrollmentId,
            studentId: s.studentId,
            title: s.enrollment.course.courseTitle ?? s.enrollment.subject ?? "Class",
            subject: s.enrollment.course.subject ?? s.enrollment.subject ?? "",
            teacherName: teacherName(s.teacher),
            startsAt: s.startsAt.toISOString(),
            endsAt: s.endsAt.toISOString(),
          },
        ]
      : [],
  );

  const demos: DashboardDemo[] = demoRows.flatMap((d) => {
    if (!d.scheduledAt) return [];

    const window = getDemoJoinWindow(d.scheduledAt, sessionLengthForCourse(d.course.duration), now);

    if (window.state === "CLOSED" || window.state === "NO_DEMO") return [];

    return [
      {
        id: d.id,
        studentId: d.studentId,
        title: d.course.courseTitle ?? (d.subject || "Demo class"),
        subject: d.course.subject ?? d.subject,
        teacherName: teacherName(d.teacher),
        startsAt: d.scheduledAt.toISOString(),
        joinWindow: {
          state: window.state,
          opensAt: window.opensAt?.toISOString() ?? null,
          closesAt: window.closesAt?.toISOString() ?? null,
        },
      },
    ];
  });

  // ---- Homework / chats --------------------------------------------------
  const homework: DashboardHomework[] = homeworkRows.map((h) => ({
    id: h.id,
    enrollmentId: h.enrollmentId,
    studentId: h.studentId,
    title: h.title,
    subject: h.enrollment.course.subject ?? h.enrollment.subject ?? "",
    dueDate: h.dueDate ? h.dueDate.toISOString() : null,
  }));

  const chats: DashboardChat[] = chatRows.map((c) => ({
    roomId: c.id,
    enrollmentId: c.enrollmentId,
    studentId: c.studentId,
    teacherName: teacherName(c.teacher),
    subject: c.course.subject ?? "",
    lastMessageAt: c.lastMessageAt ? c.lastMessageAt.toISOString() : null,
  }));

  // ---- "Needs your attention" ---------------------------------------------
  const attention: DashboardAttention[] = [];

  for (const r of rescheduleRows) {
    attention.push({
      key: `reschedule-${r.id}`,
      kind: "RESCHEDULE",
      studentId: r.enrollment.studentId,
      title: "Reschedule needs your response",
      subtitle: `${teacherName(r.teacher)} proposed a new time for ${
        r.enrollment.course.subject ?? r.enrollment.subject ?? "a class"
      }.`,
      ctaLabel: "Respond",
      href: "/parent/reschedule",
      priority: 1,
      daysLeft: null,
    });
  }

  for (const s of surveys.slice(0, 2)) {
    attention.push({
      key: `survey-${s.bookingId}`,
      kind: "SURVEY",
      studentId: s.studentId,
      title: "How was the demo?",
      subtitle: `Tell us how “${s.courseTitle ?? "the demo"}” with ${s.teacherName} went — 3 quick taps.`,
      ctaLabel: "Answer",
      href: `/parent/demo-feedback/${s.bookingId}`,
      priority: 1,
      daysLeft: null,
    });
  }

  for (const e of enrollments) {
    if (e.status !== EnrollmentStatus.PENDING_PARENT_RECONFIRMATION) continue;

    attention.push({
      key: `reconfirm-${e.id}`,
      kind: "RECONFIRM",
      studentId: e.studentId,
      title: "Please review the updated schedule",
      subtitle: `${teacherName(e.teacher)} suggested changes to ${e.course.courseTitle ?? "your class"}.`,
      ctaLabel: "Review",
      href: `/parent/my-classes/${e.id}`,
      priority: 1,
      daysLeft: null,
    });
  }

  const balance = wallet ? Number(wallet.balance) : 0;

  for (const c of classes) {
    if (!c.renewable || c.daysLeft === null) continue;

    const gap = c.renewalAmount - balance;
    const kid = kids.find((k) => k.id === c.studentId);
    const when = c.daysLeft <= 0 ? "ends today" : `ends in ${c.daysLeft} day${c.daysLeft === 1 ? "" : "s"}`;

    attention.push({
      key: `renew-${c.id}`,
      kind: "RENEW",
      studentId: c.studentId,
      title: `Renew ${kid?.name ?? "your child"}’s ${c.subject || "class"} class`,
      subtitle:
        gap > 0
          ? `Cycle ${when}. Your wallet is ₹${Math.ceil(gap).toLocaleString("en-IN")} short.`
          : `Cycle ${when} — renew to keep the same weekly slots.`,
      ctaLabel: "Renew",
      href: `/parent/my-classes/${c.id}`,
      priority: 2,
      daysLeft: c.daysLeft,
    });
  }

  attention.sort((a, b) => a.priority - b.priority || (a.daysLeft ?? 99) - (b.daysLeft ?? 99));

  // ---- Recommended courses ------------------------------------------------
  const recommendations = await buildRecommendations(kids, students, enrollments, courseRows);

  // ---- Setup checklist ----------------------------------------------------
  const steps = [
    { label: "Add your child", done: students.length > 0, href: "/parent/students/new" },
    { label: "Book a free demo", done: demoCount > 0 || enrollments.length > 0, href: "/parent/courses" },
    {
      label: "Set your preferences",
      done: Boolean(
        profile?.country?.trim() &&
          profile?.preferredLanguage?.trim() &&
          profile?.modeOfCommunication?.trim(),
      ),
      href: "/parent/profile",
    },
  ];
  const nextStep = steps.find((s) => !s.done);
  const setup: DashboardSetup | null = nextStep
    ? {
        done: steps.filter((s) => s.done).length,
        total: steps.length,
        nextLabel: nextStep.label,
        href: nextStep.href,
      }
    : null;

  return {
    serverNow: now.toISOString(),
    parentFirstName: profile ? profile.visibleName || profile.firstName : "",
    meetEnabled: isGoogleMeetEnabled(),
    balance,
    freeDemosLeft: coupon.remainingFree,
    kids,
    classes,
    sessions,
    demos,
    homework,
    chats,
    attention,
    recommendations,
    setup,
    autoOpenSurveyId: surveys.find((s) => s.neverOpened)?.bookingId ?? null,
  };
}

/**
 * Up to three approved courses per child: right grade, well rated, a teacher
 * the family already knows, or a new subject score higher. Courses a child
 * already has (running, pending or finished) are left out.
 */
async function buildRecommendations(
  kids: DashboardKid[],
  students: { id: string; firstName: string; visibleName: string | null }[],
  enrollments: { studentId: string; courseId: string; status: EnrollmentStatus }[],
  courses: {
    id: string;
    courseTitle: string | null;
    subject: string | null;
    grade: string | null;
    price: unknown;
    teacherId: string;
    teacher: NameParts;
  }[],
): Promise<DashboardCourseRec[]> {
  if (kids.length === 0 || courses.length === 0) return [];

  const ratings = await getTeacherRatingsByIds([...new Set(courses.map((c) => c.teacherId))]);

  const perKid = kids.map((kid) => {
    const mine = enrollments.filter((e) => e.studentId === kid.id);
    const haveCourse = new Set(mine.map((e) => e.courseId));
    const haveSubjects = new Set(
      courses
        .filter((c) => mine.some((e) => e.courseId === c.id) && c.subject)
        .map((c) => c.subject as string),
    );
    const knownTeachers = new Set(
      courses.filter((c) => haveCourse.has(c.id)).map((c) => c.teacherId),
    );
    const student = students.find((s) => s.id === kid.id);

    return courses
      .filter((c) => {
        if (haveCourse.has(c.id) || !c.courseTitle) return false;
        if (kid.grade === null) return true;

        const range = parseGradeRange(c.grade);

        // A course with no readable grade range is not filtered out.
        return !range || (kid.grade >= range.from && kid.grade <= range.to);
      })
      .map((c) => {
        const rating = ratings.get(c.teacherId)?.averageRating ?? null;
        const reasons: string[] = [];
        let score = 20;

        if (kid.grade !== null && parseGradeRange(c.grade)) reasons.push(`Fits Grade ${kid.grade}`);

        if (rating !== null) {
          score += rating * 6;
          if (rating >= 4.8) reasons.push("Top rated");
        } else {
          score += 18;
        }

        if (knownTeachers.has(c.teacherId)) {
          score += 12;
          reasons.push("Same teacher as a current class");
        }

        if (c.subject && !haveSubjects.has(c.subject)) {
          score += 10;
          reasons.push("New subject");
        } else if (c.subject) {
          score += 4;
          reasons.push(`Builds on ${c.subject}`);
        }

        const rec: DashboardCourseRec & { score: number } = {
          courseId: c.id,
          title: c.courseTitle as string,
          subject: c.subject ?? "",
          teacherName: teacherName(c.teacher),
          rating: rating === null ? null : Math.round(rating * 10) / 10,
          price: Number(c.price ?? 0),
          studentId: kid.id,
          studentName: student ? kidName(student) : kid.name,
          grade: kid.grade,
          reasons: reasons.slice(0, 3),
          href: buildEnrollHref(c.id, kid.id),
          score,
        };

        return rec;
      })
      .sort((a, b) => b.score - a.score);
  });

  // Up to RECOMMENDATION_COUNT per child; the screen mixes them for "All".
  const out: DashboardCourseRec[] = [];

  for (const list of perKid) {
    for (const pick of list.slice(0, RECOMMENDATION_COUNT)) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { score, ...rec } = pick as DashboardCourseRec & { score: number };
      out.push(rec);
    }
  }

  return out;
}
