import type { ParentDashboardData } from "@/features/parent/types/dashboard";

import type { HomeData, HomeSession } from "./homeTypes";

const DEMO_FALLBACK_MINUTES = 45;

function firstWord(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function shortDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** Maps the API response (`/api/parent/dashboard`) to what the Home screen renders. */
export function toHomeData(d: ParentDashboardData): HomeData {
  const sessions: HomeSession[] = [
    ...d.sessions.map(
      (s): HomeSession => ({
        id: s.id,
        kind: "class",
        title: s.title,
        subject: s.subject,
        teacherName: s.teacherName,
        kidId: s.studentId,
        start: new Date(s.startsAt),
        end: new Date(s.endsAt),
        hasLink: d.meetEnabled,
        href: `/parent/my-classes/${s.enrollmentId}`,
      }),
    ),
    ...d.demos.map((demo): HomeSession => {
      const start = new Date(demo.startsAt);
      return {
        id: demo.id,
        kind: "demo",
        title: demo.title,
        subject: demo.subject,
        teacherName: demo.teacherName,
        kidId: demo.studentId,
        start,
        end: demo.joinWindow.closesAt
          ? new Date(demo.joinWindow.closesAt)
          : new Date(start.getTime() + DEMO_FALLBACK_MINUTES * 6e4),
        hasLink: d.meetEnabled,
        href: "/parent/my-classes?tab=demos",
      };
    }),
  ];

  return {
    firstName: d.parentFirstName,
    kids: d.kids.map((k) => ({
      id: k.id,
      name: k.name,
      first: firstWord(k.name),
      grade: k.grade,
    })),
    classes: d.classes.map((c) => ({
      id: c.id,
      title: c.title,
      subject: c.subject,
      teacherName: c.teacherName,
      kidId: c.studentId,
      status: c.status,
      done: c.done,
      total: c.total,
      left: c.daysLeft,
      renewalAmount: c.renewalAmount,
    })),
    sessions,
    homework: d.homework.map((h) => ({
      id: h.id,
      kidId: h.studentId,
      classId: h.enrollmentId,
      title: h.title,
      subject: h.subject,
      due: h.dueDate ? new Date(h.dueDate) : null,
    })),
    chats: d.chats.map((c) => ({
      id: c.roomId,
      classId: c.enrollmentId,
      teacherName: c.teacherName,
      subject: c.subject,
      kidId: c.studentId,
      last: shortDate(c.lastMessageAt),
    })),
    attention: d.attention.map((a) => ({
      key: a.key,
      kidId: a.studentId,
      priority: a.priority,
      days: a.daysLeft,
      title: a.title,
      sub: a.subtitle,
      button: a.ctaLabel,
      href: a.href,
    })),
    recommendations: d.recommendations.map((r) => ({
      courseId: r.courseId,
      title: r.title,
      subject: r.subject,
      teacherName: r.teacherName,
      rating: r.rating,
      price: r.price,
      kidId: r.studentId,
      href: r.href,
    })),
    setup: d.setup,
    walletBalance: d.balance,
    freeDemos: d.freeDemosLeft,
  };
}
