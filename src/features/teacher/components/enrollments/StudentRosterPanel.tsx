"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Search, BookOpen, Users } from "lucide-react";

import type { TeacherEnrollment } from "@/features/teacher/hooks/useEnrollments";
import { getEnrollmentStatusLabel, getEnrollmentStatusStyle } from "@/features/shared/utils/enrollmentStatus";

interface Props {
  enrollments: TeacherEnrollment[];
}

interface StudentRow {
  studentId: string;
  studentName: string;
  parentName: string;
  courses: { enrollmentId: string; title: string; status: string }[];
  /** Most relevant enrollment for this student — ACTIVE/LAPSED first,
   *  then anything still pending, then COMPLETED — used for the
   *  status chip and as the jump-to target. */
  primary: TeacherEnrollment;
  chatRoomId: string | null;
  /** First ACTIVE/LAPSED enrollment with this student, for the Homework shortcut. */
  activeEnrollmentId: string | null;
}

const STATUS_RANK: Record<string, number> = {
  ACTIVE: 0,
  LAPSED: 0,
  PENDING_TEACHER_APPROVAL: 1,
  PENDING_PARENT_RECONFIRMATION: 1,
  PENDING_ADMIN_APPROVAL: 1,
  COMPLETED: 2,
};

function displayName(p: { firstName: string; lastName: string; visibleName?: string | null }) {
  return p.visibleName?.trim() || `${p.firstName} ${p.lastName}`.trim();
}

function buildRoster(enrollments: TeacherEnrollment[]): StudentRow[] {
  const byStudent = new Map<string, TeacherEnrollment[]>();

  for (const e of enrollments) {
    const list = byStudent.get(e.student.id) ?? [];
    list.push(e);
    byStudent.set(e.student.id, list);
  }

  const rows: StudentRow[] = [];

  for (const [studentId, list] of byStudent) {
    const sorted = [...list].sort(
      (a, b) => (STATUS_RANK[a.status] ?? 1) - (STATUS_RANK[b.status] ?? 1),
    );
    const primary = sorted[0];
    const withChat = list.find((e) => e.chatRoom);
    const active = list.find((e) => e.status === "ACTIVE" || e.status === "LAPSED");

    rows.push({
      studentId,
      studentName: primary.student.visibleName?.trim() || primary.student.firstName,
      parentName: displayName(primary.parent),
      courses: list.map((e) => ({
        enrollmentId: e.id,
        title: e.course.courseTitle ?? "Untitled course",
        status: e.status,
      })),
      primary,
      chatRoomId: withChat?.chatRoom?.id ?? null,
      activeEnrollmentId: active?.id ?? null,
    });
  }

  return rows.sort((a, b) => a.studentName.localeCompare(b.studentName));
}

/**
 * A single, searchable directory of every student across this
 * Teacher's enrollments — one row per student rather than per
 * enrollment — with one-tap shortcuts (chat, homework, jump to the
 * class card below) so a Teacher with many students doesn't have to
 * scan the whole class list to find one. Parent call/email are
 * intentionally not shown — Chat is the only contact channel exposed
 * to Teachers here.
 */
export default function StudentRosterPanel({ enrollments }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const roster = useMemo(() => buildRoster(enrollments), [enrollments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roster;

    return roster.filter((row) =>
      [row.studentName, row.parentName, ...row.courses.map((c) => c.title)]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [roster, query]);

  if (enrollments.length === 0) return null;

  return (
    <div className="bg-white border rounded-xl p-5 mb-8">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
            <Users size={16} />
          </span>
          <div>
            <h2 className="font-semibold text-gray-800">Manage students</h2>
            <p className="text-xs text-gray-500">
              {roster.length} student{roster.length === 1 ? "" : "s"} across your enrollments
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search student, parent, or course…"
            className="w-full text-sm border border-gray-200 rounded-full pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No students match “{query}”.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => {
            const style = getEnrollmentStatusStyle(row.primary.status);
            const label = getEnrollmentStatusLabel(row.primary.status, "teacher");

            return (
              <div
                key={row.studentId}
                className="flex flex-wrap items-center justify-between gap-3 border border-gray-100 rounded-xl px-4 py-3 hover:bg-purple-50/40 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800 truncate">{row.studentName}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style}`}>
                      {label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">Parent: {row.parentName}</p>
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">
                    {row.courses.map((c) => c.title).join(" · ")}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {row.chatRoomId && (
                    <button
                      type="button"
                      onClick={() => router.push(`/teacher/chat/${row.chatRoomId}`)}
                      title="Open chat"
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700"
                    >
                      <MessageCircle size={13} />
                    </button>
                  )}
                  {row.activeEnrollmentId && (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/teacher/enrollments/${row.activeEnrollmentId}/homework`)
                      }
                      title="Homework"
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700"
                    >
                      <BookOpen size={13} />
                    </button>
                  )}
                  <a
                    href={`#enrollment-${row.primary.id}`}
                    className="text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
                  >
                    View class
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
