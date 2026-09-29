"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, GraduationCap, Loader2, MapPin, Star, Video } from "lucide-react";

import ChildAvatar from "@/features/parent/components/ChildAvatar";
import CourseCard from "@/features/parent/components/CourseCard";

import { useTeacherPublicProfile } from "../hooks/useTeacherPublicProfile";

/**
 * Teacher profile inside the Parent / Teacher dashboard: who they are, intro
 * video, and their listed (approved) courses. `courseBasePath` makes course
 * cards clickable (Parents → /parent/courses/[id]); omit it where the viewer
 * can't open course pages (Teachers), and the cards are shown read-only.
 */
export default function TeacherProfilePage({
  teacherId,
  courseBasePath,
}: {
  teacherId: string;
  courseBasePath?: string;
}) {
  const router = useRouter();
  const { data, loading, error } = useTeacherPublicProfile(teacherId);

  const back = (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
    >
      <ArrowLeft size={14} /> Back
    </button>
  );

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="size-6 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 sm:p-8 max-w-3xl mx-auto">
        {back}
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          {error || "Teacher not found."}
        </div>
      </div>
    );
  }

  const { teacher, courses } = data;
  const name = teacher.visibleName?.trim() || `${teacher.firstName} ${teacher.lastName}`.trim() || "Teacher";
  const location = [teacher.city, teacher.country].filter(Boolean).join(", ");

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      {back}

      {/* Hero */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-light to-brand-dark p-6 sm:p-10 text-white">
        <span aria-hidden="true" className="absolute -right-10 -top-10 size-44 rounded-full bg-white/10" />
        <span aria-hidden="true" className="absolute right-24 bottom-[-2.5rem] size-24 rounded-full bg-brand-yellow/80" />
        <div className="relative flex flex-wrap items-center gap-5">
          <ChildAvatar src={teacher.photoUrl} name={name} size="lg" />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-yellow">Teacher at Learniee</p>
            <h1 className="font-heading text-2xl sm:text-4xl font-bold mt-1 break-words">{name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/90">
              {location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} /> {location}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Star size={14} className="fill-brand-yellow text-brand-yellow" />
                {teacher.averageRating != null
                  ? `${teacher.averageRating.toFixed(1)} (${teacher.reviewCount} ${teacher.reviewCount === 1 ? "review" : "reviews"})`
                  : "New teacher"}
              </span>
              <span className="inline-flex items-center gap-1">
                <GraduationCap size={14} /> {courses.length} {courses.length === 1 ? "course" : "courses"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* About + intro video */}
      {(teacher.aboutMe || teacher.introVideoUrl) && (
        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          {teacher.aboutMe && (
            <div className="rounded-3xl border border-violet-100 bg-white p-5 sm:p-6 shadow-sm">
              <h2 className="font-heading text-base font-bold text-gray-800 mb-2">About {name}</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{teacher.aboutMe}</p>
            </div>
          )}
          {teacher.introVideoUrl ? (
            <div className="rounded-3xl border border-violet-100 bg-white p-5 sm:p-6 shadow-sm">
              <h2 className="font-heading text-base font-bold text-gray-800 mb-3 inline-flex items-center gap-2">
                <Video size={16} className="text-brand" /> Introduction
              </h2>
              <div className="relative h-56 w-full overflow-hidden rounded-2xl bg-black">
                <video
                  src={teacher.introVideoUrl}
                  controls
                  playsInline
                  className="absolute inset-0 h-full w-full object-contain"
                />
              </div>
            </div>
          ) : null}
        </section>
      )}

      {/* Courses */}
      <section className="mt-8" aria-label="Courses">
        <h2 className="font-heading text-xl font-bold text-gray-800 mb-4">Courses by {name}</h2>

        {courses.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-violet-200 bg-white p-10 text-center">
            <p className="font-heading text-lg font-bold text-gray-800">No courses listed yet</p>
            <p className="mt-1 text-sm text-gray-500">This teacher hasn&apos;t published a course yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {courses.map((course) =>
              courseBasePath ? (
                <Link key={course.id} href={`${courseBasePath}/${course.id}`}>
                  <CourseCard course={course} />
                </Link>
              ) : (
                <div key={course.id}>
                  <CourseCard course={course} />
                </div>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}
